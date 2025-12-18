import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import routes, { initializeResourceServer } from './routes';
import authRouter from './auth';

// feePayer helper function (legacy - keeping for debugging)
import { ensureFacilitatorSupportLoaded } from './facilitatorSupport';


dotenv.config();

const {
  FRONTEND_ORIGIN,
  MARKETING_ORIGIN,
  INTERNAL_ORIGINS,
  TRUSTED_UPLOAD_ORIGINS,
  PUBLIC_API_HOST,
  ENABLE_HTTPS_REDIRECT,
  HSTS_MAX_AGE,
  JSON_BODY_LIMIT,
  FORM_BODY_LIMIT
} = process.env;

const parsedInternalOrigins = (INTERNAL_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const parsedUploadOrigins = (TRUSTED_UPLOAD_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(
    [
      FRONTEND_ORIGIN,
      MARKETING_ORIGIN,
      ...parsedInternalOrigins,
      ...parsedUploadOrigins,
    ].filter(Boolean)
  )
);

const app = express();
const PORT = process.env.PORT || 3001;
const jsonBodyLimit = JSON_BODY_LIMIT || '1mb';
const formBodyLimit = FORM_BODY_LIMIT || '1mb';
const enforceHttps = ENABLE_HTTPS_REDIRECT === 'true';
const hstsMaxAge = Number.parseInt(HSTS_MAX_AGE || '31536000', 10);

app.enable('trust proxy');

// CORS configuration - MUST come before helmet to handle OPTIONS preflight
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`🚫 Blocked CORS origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'PAYMENT-SIGNATURE'],  // v2: renamed from X-PAYMENT
  exposedHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE'],  // x402 v2 response headers
};

app.use(cors(corsOptions));

// Helmet security headers - comes AFTER CORS to allow preflight
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // TinyMCE needs eval
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Supabase Storage + data URLs
      connectSrc: [
        "'self'",
        "https://okftigzmxfkghibhlnjo.supabase.co", // Your Supabase
        "https://*.supabase.co", // Supabase services
        "https://facilitator.cdp.coinbase.com", // CDP facilitator
        "https://x402.org", // x402 facilitator
        "https://*.walletconnect.com", // WalletConnect
        "https://*.walletconnect.org",
        "wss://*.walletconnect.com", // WebSocket for wallets
        "wss://*.walletconnect.org"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https://verify.walletconnect.com"], // WalletConnect modals
    },
  },
  crossOriginResourcePolicy: false,
}));
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: formBodyLimit }));

if (enforceHttps) {
  app.use((req, res, next) => {
    if (!req.secure && req.get('host')) {
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains; preload`);
    return next();
  });
}

if (PUBLIC_API_HOST) {
  app.locals.publicApiHost = PUBLIC_API_HOST.trim();
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// x402 v2 Configuration
const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';
const hasCdpCredentials = !!(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET);

console.log(`🔗 x402 Facilitator: ${CDP_FACILITATOR_URL}`);
console.log(`🌐 Supported networks: eip155:8453, eip155:84532, solana:mainnet, solana:devnet`);
if (hasCdpCredentials) {
  console.log(`✅ CDP credentials configured`);
} else {
  console.log(`⚠️  CDP credentials missing - payments will fail`);
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    message: 'Readia.io backend is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    x402: {
      facilitator: CDP_FACILITATOR_URL,
      networks: ['eip155:8453', 'eip155:84532', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'],
      cdpConfigured: hasCdpCredentials
    }
  });
});

// Warming the fee payer into cache at boot time (legacy - keeping for debugging)
ensureFacilitatorSupportLoaded()
  .then(() => console.log('✅ Legacy facilitator fee payer cache warm'))
  .catch(error => {
    console.error('⚠️ Failed to warm legacy facilitator cache:', error);
  });

// Initialize x402 v2 Resource Server (fetches /supported and caches fee payers per network)
initializeResourceServer()
  .then(() => console.log('✅ x402 Resource Server initialized'))
  .catch(error => {
    console.error('❌ Failed to initialize x402 Resource Server:', error);
    process.exit(1);  // Critical - exit if we can't initialize payment processing
  });

// Authentication routes must load before protected API routes
app.use('/api/auth', authRouter);

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Readia.io backend server running on port ${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/api/health`);
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Run: lsof -i :${PORT}`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});
