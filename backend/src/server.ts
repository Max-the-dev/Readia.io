import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import authRouter from './auth';

// feePayer helper function
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
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-PAYMENT'],
};

app.use(cors(corsOptions));
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

// x402 Payment Middleware Configuration
const facilitatorUrl = process.env.CDP_API_KEY_ID
  ? `https://facilitator.cdp.coinbase.com` // CDP facilitator
  : process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator'; // Public fallback

const network = process.env.X402_NETWORK || 'base-sepolia';

console.log(`🔗 x402 Facilitator: ${facilitatorUrl}`);
console.log(`🌐 Network: ${network}`);
// Line 27
if (process.env.CDP_API_KEY_ID) {
  console.log(`✅ Using Coinbase CDP Facilitator`);
} else {
  console.log(`⚠️  Using public facilitator (testnet mode)`);
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    message: 'Penny.io backend is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    facilitator: facilitatorUrl,
    network: network,
    cdpEnabled: !!process.env.CDP_API_KEY_ID
  });
});

// Warming the fee payer into cache at boot time
ensureFacilitatorSupportLoaded()
  .then(() => console.log('✅ Facilitator fee payer cache warm'))
  .catch(error => {
    console.error('⚠️ Failed to warm facilitator cache:', error);
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
  console.log(`🚀 Penny.io backend server running on port ${PORT}`);
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
