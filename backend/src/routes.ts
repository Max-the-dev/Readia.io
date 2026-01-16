import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import rateLimit from 'express-rate-limit';
import Database from './database';
import { pgPool, supabase } from './supabaseClient';
import { Article, Author, Draft, CreateArticleRequest, CreateDraftRequest, ApiResponse, GetArticlesQuery } from './types';
import {
  validate,
  createArticleSchema,
  createAgentArticleSchema,
  updateArticleSchema,
  createDraftSchema,
  getArticlesQuerySchema,
  articleIdSchema,
  draftIdSchema,
  likeRequestSchema,
  deleteRequestSchema,
  historyRecordSchema,
  favoriteRequestSchema,
  historyQuerySchema
} from './validation';
import { checkForSpam, checkContentQuality } from './spamPrevention';
// x402 v2 imports
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import { PaymentPayload, PaymentRequirements } from '@x402/core/types';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import { getTokenPayerFromTransaction, decodeTransactionFromPayload } from '@x402/svm';
// @ts-ignore - CDP SDK has type issues in v0.x
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import {
  normalizeAddress,
  normalizeSolanaAddress,
  normalizeFlexibleAddress,
  tryNormalizeFlexibleAddress,
  tryNormalizeSolanaAddress,
  tryNormalizeAddress,
} from './utils/address';
import { requireAuth, requireOwnership, AuthenticatedRequest } from './auth';
import { ensureSolanaUsdcAta } from './ataService';

const router = express.Router();
const db = new Database();
const isProduction = process.env.NODE_ENV === 'production';
const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';

// x402 Facilitator URL (PayAI takes priority if set, falls back to CDP)
const FACILITATOR_URL = process.env.PAYAI_FACILITATOR_URL || process.env.CDP_FACILITATOR_URL;

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
  createAuthHeaders: async () => {
    const generateAuthForPath = async (path: string, method: 'GET' | 'POST' = 'POST') => {
      const token = await generateJwt({
        apiKeyId: process.env.CDP_API_KEY_ID!,
        apiKeySecret: process.env.CDP_API_KEY_SECRET!,
        requestMethod: method,
        requestHost: 'api.cdp.coinbase.com',
        requestPath: `/platform/v2/x402/${path}`,
        expiresIn: 120
      });
      return { 'Authorization': `Bearer ${token}` };
    };

    return {
      verify: await generateAuthForPath('verify', 'POST'),
      settle: await generateAuthForPath('settle', 'POST'),
      supported: await generateAuthForPath('supported', 'GET')  // /supported uses GET
    };
  }
});

// x402 v2 Resource Server with scheme registrations (for human/purchase endpoints - uses PayAI/CDP)
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register('eip155:8453', new ExactEvmScheme())
  .register('eip155:84532', new ExactEvmScheme())
  .register('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', new ExactSvmScheme())
  .register('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', new ExactSvmScheme());

// OpenFacilitator SDK for agent endpoints (x402Jobs compatible)
import {
  OpenFacilitator,
  PaymentRequirements as OFPaymentRequirements,
  PaymentPayload as OFPaymentPayload,
  SettlementError,
  VerificationError,
  FacilitatorError
} from '@openfacilitator/sdk';
const openFacilitator = new OpenFacilitator();

// USDC asset addresses per network
const USDC_ASSETS: Record<string, string> = {
  'eip155:8453': process.env.X402_MAINNET_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'eip155:84532': process.env.X402_TESTNET_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': process.env.X402_SOLANA_MAINNET_USDC_ADDRESS || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': process.env.X402_SOLANA_DEVNET_USDC_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

/**
 * Convert USD amount to USDC base units (6 decimals)
 */
function usdToUsdcBaseUnits(usdAmount: number): string {
  return Math.round(usdAmount * 1_000_000).toString();
}

/**
 * Extended payment requirements with both amount (x402 v2 client) and maxAmountRequired (OpenFacilitator)
 */
type AgentPaymentRequirements = OFPaymentRequirements & {
  amount: string;
};

async function buildAgentPaymentRequirements(
  network: string,
  priceUsd: number,
  payTo: string,
  resource?: string,
  description?: string
): Promise<AgentPaymentRequirements> {
  const asset = USDC_ASSETS[network];
  if (!asset) {
    throw new Error(`Unsupported network: ${network}`);
  }

  const amountInBaseUnits = usdToUsdcBaseUnits(priceUsd);

  const requirements: AgentPaymentRequirements = {
    scheme: 'exact',
    network,
    maxAmountRequired: amountInBaseUnits,  // OpenFacilitator SDK
    amount: amountInBaseUnits,              // @x402/core v2 client
    asset,
    payTo,
    resource,
    description,
    maxTimeoutSeconds: 900,
  };

  // For Solana networks, add fee payer from OpenFacilitator
  if (network.startsWith('solana:')) {
    const feePayer = await openFacilitator.getFeePayer(network);
    if (feePayer) {
      requirements.extra = { feePayer };
    }
  }

  // For EVM networks, add EIP-712 domain parameters required by @x402/evm
  // These must be in the 'extra' field per @x402/evm client implementation
  if (network.startsWith('eip155:')) {
    // USDC on Base uses these EIP-712 domain parameters
    requirements.extra = {
      ...requirements.extra,
      name: 'USD Coin',
      version: '2',
    };
  }

  return requirements;
}

/**
 * Parse payment header (supports both x402 v1 and v2)
 */
function parsePaymentHeader(header: string): OFPaymentPayload | null {
  try {
    // Try base64 decode first (standard x402)
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as OFPaymentPayload;
  } catch {
    try {
      // Try direct JSON (some clients send raw JSON)
      return JSON.parse(header) as OFPaymentPayload;
    } catch {
      return null;
    }
  }
}

/**
 * Payment requirement with x402 version for client compatibility
 */
type X402PaymentRequirement = OFPaymentRequirements & { x402Version: 2 };

/**
 * x402 v2 Payment Required response format
 * - x402Version at top level tells client which protocol version to use
 * - x402Version in each accepts item for per-network clarity
 */
interface X402PaymentRequiredResponse {
  x402Version: 2;
  accepts: X402PaymentRequirement[];
  error: string;
  resource: string;
  description: string;
  mimeType: string;
}

/**
 * Create 402 Payment Required response for agent endpoints
 * Adds x402Version: 2 at top level AND to each requirement for @x402/core client compatibility
 */
function createAgentPaymentRequiredResponse(
  accepts: OFPaymentRequirements[],
  resource: { url: string; description: string; mimeType: string },
  message: string
): X402PaymentRequiredResponse {
  return {
    x402Version: 2,
    accepts: accepts.map(req => ({ ...req, x402Version: 2 as const })),
    error: message,
    resource: resource.url,
    description: resource.description,
    mimeType: resource.mimeType
  };
}

/**
 * Initialize the x402 resource servers
 * Must be called on app startup before handling payment requests
 */
export async function initializeResourceServer(): Promise<void> {
  await resourceServer.initialize();
  console.log('[x402] ✅ Resource server initialized (PayAI/CDP for purchases)');

  // Verify OpenFacilitator is reachable and cache fee payers
  const supported = await openFacilitator.supported();
  console.log(`[x402] ✅ OpenFacilitator connected (${supported.kinds.length} networks)`);
}

// CAIP-2 network identifiers for x402 v2
type SupportedX402Network =
  | 'eip155:8453'      // Base mainnet
  | 'eip155:84532'     // Base Sepolia
  | 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'  // Solana mainnet
  | 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Solana devnet

const SUPPORTED_X402_NETWORKS: SupportedX402Network[] = [
  'eip155:8453',
  'eip155:84532',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
];

// Testnet networks - blocked in production
const TESTNET_X402_NETWORKS: SupportedX402Network[] = [
  'eip155:84532',                              // Base Sepolia
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',  // Solana Devnet
];

// Network type helpers (prefix-based for CAIP-2)
const isEvmNetwork = (n: string): boolean => n.startsWith('eip155:');
const isSolanaNetwork = (n: string): boolean => n.startsWith('solana:');
type NetworkGroup = 'evm' | 'solana';

const DEFAULT_X402_NETWORK: SupportedX402Network =
  SUPPORTED_X402_NETWORKS.includes((process.env.X402_NETWORK || '') as SupportedX402Network)
    ? (process.env.X402_NETWORK as SupportedX402Network)
    : 'eip155:84532'; // Base Sepolia

const DEFAULT_EVM_PAYOUT_NETWORK: SupportedX402Network =
  isEvmNetwork(DEFAULT_X402_NETWORK)
    ? DEFAULT_X402_NETWORK
    : 'eip155:8453'; // Base mainnet

const DEFAULT_SOLANA_PAYOUT_NETWORK: SupportedX402Network =
  DEFAULT_X402_NETWORK === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
    ? 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'  // Solana devnet
    : 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // Solana mainnet

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string): boolean => UUID_REGEX.test(value);

async function resolveCanonicalAuthorAddress(address: string): Promise<{
  canonicalAddress: string;
  author: Author | null;
}> {
  const normalized = normalizeFlexibleAddress(address);
  const author = await db.getAuthorByWallet(normalized);
  return {
    canonicalAddress: author?.address || normalized,
    author,
  };
}


function resolveNetworkPreference(req: Request): SupportedX402Network {
  const raw = req.query?.network;
  const candidate =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw) && typeof raw[0] === 'string'
        ? raw[0]
        : undefined;

  if (candidate && SUPPORTED_X402_NETWORKS.includes(candidate as SupportedX402Network)) {
    // Block testnets in production
    if (isProduction && TESTNET_X402_NETWORKS.includes(candidate as SupportedX402Network)) {
      throw new Error('TESTNET_NOT_ALLOWED');
    }
    return candidate as SupportedX402Network;
  }

  // Default to mainnet in production, otherwise use configured default
  return isProduction ? 'eip155:8453' : DEFAULT_X402_NETWORK;
}

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

/**
 * Rate Limiter: General Read Operations
 * For endpoints that fetch data (GET requests)
 * Higher limit since reading doesn't modify state
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 200 : 1000, // Relax limits in development
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  skip: () => !enableRateLimiting // Controlled by ENABLE_RATE_LIMITING env var
});

/**
 * Rate Limiter: Write Operations
 * For endpoints that create/update/delete data
 * Lower limit to prevent spam and abuse
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 200,
  message: {
    success: false,
    error: 'Too many write requests. Please slow down and try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !enableRateLimiting,
});

/**
 * Rate Limiter: Critical Operations
 * For payment endpoints and sensitive operations
 * Very strict limit to prevent abuse
 */
const criticalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 75 : 100,
  message: {
    success: false,
    error: 'Too many attempts. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !enableRateLimiting,
});

/**
 * Rate Limiter: File Uploads
 * For image upload endpoint
 * Moderate limit to prevent storage abuse
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 50 : 100,
  message: {
    success: false,
    error: 'Too many upload requests. Please wait before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !enableRateLimiting,
});

// Configure multer for file uploads (memory storage for Supabase)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const PLATFORM_EVM_ADDRESS = normalizeAddress(
  process.env.X402_PLATFORM_EVM_ADDRESS || '0x6945890B1c074414b813C7643aE10117dec1C8e7'
);

const PLATFORM_SOLANA_ADDRESS = process.env.X402_PLATFORM_SOL_ADDRESS
  ? normalizeSolanaAddress(process.env.X402_PLATFORM_SOL_ADDRESS)
  : null;

// Agent posting fee (USD) - paid to platform for programmatic article creation
const AGENT_POSTING_FEE = parseFloat(process.env.AGENT_POSTING_FEE || '0.25');
const AGENT_SECONDARY_WALLET_FEE = parseFloat(process.env.AGENT_SECONDARY_WALLET_FEE || '0.01');
const AGENT_GENERATE_ARTICLE_FEE = parseFloat(process.env.AGENT_GENERATE_ARTICLE_FEE || '0.02');
const UI_GENERATE_ARTICLE_FEE = parseFloat(process.env.UI_GENERATE_ARTICLE_FEE || '0.10');

// Claude API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const getNetworkGroup = (network?: SupportedX402Network | string | null): NetworkGroup =>
  network && isSolanaNetwork(network) ? 'solana' : 'evm';

// Select the correct payout address for the requested network, preferring the author’s
// primary method and falling back to the secondary slot when it matches.
interface PayoutProfile {
  primaryNetwork: SupportedX402Network;
  primaryAddress: string;
  secondaryNetwork?: SupportedX402Network | null;
  secondaryAddress?: string | null;
}

function buildPayoutProfile(article: Article, authorOverride?: Author | null): PayoutProfile {
  const primaryNetwork = (
    authorOverride?.primaryPayoutNetwork ||
    article.authorPrimaryNetwork ||
    'eip155:8453'  // Base mainnet (CAIP-2)
  ) as SupportedX402Network;

  return {
    primaryNetwork,
    primaryAddress: article.authorAddress,
    secondaryNetwork: (authorOverride?.secondaryPayoutNetwork ||
      article.authorSecondaryNetwork ||
      undefined) as SupportedX402Network | undefined,
    secondaryAddress: authorOverride?.secondaryPayoutAddress ?? article.authorSecondaryAddress ?? undefined,
  };
}

function resolvePayTo(payoutProfile: PayoutProfile, network: SupportedX402Network): string {
  const targetGroup = getNetworkGroup(network);
  const primaryGroup = getNetworkGroup(payoutProfile.primaryNetwork);

  if (primaryGroup === targetGroup) {
    return targetGroup === 'solana'
      ? normalizeSolanaAddress(payoutProfile.primaryAddress)
      : normalizeAddress(payoutProfile.primaryAddress);
  }

  if (payoutProfile.secondaryNetwork && payoutProfile.secondaryAddress) {
    const secondaryGroup = getNetworkGroup(payoutProfile.secondaryNetwork);
    if (secondaryGroup === targetGroup) {
      return secondaryGroup === 'solana'
        ? normalizeSolanaAddress(payoutProfile.secondaryAddress)
        : normalizeAddress(payoutProfile.secondaryAddress);
    }
  }

  throw new Error('AUTHOR_NETWORK_UNSUPPORTED');
}

function normalizeRecipientForNetwork(address: string, network: SupportedX402Network | string): string {
  return isSolanaNetwork(network)
    ? normalizeSolanaAddress(address)
    : normalizeAddress(address);
}

// NOTE: buildPaymentExtra and buildPaymentRequirement functions removed
// Payment requirements are now built using resourceServer.buildPaymentRequirements() from @x402/core
// which handles fee payer, asset, and amount parsing automatically per network

/**
 * normalizes based on the hint: 
 * Solana networks call normalizeSolanaAddress, others use normalizeAddress
 * it stores the corresponding primaryPayoutNetwor
 */
async function ensureAuthorRecord(address: string, networkHint?: SupportedPayoutNetwork): Promise<Author> {
  const normalizedFlexible = tryNormalizeFlexibleAddress(address);
  if (normalizedFlexible) {
    const authorByWallet = await db.getAuthorByWallet(normalizedFlexible);
    if (authorByWallet) {
      return authorByWallet;
    }
  }

  let normalizedAddress: string;
  let primaryNetwork: SupportedPayoutNetwork | undefined = networkHint;

  if (networkHint) {
    normalizedAddress = isSolanaNetwork(networkHint)
      ? normalizeSolanaAddress(address)
      : normalizeAddress(address);
  } else {
    const maybeEvm = tryNormalizeAddress(address);
    if (maybeEvm) {
      normalizedAddress = maybeEvm;
      primaryNetwork = DEFAULT_EVM_PAYOUT_NETWORK;
    } else {
      const maybeSol = tryNormalizeSolanaAddress(address);
      if (!maybeSol) {
        throw new Error('Invalid author address');
      }
      normalizedAddress = maybeSol;
      primaryNetwork = DEFAULT_SOLANA_PAYOUT_NETWORK;
    }
  }

  const existingAuthor = await db.getAuthor(normalizedAddress);
  if (existingAuthor) {
    const hasPrimaryWallet = existingAuthor.wallets?.some(
      wallet => wallet.isPrimary && wallet.address === normalizedAddress
    );

    if (!hasPrimaryWallet && existingAuthor.authorUuid) {
      await db.setAuthorWallet({
        authorUuid: existingAuthor.authorUuid,
        address: normalizedAddress,
        network: existingAuthor.primaryPayoutNetwork,
        isPrimary: true,
      });
      const refreshed = await db.getAuthorByUuid(existingAuthor.authorUuid);
      if (refreshed) {
        return refreshed;
      }
    }

    return existingAuthor;
  }

  const now = new Date().toISOString();
  const newAuthor: Author = {
    address: normalizedAddress,
    primaryPayoutNetwork: primaryNetwork || DEFAULT_EVM_PAYOUT_NETWORK,
    createdAt: now,
    totalArticles: 0,
    totalEarnings: 0,
    totalViews: 0,
    totalPurchases: 0,
  };

  const savedAuthor = await db.createOrUpdateAuthor(newAuthor);

  if (savedAuthor.authorUuid) {
    // Use newAuthor.primaryPayoutNetwork (correctly set from networkHint/detection)
    // NOT savedAuthor.primaryPayoutNetwork (hydrated from DB, defaults to EVM)
    await db.setAuthorWallet({
      authorUuid: savedAuthor.authorUuid,
      address: normalizedAddress,
      network: newAuthor.primaryPayoutNetwork,
      isPrimary: true,
    });
    const refreshed = await db.getAuthorByUuid(savedAuthor.authorUuid);
    if (refreshed) {
      return refreshed;
    }
  }

  return savedAuthor;
}

// Utility function to generate preview from content
function generatePreview(content: string, maxLength: number = 300): string {
  // Remove markdown formatting for preview
  const cleanContent = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  return cleanContent.substring(0, maxLength).trim() + '...';
}

// Utility function to estimate read time
function estimateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

 // Utility to hide test articles from /explore
  const TEST_ARTICLE_BLOCKLIST = new Set([92, 93, 94]);
  const shouldBypassExploreFilter = (req: Request) => {
    const referrer = req.get('referer') || '';
    return referrer.includes('/x402-test');
  };

// GET /api/x402 - x402 Discovery endpoint for x402scan listing
router.get('/x402', async (req: Request, res: Response) => {
  const resourceUrl = `${req.protocol}://${req.get('host')}/api/x402`;

  // Mainnet networks only for discovery (no testnets)
  const allNetworks: SupportedX402Network[] = [
    'eip155:8453',                              // Base mainnet
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',  // Solana mainnet
  ];

  // Build payment requirements for all networks
  const allRequirements = await Promise.all(
    allNetworks.map(async (network) => {
      const payTo = isSolanaNetwork(network) ? PLATFORM_SOLANA_ADDRESS! : PLATFORM_EVM_ADDRESS;
      const requirements = await resourceServer.buildPaymentRequirements({
        scheme: 'exact',
        network,
        price: 0.01,  // $0.01 symbolic for discovery
        payTo,
        maxTimeoutSeconds: 900
      });
      return requirements[0];
    })
  );

  // Filter out any null/undefined requirements
  const validRequirements = allRequirements.filter(Boolean);

  // v2 PaymentRequired response using SDK helper
  const paymentRequired = resourceServer.createPaymentRequiredResponse(
    validRequirements,
    { url: resourceUrl, description: 'Readia.io - The New Content Economy', mimeType: 'application/json' },
    'Payment required'
  );

  res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paymentRequired)).toString('base64'));
  return res.status(402).json(paymentRequired);
});

// GET /api/articles - Get all articles or articles by author
router.get('/articles', readLimiter, validate(getArticlesQuerySchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { authorAddress, search, sortBy, sortOrder } = req.query as GetArticlesQuery;
    let resolvedAuthorAddress: string | undefined;

    if (authorAddress) {
      try {
        const { canonicalAddress } = await resolveCanonicalAuthorAddress(authorAddress);
        resolvedAuthorAddress = canonicalAddress;
      } catch {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid author address',
        };
        return res.status(400).json(response);
      }
    }

    const articles = await db.getArticles({
      authorAddress: resolvedAuthorAddress,
      search,
      sortBy,
      sortOrder
    });

    const hideTestArticles = !authorAddress && !shouldBypassExploreFilter(req);
    const sanitizedArticles = hideTestArticles
      ? articles.filter(article => !TEST_ARTICLE_BLOCKLIST.has(article.id))
      : articles;

    const response: ApiResponse<Article[]> = {
      success: true,
      data: sanitizedArticles
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching articles:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch articles'
    };
    res.status(500).json(response);
  }
});

// GET /api/articles/:id - Get specific article
router.get('/articles/:id', readLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const article = await db.getArticleById(articleId);

    if (!article) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Article not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Article> = {
      success: true,
      data: article
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching article:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch article'
    };
    res.status(500).json(response);
  }
});

// POST /api/articles - Create new article
/**
 * runs the spam/quality checks without writing anything. 
 * lets the frontend “preflight” an article (so the editor can warn about spam rules, etc.) 
 */
router.post(
  '/articles/validate',
  writeLimiter,
  requireAuth,
  requireOwnership('authorAddress'),
  validate(createArticleSchema),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, authorAddress }: CreateArticleRequest = req.body;

    const spamCheck = await checkForSpam(authorAddress, title, content);
    if (spamCheck.isSpam) {
      const response: ApiResponse<null> = {
        success: false,
        error: spamCheck.reason || 'Content blocked by spam filter',
        message: spamCheck.details
      };
      return res.json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Validation passed'
    };

    res.json(response);
  } catch (error) {
    console.error('Error validating article:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to validate article'
    };
    res.status(500).json(response);
  }
});

// POST /api/articles - Create new article
/**
 * repeats the validation
 * writes the article, updates author stats, and so on.
 */
router.post('/articles', writeLimiter, requireAuth, requireOwnership('authorAddress'), validate(createArticleSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, price, categories, draftId }: CreateArticleRequest = req.body;
    const authorAddress = req.auth!.address;

    // Validation
    if (!title || !content || !price || !authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Missing required fields: title, content, price, authorAddress'
      };
      return res.status(400).json(response);
    }

    if (price < 0.01 || price > 1.00) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Price must be between $0.01 and $1.00'
      };
      return res.status(400).json(response);
    }

    // Resolve secondary wallet to canonical author BEFORE spam checks
    const { canonicalAddress } = await resolveCanonicalAuthorAddress(authorAddress);

    // Spam prevention check (using canonical address)
    const spamCheck = await checkForSpam(canonicalAddress, title, content);
    if (spamCheck.isSpam) {
      const response: ApiResponse<never> = {
        success: false,
        error: spamCheck.reason || 'Content blocked by spam filter',
        message: spamCheck.details
      };
      return res.status(429).json(response); // 429 Too Many Requests
    }

    // Ensure author exists BEFORE creating article (required by foreign key constraint)
    const author = await ensureAuthorRecord(canonicalAddress);

    // Generate preview and read time
    const preview = generatePreview(content);
    const readTime = estimateReadTime(content);
    const now = new Date().toISOString();

    // Create article
    const articleData: Omit<Article, 'id'> = {
      title,
      content,
      preview,
      price,
      authorAddress: author.address,
      authorPrimaryNetwork: author.primaryPayoutNetwork,
      authorSecondaryNetwork: author.secondaryPayoutNetwork,
      authorSecondaryAddress: author.secondaryPayoutAddress,
      publishDate: now.split('T')[0], // YYYY-MM-DD format
      createdAt: now,
      updatedAt: now,
      views: 0,
      purchases: 0,
      earnings: 0,
      readTime,
      categories: categories || [],
      likes: 0,
      popularityScore: 0
    };

    const article = await db.createArticle(articleData);

    if (typeof draftId === 'number') {
      try {
        await db.deleteDraft(draftId, author.address);
      } catch (draftError) {
        console.error('Failed to delete draft after publishing article:', draftError);
      }
    }

    // Update author statistics
    author.totalArticles += 1;
    await db.createOrUpdateAuthor(author);

    const response: ApiResponse<Article> = {
      success: true,
      data: article,
      message: 'Article created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating article:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create article'
    };
    res.status(500).json(response);
  }
});

// GET /api/authors/:address - Get author info
router.get('/authors/:address', readLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address: identifier } = req.params;
    let author: Author | null = null;

    if (req.auth?.authorUuid) {
      author = await db.getAuthorByUuid(req.auth.authorUuid);
    }
    if (!author) {
      author = await ensureAuthorRecord(req.auth!.address);
    }

    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Author profile not found',
      } satisfies ApiResponse<never>);
    }

    let isAuthorized = false;
    if (isUuid(identifier)) {
      isAuthorized = identifier === author.authorUuid;
    } else {
      try {
        const normalizedParam = normalizeFlexibleAddress(identifier);
        const normalizedAuth = normalizeFlexibleAddress(req.auth!.address);
        isAuthorized = normalizedParam === normalizedAuth;
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid author address'
        } satisfies ApiResponse<never>);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this author profile',
      } satisfies ApiResponse<never>);
    }

    const supportedNetworks =
      author.supportedNetworks && author.supportedNetworks.length > 0
        ? author.supportedNetworks
        : ([author.primaryPayoutNetwork, author.secondaryPayoutNetwork].filter(Boolean) as SupportedX402Network[]);

    const response: ApiResponse<Author> = {
      success: true,
      data: {
        ...author,
        supportedNetworks,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching author:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch author'
    };
    res.status(500).json(response);
  }
});

// Public author lookup (limited data, no stats) for wallet ownership checks
router.get('/public/authors/:identifier', readLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let author: Author | null = null;

    if (isUuid(identifier)) {
      author = await db.getAuthorByUuid(identifier);
    } else {
      const normalized = tryNormalizeFlexibleAddress(identifier);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          error: 'Invalid author address'
        } satisfies ApiResponse<never>);
      }
      author = await db.getAuthorByWallet(normalized);
    }

    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Author not found'
      } satisfies ApiResponse<never>);
    }

    const minimalWallets = (author.wallets || []).map(wallet => ({
      address: wallet.address,
      network: wallet.network,
      isPrimary: wallet.isPrimary,
    }));

    const publicProfile = {
      authorUuid: author.authorUuid,
      address: author.address,
      primaryPayoutNetwork: author.primaryPayoutNetwork,
      primaryPayoutAddress: author.primaryPayoutAddress || author.address,
      secondaryPayoutNetwork: author.secondaryPayoutNetwork,
      secondaryPayoutAddress: author.secondaryPayoutAddress,
      supportedNetworks: author.supportedNetworks || [],
      wallets: minimalWallets,
    };

    const response: ApiResponse<typeof publicProfile> = {
      success: true,
      data: publicProfile,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in public author lookup:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch author info'
    } satisfies ApiResponse<never>);
  }
});

const SUPPORTED_PAYOUT_NETWORKS = [
  'eip155:8453',      // Base mainnet
  'eip155:84532',     // Base Sepolia
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',  // Solana mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',  // Solana devnet
] as const;
type SupportedPayoutNetwork = (typeof SUPPORTED_PAYOUT_NETWORKS)[number];

// POST /api/authors/:address/payout-methods - Add or update secondary payout method
router.post('/authors/:address/payout-methods', writeLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const identifierParam = req.params.address;
    const { network, payoutAddress } = req.body || {};

    if (!network || !SUPPORTED_PAYOUT_NETWORKS.includes(network)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported payout network'
      } satisfies ApiResponse<never>);
    }

    if (!payoutAddress || typeof payoutAddress !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Payout address is required'
      } satisfies ApiResponse<never>);
    }

    let normalizedPayoutAddress: string;
    try {
      if (isSolanaNetwork(network)) {
        normalizedPayoutAddress = normalizeSolanaAddress(payoutAddress);
      } else {
        normalizedPayoutAddress = normalizeAddress(payoutAddress);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payout address'
      } satisfies ApiResponse<never>);
    }

    let author: Author | null = null;
    if (req.auth?.authorUuid) {
      author = await db.getAuthorByUuid(req.auth.authorUuid);
    }
    if (!author) {
      author = await ensureAuthorRecord(req.auth!.address);
    }

    // Ensure the path parameter refers to the authenticated author
    if (isUuid(identifierParam) && author?.authorUuid && identifierParam !== author.authorUuid) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to manage payout methods for this author'
      } satisfies ApiResponse<never>);
    }

    const authorUuid = author.authorUuid;
    if (!authorUuid) {
      return res.status(500).json({
        success: false,
        error: 'Author record missing unique id'
      } satisfies ApiResponse<never>);
    }

    if (author.primaryPayoutNetwork === network) {
      return res.status(400).json({
        success: false,
        error: 'Network already configured as primary payout method'
      } satisfies ApiResponse<never>);
    }

    await db.setAuthorWallet({
      authorUuid,
      address: normalizedPayoutAddress,
      network,
      isPrimary: false,
    });

    // Create USDC ATA for Solana secondary wallets (fire-and-forget)
    if (isSolanaNetwork(network)) {
      ensureSolanaUsdcAta(normalizedPayoutAddress, network, 'secondary_wallet').catch((error) => {
        console.error('[routes] Background ATA creation failed for secondary wallet:', error);
      });
    }

    author.secondaryPayoutNetwork = network;
    author.secondaryPayoutAddress = normalizedPayoutAddress;

    const updatedAuthor = await db.createOrUpdateAuthor(author);

    return res.json({
      success: true,
      data: updatedAuthor,
      message: 'Secondary payout method saved'
    } satisfies ApiResponse<Author>);
  } catch (error: any) {
    console.error('Error updating payout method:', error);

    // Handle unique constraint violation - use generic message for privacy
    if (error?.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Unable to add this wallet. Please try a different address.'
      } satisfies ApiResponse<never>);
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update payout method'
    } satisfies ApiResponse<never>);
  }
});

// DELETE /api/authors/:identifier/payout-methods - Remove secondary payout method
router.delete('/authors/:identifier/payout-methods', writeLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier } = req.params;
    const { network } = req.body || {};

    if (!network || !SUPPORTED_PAYOUT_NETWORKS.includes(network)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported payout network',
      } satisfies ApiResponse<never>);
    }

    let author: Author | null = null;
    if (req.auth?.authorUuid) {
      author = await db.getAuthorByUuid(req.auth.authorUuid);
    }
    if (!author) {
      author = await ensureAuthorRecord(req.auth!.address);
    }

    if (!author?.authorUuid) {
      return res.status(404).json({
        success: false,
        error: 'Author record not found',
      } satisfies ApiResponse<never>);
    }

    if (isUuid(identifier) && identifier !== author.authorUuid) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to manage payout methods for this author',
      } satisfies ApiResponse<never>);
    }
    const authorUuid = author.authorUuid;
    if (!authorUuid) {
      return res.status(500).json({
        success: false,
        error: 'Author record missing unique id',
      } satisfies ApiResponse<never>);
    }

    if (!author.secondaryPayoutNetwork || author.secondaryPayoutNetwork !== network) {
      return res.status(400).json({
        success: false,
        error: 'No secondary wallet configured for this network',
      } satisfies ApiResponse<never>);
    }

    await db.removeAuthorWallet({
      authorUuid,
      network,
    });

    author.secondaryPayoutNetwork = undefined;
    author.secondaryPayoutAddress = undefined;
    const updatedAuthor = await db.createOrUpdateAuthor(author);

    return res.json({
      success: true,
      data: updatedAuthor,
      message: 'Secondary payout method removed',
    } satisfies ApiResponse<Author>);
  } catch (error) {
    console.error('Error removing payout method:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove payout method',
    } satisfies ApiResponse<never>);
  }
});

// PUT /api/articles/:id/view - Increment article views
router.put('/articles/:id/view', readLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    
    if (isNaN(articleId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid article ID'
      };
      return res.status(400).json(response);
    }

    const result = await db.incrementArticleViews(articleId);

    if (result) {
      // Also increment author's total views
      const article = await db.getArticleById(articleId);
      if (article) {
        const author = await db.getAuthor(article.authorAddress);
        if (author) {
          author.totalViews += 1;
          await db.createOrUpdateAuthor(author);
        }
      }

      // Recalculate popularity score
      await db.updatePopularityScore(articleId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'View count incremented' }
      };
      res.json(response);
    } else {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Article not found'
      };
      res.status(404).json(response);
    }
  } catch (error) {
    console.error('Error incrementing article views:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to increment views'
    };
    res.status(500).json(response);
  }
});

// GET /api/authors/:ifentifier/stats - 7d purchase stat
router.get('/authors/:identifier/stats', readLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier } = req.params;
    let author: Author | null = null;

    if (req.auth?.authorUuid) {
      author = await db.getAuthorByUuid(req.auth.authorUuid);
    }
    if (!author) {
      author = await ensureAuthorRecord(req.auth!.address);
    }

    if (!author) {
      return res.status(404).json({ success: false, error: 'Author not found' });
    }

    let isAuthorized = false;
    if (isUuid(identifier)) {
      isAuthorized = identifier === author.authorUuid;
    } else {
      try {
        const normalizedParam = normalizeFlexibleAddress(identifier);
        const normalizedAuth = normalizeFlexibleAddress(req.auth!.address);
        isAuthorized = normalizedParam === normalizedAuth;
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid author address' });
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view stats' });
    }

    // 3) TODO: query payments/tips for last-7-day metrics (we’ll fill this in next step)
    const { rows: recentPayments } = await pgPool.query(
      `
        SELECT
          COUNT(*) AS purchase_count,
          COALESCE(SUM(p.amount), 0) AS purchase_total
        FROM payments p
        INNER JOIN articles a ON p.article_id = a.id
        WHERE a.author_address = $1
          AND p.created_at >= NOW() - INTERVAL '7 days'
      `,
      [author.address]
    );

    const purchases7d = parseInt(recentPayments[0]?.purchase_count || '0', 10);

    return res.json({
      success: true,
      data: {
        purchases7d,
      },
    });
  } catch (error) {
    console.error('Error fetching author stats', error);
    return res.status(500).json({success: false, error: 'Failed to fetch last 7 days purchases'})
  }
});

// POST /api/articles/:id/purchase - x402 Purchase with dynamic pricing and recipients
router.post('/articles/:id/purchase', criticalLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const article = await db.getArticleById(articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    const paymentHeader = req.headers['payment-signature'];
    const authorRecord = await db.getAuthor(article.authorAddress);
    const payoutProfile = buildPayoutProfile(article, authorRecord);

    // Check if ?network= param was explicitly provided
    const networkParam = req.query.network as string | undefined;
    const hasNetworkParam = !!networkParam;

    // ============================================
    // NO PAYMENT HEADER: Return 402 discovery
    // ============================================
    if (!paymentHeader) {
      const resourceUrl = `${req.protocol}://${req.get('host')}/api/articles/${article.id}/purchase`;

      // If network param provided, return single-network 402 (backward compatible)
      if (hasNetworkParam) {
        let networkPreference: SupportedX402Network;
        try {
          networkPreference = resolveNetworkPreference(req);
        } catch (error) {
          if ((error as Error).message === 'TESTNET_NOT_ALLOWED') {
            return res.status(400).json({
              success: false,
              error: 'Testnet payments are not accepted'
            });
          }
          throw error;
        }

        let payTo: string;
        try {
          payTo = resolvePayTo(payoutProfile, networkPreference);
        } catch (error) {
          if ((error as Error).message === 'AUTHOR_NETWORK_UNSUPPORTED') {
            return res.status(400).json({
              success: false,
              error: 'Author does not accept payments on this network'
            });
          }
          throw error;
        }

        const requirements = await resourceServer.buildPaymentRequirements({
          scheme: 'exact',
          network: networkPreference,
          price: article.price,
          payTo,
          maxTimeoutSeconds: 900
        });

        const paymentRequired = resourceServer.createPaymentRequiredResponse(
          [requirements[0]],
          { url: `${resourceUrl}?network=${networkPreference}`, description: `Purchase access to: ${article.title}`, mimeType: 'application/json' },
          'Payment required'
        );
        res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paymentRequired)).toString('base64'));
        return res.status(402).json(paymentRequired);
      }

      // No network param: Return canonical x402 with ALL networks author supports
      const allRequirements: Awaited<ReturnType<typeof resourceServer.buildPaymentRequirements>>[0][] = [];

      // Add primary network option
      const primaryGroup = getNetworkGroup(payoutProfile.primaryNetwork);
      const primaryNetwork: SupportedX402Network = primaryGroup === 'solana'
        ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
        : 'eip155:8453';
      const primaryPayTo = primaryGroup === 'solana'
        ? normalizeSolanaAddress(payoutProfile.primaryAddress)
        : normalizeAddress(payoutProfile.primaryAddress);

      const primaryReqs = await resourceServer.buildPaymentRequirements({
        scheme: 'exact',
        network: primaryNetwork,
        price: article.price,
        payTo: primaryPayTo,
        maxTimeoutSeconds: 900
      });
      allRequirements.push(primaryReqs[0]);

      // Add secondary network option (if author has one)
      if (payoutProfile.secondaryNetwork && payoutProfile.secondaryAddress) {
        const secondaryGroup = getNetworkGroup(payoutProfile.secondaryNetwork);
        const secondaryNetwork: SupportedX402Network = secondaryGroup === 'solana'
          ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
          : 'eip155:8453';
        const secondaryPayTo = secondaryGroup === 'solana'
          ? normalizeSolanaAddress(payoutProfile.secondaryAddress)
          : normalizeAddress(payoutProfile.secondaryAddress);

        const secondaryReqs = await resourceServer.buildPaymentRequirements({
          scheme: 'exact',
          network: secondaryNetwork,
          price: article.price,
          payTo: secondaryPayTo,
          maxTimeoutSeconds: 900
        });
        allRequirements.push(secondaryReqs[0]);
      }

      const paymentRequired = resourceServer.createPaymentRequiredResponse(
        allRequirements,
        { url: resourceUrl, description: `Purchase access to: ${article.title}`, mimeType: 'application/json' },
        'Payment required'
      );
      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paymentRequired)).toString('base64'));
      return res.status(402).json(paymentRequired);
    }

    // ============================================
    // HAS PAYMENT HEADER: Verify and settle
    // ============================================

    // Detect network from payment structure OR use provided param
    let networkPreference: SupportedX402Network;
    let payTo: string;

    if (hasNetworkParam) {
      // Use provided network param (backward compatible)
      try {
        networkPreference = resolveNetworkPreference(req);
      } catch (error) {
        if ((error as Error).message === 'TESTNET_NOT_ALLOWED') {
          return res.status(400).json({
            success: false,
            error: 'Testnet payments are not accepted'
          });
        }
        throw error;
      }

      try {
        payTo = resolvePayTo(payoutProfile, networkPreference);
      } catch (error) {
        if ((error as Error).message === 'AUTHOR_NETWORK_UNSUPPORTED') {
          return res.status(400).json({
            success: false,
            error: 'Author does not accept payments on this network'
          });
        }
        throw error;
      }
    } else {
      // Auto-detect network from payment structure (canonical x402)
      let paymentPayloadForDetection: PaymentPayload;
      try {
        const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
        paymentPayloadForDetection = JSON.parse(decoded) as PaymentPayload;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid x402 payment header'
        });
      }

      const rawPayloadForDetection = paymentPayloadForDetection.payload as Record<string, unknown>;
      const hasTransaction = typeof rawPayloadForDetection === 'object' && rawPayloadForDetection !== null && 'transaction' in rawPayloadForDetection;
      networkPreference = hasTransaction
        ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
        : 'eip155:8453';

      try {
        payTo = resolvePayTo(payoutProfile, networkPreference);
      } catch (error) {
        if ((error as Error).message === 'AUTHOR_NETWORK_UNSUPPORTED') {
          return res.status(400).json({
            success: false,
            error: 'Author does not accept payments on this network'
          });
        }
        throw error;
      }
    }

    // Build payment requirements for verification
    const requirements = await resourceServer.buildPaymentRequirements({
      scheme: 'exact',
      network: networkPreference,
      price: article.price,
      payTo,
      maxTimeoutSeconds: 900
    });
    const paymentRequirement = requirements[0];

    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded) as PaymentPayload;
    } catch (error) {
      console.error('Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // Basic guard to ensure amounts align before calling facilitator
    const requiredAmount = BigInt(paymentRequirement.amount);
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;
    const providedAmount = authorization && typeof authorization.value !== 'undefined'
      ? BigInt(authorization.value as string)
      : requiredAmount;

    if (providedAmount < requiredAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient payment amount'
      });
    }

    // Verify payment with facilitator
    const hasTransaction = typeof rawPayload === 'object' && rawPayload !== null && 'transaction' in rawPayload;
    const networkType = hasTransaction ? 'SVM' : 'EVM';

    let verification;
    try {
      verification = await resourceServer.verifyPayment(paymentPayload, paymentRequirement);
    } catch (error: any) {
      let responseBody;
      let correlationId: string | undefined;
      if (error?.response?.text) {
        try {
          responseBody = await error.response.text();
        } catch (bodyError) {
          responseBody = `Failed to read response body: ${bodyError}`;
        }
      }
      if (error?.response?.headers?.get) {
        correlationId =
          error.response.headers.get('correlation-id') ||
          error.response.headers.get('x-correlation-id') ||
          error.response.headers.get('Correlation-Context');
      }

      console.error('[x402] Facilitator verify failed:', {
        message: error?.message,
        status: error?.response?.status,
        correlationId,
        body: responseBody,
      });
      return res.status(502).json({
        success: false,
        error: 'Payment verification failed: facilitator error',
      });
    }
    if (!verification.isValid) {
      console.log(`[x402] ❌ Purchase | Article ${articleId} | Verify failed: ${verification.invalidReason || 'unknown'}`);
      return res.status(400).json({
        success: false,
        error: `Payment verification failed: ${verification.invalidReason || 'unknown_reason'}`
      });
    }

    /**
     * Recipient comparison based on network.
     * Solana payloads embed the destination in the transaction, so we rely on the requirement/facilitator check instead.
     */
    const networkGroup = getNetworkGroup(paymentRequirement.network as SupportedX402Network);
    let paymentRecipient: string;
    if (networkGroup === 'solana') {
      paymentRecipient = normalizeRecipientForNetwork(
        paymentRequirement.payTo,
        paymentRequirement.network
      );
    } else {
      paymentRecipient = normalizeRecipientForNetwork(
        (authorization?.to as string) || '',
        paymentRequirement.network
      );
    }
    const expectedRecipient = normalizeRecipientForNetwork(
      paymentRequirement.payTo,
      paymentRequirement.network
    );

    if (paymentRecipient !== expectedRecipient) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch'
      });
    }

    let payerAddress =
      tryNormalizeFlexibleAddress(verification.payer) ||
      tryNormalizeFlexibleAddress(
        typeof authorization?.from === 'string' ? authorization.from : ''
      );

    if (
      payerAddress &&
      getNetworkGroup(paymentRequirement.network as SupportedX402Network) === 'solana'
    ) {
      const ataOwner = await resolveSolanaAtaOwner(payerAddress, paymentRequirement.network as SupportedX402Network);
      if (ataOwner) {
        payerAddress = ataOwner;
      }
    }

    // Early check to query db if already paid for article BEFORE settlement goes out
    if (payerAddress) {
      const alreadyPaid = await checkPaymentStatus(articleId, payerAddress);
      if (alreadyPaid) {
        console.warn(`[x402] ⚠️ Purchase | Article ${articleId} | Duplicate blocked | Buyer: ${payerAddress}`);
        return res.status(409).json({
        success: false,
        error: 'You have already purchased this article',
        code: 'ALREADY_PAID'
      });
    }
  }

    // Settle authorization using SDK (wraps facilitator with hooks)
    const settlement = await resourceServer.settlePayment(paymentPayload, paymentRequirement);
   

    // v2: Check settlement success
    if (!settlement.success) {
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed. Please try again.',
        details: settlement.errorReason || 'Unknown settlement error'
      });
    }

    // Settlement succeeded => Grant access
    const txHash = settlement.transaction;  // v2: renamed from txHash
    
    // Record payment with txHash
    await recordArticlePurchase(articleId);
    await recordPayment(articleId, payerAddress || 'unknown', article.price, txHash);
    await incrementAuthorLifetimeStats(article.authorAddress, {
      earningsDelta: article.price,
      purchaseDelta: 1,
    });

    console.log(`[x402] ✅ Purchase
  Article: ${article.id}
  Network: ${paymentRequirement.network} | ${networkType}
  Price: $${article.price.toFixed(2)}
  Buyer: ${payerAddress || 'unknown'}
  Seller: ${payTo}${txHash ? `\n  Tx Hash: ${txHash}` : ''}`);

    return res.json({
      success: true,
      data: {
        message: 'Payment verified and purchase recorded',
        receipt: `payment-${articleId}-${Date.now()}`,
        transactionHash: txHash // could be null. Frontend doesn't care. 
      }
    });

  } catch (error) {
    console.error('Error in purchase route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process purchase'
    });
  }
});

// Donate endpoint
// POST /api/donate - Donate to Readia.io platform
router.post('/donate', criticalLimiter, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const paymentHeader = req.headers['payment-signature'];  // v2: renamed from x-payment

    // Validate donation amount
    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation amount. Must be between $0.10 and $1.00.'
      });
    }

    let networkPreference: SupportedX402Network;
    try {
      networkPreference = resolveNetworkPreference(req);
    } catch (error) {
      if ((error as Error).message === 'TESTNET_NOT_ALLOWED') {
        return res.status(400).json({
          success: false,
          error: 'Testnet payments are not accepted'
        });
      }
      throw error;
    }

    const payTo =
      isSolanaNetwork(networkPreference)
        ? PLATFORM_SOLANA_ADDRESS
        : PLATFORM_EVM_ADDRESS;

    if (!payTo) {
      return res.status(400).json({
        success: false,
        error: 'Platform does not accept donations on this network'
      });
    }

    // Build payment requirements using SDK (handles fee payer, asset, amount parsing)
    const requirements = await resourceServer.buildPaymentRequirements({
      scheme: 'exact',
      network: networkPreference,
      price: amount,
      payTo,
      maxTimeoutSeconds: 900
    });
    const paymentRequirement = requirements[0];
    const networkGroup = getNetworkGroup(networkPreference as SupportedX402Network);

    // If no payment header, return 402 with requirements
    const resourceUrl = `${req.protocol}://${req.get('host')}/api/donate?network=${networkPreference}`;
    if (!paymentHeader) {
      // v2 PaymentRequired response using SDK helper
      const paymentRequired = resourceServer.createPaymentRequiredResponse(
        [paymentRequirement],
        { url: resourceUrl, description: `Donation to Readia.io platform - $${amount}`, mimeType: 'application/json' },
        'Payment required'
      );
      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paymentRequired)).toString('base64'));
      return res.status(402).json(paymentRequired);
    }

    // Payment header provided - verify it
    const hasTransaction = paymentHeader && typeof paymentHeader === 'string';
    const networkType = networkGroup === 'solana' ? 'SVM' : 'EVM';

    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded) as PaymentPayload;  // v2: direct parse
    } catch (error) {
      console.error('Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // v2: Access authorization from payload with type safety
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;

    const verification = await resourceServer.verifyPayment(paymentPayload, paymentRequirement);

    if (!verification.isValid) {
      console.log(`[x402] ❌ Donation | Verify failed: ${verification.invalidReason || 'unknown'}`);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.invalidReason
      });
    }

    let paymentRecipient: string;
    if (networkGroup === 'solana') {
      paymentRecipient = normalizeRecipientForNetwork(payTo, networkPreference);
    } else {
      paymentRecipient = normalizeRecipientForNetwork(
        (authorization?.to as string) || '',
        networkPreference
      );
    }
    const expectedPlatformRecipient = normalizeRecipientForNetwork(payTo, networkPreference);
    if (paymentRecipient !== expectedPlatformRecipient) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch'
      });
    }

    const payerAddress =
      tryNormalizeFlexibleAddress(verification.payer) ||
      tryNormalizeFlexibleAddress(
        typeof authorization?.from === 'string' ? authorization.from : ''
      );

    const settlement = await resourceServer.settlePayment(paymentPayload, paymentRequirement);

    // v2: Check settlement success
    if (!settlement.success) {
      console.error('[x402] Donation settlement failed:', settlement.errorReason);
      return res.status(500).json({
        success: false,
        error: 'Donation settlement failed. Please try again.',
        details: settlement.errorReason || 'Unknown settlement error'
      });
    }

    const txHash = settlement.transaction;  // v2: renamed from txHash

    console.log(`[x402] ✅ Donation
  Network: ${networkPreference} | ${networkType}
  Amount: $${amount.toFixed(2)}
  Donor: ${payerAddress || 'unknown'}
  Platform: ${payTo}${txHash ? `\n  Tx Hash: ${txHash}` : ''}`);

    return res.json({
      success: true,
      data: {
        message: 'Thank you for your donation!',
        receipt: `donation-${Date.now()}`,
        amount,
        transactionHash: txHash
      }
    });

  } catch (error) {
    console.error('❌ Donation processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process donation'
    });
  }
});

// ============================================
// UI GENERATE ARTICLE (PayAI/CDP path - same as purchase/tip/donate)
// ============================================

/**
 * POST /api/generate-article - AI article generation for UI
 *
 * Uses PayAI/CDP facilitator (same path as purchase/tip/donate).
 * For programmatic agents, use /api/agent/generateArticle (OpenFacilitator path).
 *
 * Flow:
 * 1. POST with { prompt: "topic" } → 402 with payment requirements
 * 2. POST with payment-signature header → Claude generates article
 * 3. Returns { title, content, price, categories }
 */
router.post('/generate-article', criticalLimiter, async (req: Request, res: Response) => {
  try {
    const paymentHeader = req.headers['payment-signature'];
    const { prompt } = req.body;

    // Resolve network preference
    let networkPreference: SupportedX402Network;
    try {
      networkPreference = resolveNetworkPreference(req);
    } catch (error) {
      if ((error as Error).message === 'TESTNET_NOT_ALLOWED') {
        return res.status(400).json({
          success: false,
          error: 'Testnet payments are not accepted'
        });
      }
      throw error;
    }

    const payTo = isSolanaNetwork(networkPreference)
      ? PLATFORM_SOLANA_ADDRESS
      : PLATFORM_EVM_ADDRESS;

    if (!payTo) {
      return res.status(400).json({
        success: false,
        error: 'Platform does not accept payments on this network'
      });
    }

    // Build payment requirements using SDK (PayAI/CDP path)
    const requirements = await resourceServer.buildPaymentRequirements({
      scheme: 'exact',
      network: networkPreference,
      price: UI_GENERATE_ARTICLE_FEE,
      payTo,
      maxTimeoutSeconds: 900
    });
    const paymentRequirement = requirements[0];
    const networkGroup = getNetworkGroup(networkPreference);

    // ============================================
    // NO PAYMENT HEADER → Return 402
    // ============================================
    if (!paymentHeader) {
      const resourceUrl = `${req.protocol}://${req.get('host')}/api/generate-article?network=${networkPreference}`;
      const paymentRequired = resourceServer.createPaymentRequiredResponse(
        [paymentRequirement],
        {
          url: resourceUrl,
          description: `AI article generation - $${UI_GENERATE_ARTICLE_FEE}`,
          mimeType: 'application/json'
        },
        'Payment required'
      );
      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paymentRequired)).toString('base64'));
      return res.status(402).json(paymentRequired);
    }

    // ============================================
    // HAS PAYMENT HEADER → Verify, settle, generate
    // ============================================

    // Check Claude API key is configured
    if (!ANTHROPIC_API_KEY) {
      console.error('[generate-article] ANTHROPIC_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Article generation service not configured'
      });
    }

    // Decode payment header
    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded) as PaymentPayload;
    } catch (error) {
      console.error('[generate-article] Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // Verify payment
    const verification = await resourceServer.verifyPayment(paymentPayload, paymentRequirement);

    if (!verification.isValid) {
      console.log(`[generate-article] ❌ Verify failed: ${verification.invalidReason || 'unknown'}`);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.invalidReason
      });
    }

    // Get payer address for logging
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;
    const payerAddress =
      tryNormalizeFlexibleAddress(verification.payer) ||
      tryNormalizeFlexibleAddress(
        typeof authorization?.from === 'string' ? authorization.from : ''
      );

    // Settle payment
    const settlement = await resourceServer.settlePayment(paymentPayload, paymentRequirement);

    if (!settlement.success) {
      console.error('[generate-article] Settlement failed:', settlement.errorReason);
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed. Please try again.',
        details: settlement.errorReason || 'Unknown settlement error'
      });
    }

    const txHash = settlement.transaction;
    const networkType = networkGroup === 'solana' ? 'SVM' : 'EVM';

    console.log(`[generate-article] 💰 Payment settled
  Network: ${networkPreference} | ${networkType}
  Amount: $${UI_GENERATE_ARTICLE_FEE}
  Payer: ${payerAddress || 'unknown'}
  Tx Hash: ${txHash || 'N/A'}`);

    // ============================================
    // GENERATE ARTICLE WITH CLAUDE
    // ============================================

    // Check if prompt mentions news/trending topics that benefit from live data
    const userPrompt = prompt || 'Write about the most interesting trending tech news. Pick a compelling story and provide insightful analysis.';
    const needsNewsContext = !prompt ||
      /\b(news|trending|latest|today|current|recent|headlines?|update|happening)\b/i.test(prompt);

    let contextData = '';
    let sourceStory: { title: string; url: string } | null = null;

    if (needsNewsContext) {
      const searchQuery = extractSearchKeywords(prompt || 'technology trending');
      const googleNewsUrl = `${GOOGLE_NEWS_RSS_BASE}?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;

      console.log(`[generate-article] 🔍 Searching Google News for: "${searchQuery}"`);

      try {
        const newsResponse = await fetch(googleNewsUrl);
        if (newsResponse.ok) {
          const rssXml = await newsResponse.text();
          const newsItems = parseGoogleNewsRSS(rssXml);

          if (newsItems.length > 0) {
            const storiesSummary = newsItems.map((s, i) =>
              `${i + 1}. "${s.title}" (${s.source}, ${s.pubDate})`
            ).join('\n');
            contextData = `\n\nCURRENT NEWS (Search: "${searchQuery}"):\n${storiesSummary}`;
            sourceStory = { title: newsItems[0].title, url: newsItems[0].link };
            console.log(`[generate-article] 📰 Fetched ${newsItems.length} news items`);
          }
        }
      } catch (err) {
        console.log('[generate-article] Google News fetch failed, continuing with Claude knowledge:', err);
      }
    }

    // Build Claude prompt
    const claudePrompt = `You are an AI article writer for Logos by Readia, a micropayment content platform. Generate a blog article based on the user's prompt.

USER PROMPT:
${userPrompt}
${contextData}

IMPORTANT: Return ONLY valid JSON in this exact format, no other text:

{
  "title": "Your catchy headline here",
  "content": "<img src=\\"https://images.unsplash.com/photo-1234567890?w=800&q=80\\" alt=\\"Cover image\\" style=\\"display:block;margin:0 auto 1.5rem;max-width:100%;border-radius:8px;\\" /><h2>Section</h2><p>Content...</p>",
  "price": 0.05,
  "categories": ["Technology"]
}

STRICT VALIDATION REQUIREMENTS (your output MUST pass these):

1. TITLE (required):
   - Min: 1 character
   - Max: 200 characters
   - Make it catchy and descriptive

2. CONTENT (required):
   - Min: 50 characters (but aim for 300-500 words)
   - Max: 50,000 characters
   - Valid HTML tags: h2, h3, p, ul, li, ol, strong, em, img, table, thead, tbody, tr, th, td, blockquote, code, pre
   - Use tables for comparisons, data, specs - makes content more valuable
   - Use blockquotes for key insights or quotes
   - Use code/pre for technical content when relevant
   - Include a relevant Unsplash image at the top with centered styling (style="display:block;margin:0 auto 1.5rem;max-width:100%;border-radius:8px;")

3. PRICE (required):
   - Min: 0.01 (one cent)
   - Max: 1.00 (one dollar)
   - Suggest based on content value/length

4. CATEGORIES (required, pick 1-5):
   ONLY use these exact values:
   - Technology
   - AI & Machine Learning
   - Web Development
   - Crypto & Blockchain
   - Security
   - Business
   - Startup
   - Finance
   - Marketing
   - Science
   - Health
   - Education
   - Politics
   - Sports
   - Entertainment
   - Gaming
   - Art & Design
   - Travel
   - Food
   - Other

Write with authority and insight. Make it worth paying for.`;

    let claudeResponse;
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [
            { role: 'user', content: claudePrompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generate-article] Claude API error:', response.status, errorText);
        return res.status(502).json({
          success: false,
          error: 'AI generation failed',
          txHash
        });
      }

      claudeResponse = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
    } catch (err) {
      console.error('[generate-article] Claude API request failed:', err);
      return res.status(502).json({
        success: false,
        error: 'AI generation service unavailable',
        txHash
      });
    }

    // Parse Claude's response
    let generatedArticle: {
      title?: string;
      content?: string;
      price?: number;
      categories?: string[];
      sourceReference?: string;
    };
    try {
      const responseText = claudeResponse.content[0]?.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      generatedArticle = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('[generate-article] Failed to parse Claude response:', err);
      console.error('[generate-article] Raw response:', claudeResponse.content[0]?.text);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        txHash
      });
    }

    // Validate required fields
    if (!generatedArticle.title || !generatedArticle.content) {
      console.error('[generate-article] Missing required fields:', generatedArticle);
      return res.status(500).json({
        success: false,
        error: 'AI response missing required fields (title or content)',
        txHash
      });
    }

    // Ensure price is within valid range
    let price = generatedArticle.price || 0.05;
    if (price < 0.01) price = 0.01;
    if (price > 1.00) price = 1.00;

    console.log(`[generate-article] ✅ Article generated:`, {
      prompt: userPrompt.substring(0, 50),
      generatedTitle: generatedArticle.title.substring(0, 50),
      contentLength: generatedArticle.content.length,
      price,
      txHash
    });

    return res.status(200).json({
      success: true,
      data: {
        title: generatedArticle.title,
        content: generatedArticle.content,
        price,
        categories: generatedArticle.categories || ['Other'],
        sourceUrl: sourceStory?.url || null,
        sourceTitle: sourceStory?.title || generatedArticle.sourceReference || 'Original analysis',
        txHash
      }
    });

  } catch (error) {
    console.error('[generate-article] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// AGENT ENDPOINTS (x402 + JWT auth)
// ============================================

/**
 * GET /api/agent/articleRequirements - Public endpoint for article posting requirements
 *
 * Returns all requirements agents need to know before posting an article.
 * No auth required - discovery endpoint.
 */
router.get('/agent/articleRequirements', (_req: Request, res: Response) => {
  const requirements = {
    postingFee: AGENT_POSTING_FEE,
    supportedNetworks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'eip155:8453'],
    article: {
      title: { minLength: 1, maxLength: 200 },
      content: { minLength: 50, maxLength: 50000, minUniqueWords: 30 },
      price: { min: 0.01, max: 1.00 },
      categories: {
        maxCount: 5,
        validValues: [
          'Technology', 'AI & Machine Learning', 'Web Development', 'Crypto & Blockchain', 'Security',
          'Business', 'Startup', 'Finance', 'Marketing',
          'Science', 'Health', 'Education', 'Politics', 'Sports', 'Entertainment', 'Gaming', 'Art & Design', 'Travel', 'Food', 'Other'
        ]
      }
    },
    rateLimits: {
      maxPerHour: 5,
      maxPerDay: 20,
      minIntervalSeconds: 60,
      duplicateThreshold: 0.85
    },
    postingFlow: {
      description: 'Post an article using x402 payment protocol. NO JWT REQUIRED - payment signature proves wallet ownership.',
      step1: 'POST /api/agent/postArticle with article JSON body (title, content, price, categories)',
      step2: 'Receive 402 response with payment requirements',
      step3: 'Sign the payment transaction with your wallet and retry request with payment-signature header',
      step4: 'Success: receive { articleId, articleUrl, purchaseUrl, txHash }',
      note: 'Author = wallet address that signed the payment. New authors are auto-created on first post.'
    }
  };

  return res.json({ success: true, data: requirements });
});

/**
 * GET /api/agent/postArticle - x402 discovery endpoint
 *
 * Returns 402 with payment requirements for x402Jobs/x402scan registration.
 * This allows discovery tools to find the payment schema without auth.
 */
router.get('/agent/postArticle', async (req: Request, res: Response) => {
  try {
    // Build payment requirements for BOTH supported networks
    const solanaNetwork: SupportedX402Network = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const evmNetwork: SupportedX402Network = 'eip155:8453';

    if (!PLATFORM_SOLANA_ADDRESS || !PLATFORM_EVM_ADDRESS) {
      return res.status(500).json({
        success: false,
        error: 'Platform payout addresses not configured'
      });
    }

    // Resource URL for discovery
    const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/postArticle`;
    const description = `Agent article posting fee: $${AGENT_POSTING_FEE}`;

    // Build requirements for both networks using OpenFacilitator SDK
    const [solanaRequirements, evmRequirements] = await Promise.all([
      buildAgentPaymentRequirements(solanaNetwork, AGENT_POSTING_FEE, PLATFORM_SOLANA_ADDRESS, resourceUrl, description),
      buildAgentPaymentRequirements(evmNetwork, AGENT_POSTING_FEE, PLATFORM_EVM_ADDRESS, resourceUrl, description)
    ]);

    // Create 402 response with both network options
    const paymentRequired = createAgentPaymentRequiredResponse(
      [solanaRequirements, evmRequirements],
      { url: resourceUrl, description, mimeType: 'application/json' },
      'Payment required'
    );

    // x402Jobs format: single outputSchema with nested input/output
    const x402OutputSchema = {
      input: {
        type: 'http',
        method: 'POST',
        bodyType: 'json',
        bodyFields: {
          title: { type: 'string', required: true, description: 'Article title (1-200 chars)' },
          content: { type: 'string', required: true, description: 'Article content in HTML (50-50,000 chars)' },
          price: { type: 'number', required: true, description: 'Article price in USD ($0.01-$1.00)' },
          categories: { type: 'array', required: false, description: 'Article categories (max 5)' }
        }
      },
      output: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            articleId: { type: 'number', description: 'Unique article ID' },
            articleUrl: { type: 'string', description: 'Full URL to view the article' },
            purchaseUrl: { type: 'string', description: 'x402 endpoint for purchasing article access' },
            authorAddress: { type: 'string', description: 'Wallet address of the article author' },
            network: { type: 'string', description: 'Network used for payment' },
            txHash: { type: 'string', description: 'Blockchain transaction hash' }
          }
        }
      }
    };

    // Extra metadata for agents (x402Jobs format - everything in extra)
    const extraMetadata = {
      serviceName: 'Logos by Readia Article Publisher',
      serviceUrl: 'https://logos.readia.io',
      postingFee: AGENT_POSTING_FEE,
      validCategories: [
        'Technology', 'AI & Machine Learning', 'Web Development', 'Crypto & Blockchain', 'Security',
        'Business', 'Startup', 'Finance', 'Marketing',
        'Science', 'Health', 'Education', 'Politics', 'Sports', 'Entertainment', 'Gaming', 'Art & Design', 'Travel', 'Food', 'Other'
      ],
      rateLimits: { maxPerHour: 5, maxPerDay: 20 },
      usage: 'POST with JSON body: {title, content, price, categories?}'
    };

    // Add outputSchema and extra to each accepts item (x402Jobs format)
    const acceptsWithSchemas = paymentRequired.accepts.map((item) => ({
      ...item,
      outputSchema: x402OutputSchema,
      extra: {
        ...(item.extra || {}),
        ...extraMetadata
      }
    }));

    const responseWithDiscovery = {
      ...paymentRequired,
      accepts: acceptsWithSchemas
    };

    res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(responseWithDiscovery)).toString('base64'));
    return res.status(402).json(responseWithDiscovery);
  } catch (error) {
    console.error('[agent/postArticle GET] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to build payment requirements'
    });
  }
});

/**
 * POST /api/agent/postArticle - x402-enabled agent article posting
 *
 * Allows AI agents to programmatically post articles.
 * NO JWT REQUIRED - payment signature proves wallet ownership.
 *
 * Flow:
 * - No payment header → 402 (discovery mode)
 * - With payment header → validation → spam check → verify → settle → create
 * - Author = wallet address that signed the payment
 */
router.post('/agent/postArticle', async (req: Request, res: Response) => {
  try {
    // Accept both x402 v1 (x-payment) and v2 (payment-signature) headers
    const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'];

    // ============================================
    // DISCOVERY MODE: No payment header → 402
    // Return both network options (canonical x402)
    // ============================================
    if (!paymentHeader) {
      const solanaNetwork: SupportedX402Network = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const evmNetwork: SupportedX402Network = 'eip155:8453';

      if (!PLATFORM_SOLANA_ADDRESS || !PLATFORM_EVM_ADDRESS) {
        return res.status(500).json({
          success: false,
          error: 'Platform payout addresses not configured'
        });
      }

      // Resource URL for discovery
      const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/postArticle`;
      const description = `Agent article posting fee: $${AGENT_POSTING_FEE}`;

      // Build requirements for both networks using OpenFacilitator SDK
      const [solanaRequirements, evmRequirements] = await Promise.all([
        buildAgentPaymentRequirements(solanaNetwork, AGENT_POSTING_FEE, PLATFORM_SOLANA_ADDRESS, resourceUrl, description),
        buildAgentPaymentRequirements(evmNetwork, AGENT_POSTING_FEE, PLATFORM_EVM_ADDRESS, resourceUrl, description)
      ]);

      // Create 402 response with both network options
      const paymentRequired = createAgentPaymentRequiredResponse(
        [solanaRequirements, evmRequirements],
        { url: resourceUrl, description, mimeType: 'application/json' },
        'Payment required'
      );

      // x402Jobs format: single outputSchema with nested input/output
      const x402OutputSchema = {
        input: {
          type: 'http',
          method: 'POST',
          bodyType: 'json',
          bodyFields: {
            title: { type: 'string', required: true, description: 'Article title (1-200 chars)' },
            content: { type: 'string', required: true, description: 'Article content in HTML (50-50,000 chars)' },
            price: { type: 'number', required: true, description: 'Article price in USD ($0.01-$1.00)' },
            categories: { type: 'array', required: false, description: 'Article categories (max 5)' }
          }
        },
        output: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              articleId: { type: 'number', description: 'Unique article ID' },
              articleUrl: { type: 'string', description: 'Full URL to view the article' },
              purchaseUrl: { type: 'string', description: 'x402 endpoint for purchasing article access' },
              authorAddress: { type: 'string', description: 'Wallet address of the article author' },
              network: { type: 'string', description: 'Network used for payment' },
              txHash: { type: 'string', description: 'Blockchain transaction hash' }
            }
          }
        }
      };

      // Extra metadata for agents (x402Jobs format - everything in extra)
      const extraMetadata = {
        serviceName: 'Logos by Readia Article Publisher',
        serviceUrl: 'https://logos.readia.io',
        postingFee: AGENT_POSTING_FEE,
        validCategories: [
          'Technology', 'AI & Machine Learning', 'Web Development', 'Crypto & Blockchain', 'Security',
          'Business', 'Startup', 'Finance', 'Marketing',
          'Science', 'Health', 'Education', 'Politics', 'Sports', 'Entertainment', 'Gaming', 'Art & Design', 'Travel', 'Food', 'Other'
        ],
        rateLimits: { maxPerHour: 5, maxPerDay: 20 },
        usage: 'POST with JSON body: {title, content, price, categories?}'
      };

      // Add outputSchema and extra to each accepts item (x402Jobs format)
      const acceptsWithSchemas = paymentRequired.accepts.map((item) => ({
        ...item,
        outputSchema: x402OutputSchema,
        extra: {
          ...(item.extra || {}),
          ...extraMetadata
        }
      }));

      const responseWithDiscovery = {
        ...paymentRequired,
        accepts: acceptsWithSchemas
      };

      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(responseWithDiscovery)).toString('base64'));
      return res.status(402).json(responseWithDiscovery);
    }

    // ============================================
    // SUBMISSION MODE: Has payment header
    // ============================================

    // Step 1: Validate body
    const validationResult = createAgentArticleSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    const { title, content, price, categories } = validationResult.data;

    // Step 2: Decode payment header
    let paymentPayload: PaymentPayload;
    try {
      const decodedPayment = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decodedPayment) as PaymentPayload;
    } catch (error) {
      console.error('[agent/postArticle] Invalid payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // Step 3: Detect network from payment payload structure
    // Solana payments have 'transaction' field, EVM payments don't
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const hasTransaction = typeof rawPayload === 'object' && rawPayload !== null && 'transaction' in rawPayload;
    const detectedNetwork: SupportedX402Network = hasTransaction
      ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
      : 'eip155:8453';

    const payTo = hasTransaction ? PLATFORM_SOLANA_ADDRESS : PLATFORM_EVM_ADDRESS;
    if (!payTo) {
      return res.status(500).json({
        success: false,
        error: 'Platform payout address not configured for detected network'
      });
    }

    // Build payment requirements for the detected network using OpenFacilitator SDK
    const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/postArticle`;
    const paymentRequirement = await buildAgentPaymentRequirements(
      detectedNetwork,
      AGENT_POSTING_FEE,
      payTo,
      resourceUrl,
      `Agent article posting fee: $${AGENT_POSTING_FEE}`
    );

    // ============================================
    // Payment Verification (no money moves yet)
    // ============================================

    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;

    // Basic amount guard
    const requiredAmount = BigInt(paymentRequirement.maxAmountRequired);
    const providedAmount = authorization && typeof authorization.value !== 'undefined'
      ? BigInt(authorization.value as string)
      : requiredAmount;

    if (providedAmount < requiredAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient payment amount'
      });
    }

    // Verify payment with OpenFacilitator (checks signature, no money moves)
    let verification;
    try {
      verification = await openFacilitator.verify(paymentPayload as unknown as OFPaymentPayload, paymentRequirement);
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { status?: number } };
      console.error('[agent/postArticle] Facilitator verify failed:', {
        message: err?.message,
        status: err?.response?.status,
      });
      return res.status(502).json({
        success: false,
        error: 'Payment verification failed: facilitator error',
      });
    }

    if (!verification.isValid) {
      console.log(`[agent/postArticle] ❌ Verify failed:`, JSON.stringify(verification, null, 2));
      console.log(`[agent/postArticle] Payment requirement:`, JSON.stringify(paymentRequirement, null, 2));
      return res.status(400).json({
        success: false,
        error: `Payment verification failed: ${verification.invalidReason || 'unknown_reason'}`,
        debug: { verification, requirement: paymentRequirement }
      });
    }

    // Verify recipient matches platform wallet
    const networkGroup = getNetworkGroup(paymentRequirement.network as SupportedX402Network);
    let paymentRecipient: string;
    if (networkGroup === 'solana') {
      paymentRecipient = normalizeRecipientForNetwork(
        paymentRequirement.payTo || '',
        paymentRequirement.network
      );
    } else {
      paymentRecipient = normalizeRecipientForNetwork(
        (authorization?.to as string) || '',
        paymentRequirement.network
      );
    }
    const expectedRecipient = normalizeRecipientForNetwork(
      paymentRequirement.payTo || '',
      paymentRequirement.network
    );

    if (paymentRecipient !== expectedRecipient) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch - must pay to platform'
      });
    }

    // Extract payer address from payment payload (this is the author)
    // For Solana: extract from transaction using getTokenPayerFromTransaction
    // For EVM: extract from authorization.from
    let authorAddress: string | null = null;

    if (hasTransaction && rawPayload.transaction) {
      // Solana payment - extract payer from transaction
      try {
        const transaction = decodeTransactionFromPayload({ transaction: rawPayload.transaction as string });
        const solanaPayer = getTokenPayerFromTransaction(transaction);
        authorAddress = tryNormalizeSolanaAddress(solanaPayer);
      } catch (e) {
        console.error('[agent/postArticle] Failed to extract Solana payer:', e);
      }
    }

    // Fallback to verification.details.recipient or authorization.from (EVM)
    if (!authorAddress) {
      authorAddress =
        tryNormalizeFlexibleAddress(verification.details?.recipient || '') ||
        tryNormalizeFlexibleAddress(
          typeof authorization?.from === 'string' ? authorization.from : ''
        );
    }

    if (!authorAddress) {
      console.error('[agent/postArticle] Could not extract payer:', { verification, authorization, hasTransaction });
      return res.status(400).json({
        success: false,
        error: 'Could not extract payer address from payment'
      });
    }

    // Spam prevention check AFTER verification but BEFORE settlement
    // (no money moves until spam check passes)
    const spamCheck = await checkForSpam(authorAddress, title, content);
    if (spamCheck.isSpam) {
      return res.status(429).json({
        success: false,
        error: spamCheck.reason || 'Content blocked by spam filter',
        details: spamCheck.details
      });
    }

    // Settle payment with OpenFacilitator (money moves now)
    let settlement;
    try {
      settlement = await openFacilitator.settle(paymentPayload as unknown as OFPaymentPayload, paymentRequirement);
    } catch (settleError: unknown) {
      if (settleError instanceof SettlementError) {
        console.error('[agent/postArticle] SettlementError:', {
          message: settleError.message,
          code: settleError.code,
          statusCode: settleError.statusCode,
          details: settleError.details
        });
        return res.status(500).json({
          success: false,
          error: `Settlement failed: ${settleError.message}`,
          details: settleError.details
        });
      }
      // Generic error fallback
      const err = settleError as Error;
      console.error('[agent/postArticle] Settlement threw:', err.message, settleError);
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed: ' + (err?.message || 'Unknown error')
      });
    }

    if (!settlement.success) {
      console.error('[agent/postArticle] Settlement returned success=false:', JSON.stringify(settlement, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed. Please try again.',
        details: settlement
      });
    }

    const txHash = settlement.transaction;
    const networkType = hasTransaction ? 'SVM' : 'EVM';

    // Log successful payment
    console.log(`[agent/postArticle] 💰 Payment settled
  Network: ${detectedNetwork} | ${networkType}
  Amount: $${AGENT_POSTING_FEE}
  Payer: ${authorAddress}
  Tx Hash: ${txHash || 'N/A'}`);

    // ============================================
    // Create Article
    // ============================================

    // Ensure author record exists (network from payment determines payout network)
    const author = await ensureAuthorRecord(authorAddress, detectedNetwork);

    // Generate preview and read time
    const preview = generatePreview(content);
    const readTime = estimateReadTime(content);
    const now = new Date().toISOString();

    // Create article (same as human flow)
    const articleData: Omit<Article, 'id'> = {
      title,
      content,
      preview,
      price,
      authorAddress: author.address,
      authorPrimaryNetwork: author.primaryPayoutNetwork,
      authorSecondaryNetwork: author.secondaryPayoutNetwork,
      authorSecondaryAddress: author.secondaryPayoutAddress,
      publishDate: now.split('T')[0],
      createdAt: now,
      updatedAt: now,
      views: 0,
      purchases: 0,
      earnings: 0,
      readTime,
      categories: categories || [],
      likes: 0,
      popularityScore: 0
    };

    const article = await db.createArticle(articleData);

    // Update author statistics
    author.totalArticles += 1;
    await db.createOrUpdateAuthor(author);

    console.log(`[agent/postArticle] ✅ Article created:`, {
      articleId: article.id,
      author: authorAddress,
      title: title.substring(0, 50),
      txHash
    });

    // Build URLs for response
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'https://readia.io';
    const articleUrl = `${frontendUrl}/article/${article.id}`;
    const purchaseUrl = `/api/articles/${article.id}/purchase`;

    return res.status(201).json({
      success: true,
      data: {
        articleId: article.id,
        articleUrl,
        purchaseUrl,
        authorAddress: author.address,
        network: detectedNetwork,
        txHash
      }
    });

  } catch (error) {
    console.error('❌ Agent article creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process agent article creation'
    });
  }
});

// POST /api/articles/:id/tip - Tip article author with x402 payment
router.post('/articles/:id/tip', criticalLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { amount } = req.body;
    const paymentHeader = req.headers['payment-signature'];  // v2: renamed from x-payment

    // Validate tip amount
    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tip amount. Must be between $0.01 and $100.00.'
      });
    }

    // Get article to find author
    const article = await db.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    const authorRecord = await db.getAuthor(article.authorAddress);
    const payoutProfile = buildPayoutProfile(article, authorRecord);

    let networkPreference: SupportedX402Network;
    try {
      networkPreference = resolveNetworkPreference(req);
    } catch (error) {
      if ((error as Error).message === 'TESTNET_NOT_ALLOWED') {
        return res.status(400).json({
          success: false,
          error: 'Testnet payments are not accepted'
        });
      }
      throw error;
    }

    let payTo: string;
    try {
      payTo = resolvePayTo(payoutProfile, networkPreference);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Author does not accept tips on this network'
      });
    }

    // Build payment requirements using SDK (handles fee payer, asset, amount parsing)
    const requirements = await resourceServer.buildPaymentRequirements({
      scheme: 'exact',
      network: networkPreference,
      price: amount,
      payTo,
      maxTimeoutSeconds: 900
    });
    const paymentRequirement = requirements[0];
    const networkGroup = getNetworkGroup(networkPreference as SupportedX402Network);

    // If no payment header, return 402 with requirements
    const resourceUrl = `${req.protocol}://${req.get('host')}/api/articles/${articleId}/tip?network=${networkPreference}`;
    if (!paymentHeader) {
      // v2 PaymentRequired response using SDK helper
      const paymentRequired = resourceServer.createPaymentRequiredResponse(
        [paymentRequirement],
        { url: resourceUrl, description: `Tip for article: ${article.title}`, mimeType: 'application/json' },
        'Payment required'
      );
      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paymentRequired)).toString('base64'));
      return res.status(402).json(paymentRequired);
    }

    // Payment header provided - verify it
    const networkType = networkGroup === 'solana' ? 'SVM' : 'EVM';

    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded) as PaymentPayload;  // v2: direct parse
    } catch (error) {
      console.error('Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // v2: Access authorization from payload with type safety
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;

    const verification = await resourceServer.verifyPayment(paymentPayload, paymentRequirement);

    if (!verification.isValid) {
      console.log(`[x402] ❌ Tip | Article ${articleId} | Verify failed: ${verification.invalidReason || 'unknown'}`);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.invalidReason
      });
    }

    let paymentRecipient: string;
    if (networkGroup === 'solana') {
      paymentRecipient = normalizeRecipientForNetwork(payTo, networkPreference);
    } else {
      paymentRecipient = normalizeRecipientForNetwork(
        (authorization?.to as string) || '',
        networkPreference
      );
    }
    const expectedTipRecipient = normalizeRecipientForNetwork(payTo, networkPreference);
    if (paymentRecipient !== expectedTipRecipient) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch'
      });
    }

    const payerAddress =
      tryNormalizeFlexibleAddress(verification.payer) ||
      tryNormalizeFlexibleAddress(
        typeof authorization?.from === 'string' ? authorization.from : ''
      );

    const settlement = await resourceServer.settlePayment(paymentPayload, paymentRequirement);

    // v2: Check settlement success
    if (!settlement.success) {
      console.error('[x402] Tip settlement failed:', settlement.errorReason);
      return res.status(500).json({
        success: false,
        error: 'Tip settlement failed. Please try again.',
        details: settlement.errorReason || 'Unknown settlement error'
      });
    }

    const txHash = settlement.transaction;  // v2: renamed from txHash

    console.log(`[x402] ✅ Tip
  Article: ${articleId}
  Network: ${networkPreference} | ${networkType}
  Amount: $${amount.toFixed(2)}
  Tipper: ${payerAddress || 'unknown'}
  Author: ${payTo}${txHash ? `\n  Tx Hash: ${txHash}` : ''}`);

    await incrementAuthorLifetimeStats(article.authorAddress, {
      earningsDelta: amount,
    });

    return res.json({
      success: true,
      data: {
        message: 'Thank you for tipping the author!',
        receipt: `tip-${articleId}-${Date.now()}`,
        amount,
        transactionHash: txHash
      }
    });

  } catch (error) {
    console.error('❌ Tip processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process tip'
    });
  }
});

// ============================================
// AGENT SECONDARY WALLET ENDPOINT
// ============================================

/**
 * POST /api/agent/setSecondaryWallet - Add or update secondary payout wallet via x402 payment
 *
 * Allows agents to set (add or update) a secondary payout wallet after publishing their first article.
 * Payment MUST come from the primary wallet to prove ownership.
 * Calling this again with a different address will update the existing secondary wallet.
 *
 * Flow:
 * - No payment header → 402
 * - With payment header → verify payer is primary → set secondary wallet
 */
router.post('/agent/setSecondaryWallet', async (req: Request, res: Response) => {
  try {
    // Accept both x402 v1 (x-payment) and v2 (payment-signature) headers
    const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'];

    // ============================================
    // DISCOVERY MODE: No payment header → 402
    // Return 402 with full requirements regardless of body validity
    // This allows x402 discovery/registration without knowing body params
    // ============================================
    if (!paymentHeader) {
      const solanaNetwork: SupportedX402Network = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const evmNetwork: SupportedX402Network = 'eip155:8453';

      if (!PLATFORM_SOLANA_ADDRESS || !PLATFORM_EVM_ADDRESS) {
        return res.status(500).json({
          success: false,
          error: 'Platform payout addresses not configured'
        });
      }

      // Resource URL for discovery
      const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/setSecondaryWallet`;
      const description = `Set secondary payout wallet: $${AGENT_SECONDARY_WALLET_FEE}`;

      // Build requirements for both networks using OpenFacilitator SDK
      const [solanaRequirements, evmRequirements] = await Promise.all([
        buildAgentPaymentRequirements(solanaNetwork, AGENT_SECONDARY_WALLET_FEE, PLATFORM_SOLANA_ADDRESS, resourceUrl, description),
        buildAgentPaymentRequirements(evmNetwork, AGENT_SECONDARY_WALLET_FEE, PLATFORM_EVM_ADDRESS, resourceUrl, description)
      ]);

      // Create 402 response with both network options
      const paymentRequired = createAgentPaymentRequiredResponse(
        [solanaRequirements, evmRequirements],
        { url: resourceUrl, description, mimeType: 'application/json' },
        'Payment required'
      );

      // x402Jobs format: single outputSchema with nested input/output
      const x402OutputSchema = {
        input: {
          type: 'http',
          method: 'POST',
          bodyType: 'json',
          bodyFields: {
            network: { type: 'string', required: true, description: 'CAIP-2 network identifier (solana:5eykt... or eip155:8453)' },
            payoutAddress: { type: 'string', required: true, description: 'Your wallet address on the secondary network' }
          }
        },
        output: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Success message' },
              author: {
                type: 'object',
                properties: {
                  address: { type: 'string', description: 'Primary wallet address' },
                  primaryPayoutNetwork: { type: 'string', description: 'Primary network CAIP-2 identifier' },
                  primaryPayoutAddress: { type: 'string', description: 'Primary payout address' },
                  secondaryPayoutNetwork: { type: 'string', description: 'Secondary network CAIP-2 identifier' },
                  secondaryPayoutAddress: { type: 'string', description: 'Secondary payout address' }
                }
              },
              txHash: { type: 'string', description: 'Blockchain transaction hash' },
              note: { type: 'string', description: 'Additional information' }
            }
          }
        }
      };

      // Extra metadata for agents (x402Jobs format - everything in extra)
      const extraMetadata = {
        serviceName: 'Logos by Readia Secondary Wallet Manager',
        serviceUrl: 'https://logos.readia.io',
        fee: AGENT_SECONDARY_WALLET_FEE,
        usage: 'POST with JSON body: {network, payoutAddress}',
        authorization: 'To ADD: pay with PRIMARY wallet. To UPDATE: pay with PRIMARY or current SECONDARY wallet.'
      };

      // Add outputSchema and extra to each accepts item (x402Jobs format)
      const acceptsWithSchemas = paymentRequired.accepts.map((item) => ({
        ...item,
        outputSchema: x402OutputSchema,
        extra: {
          ...(item.extra || {}),
          ...extraMetadata
        }
      }));

      const responseWithDiscovery = {
        ...paymentRequired,
        accepts: acceptsWithSchemas
      };

      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(responseWithDiscovery)).toString('base64'));
      return res.status(402).json(responseWithDiscovery);
    }

    // ============================================
    // SUBMISSION MODE: Has payment header
    // Now validate body since we're actually processing a submission
    // ============================================

    // Validate body
    const { network, payoutAddress } = req.body as {
      network?: string;
      payoutAddress?: string;
    };

    if (!network || !payoutAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          network: !network ? 'Required: CAIP-2 network identifier (e.g., solana:5eykt... or eip155:8453)' : undefined,
          payoutAddress: !payoutAddress ? 'Required: Wallet address for secondary payout' : undefined
        }
      });
    }

    // Validate network is supported
    if (!SUPPORTED_X402_NETWORKS.includes(network as SupportedX402Network)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network',
        details: `Network must be one of: ${SUPPORTED_X402_NETWORKS.join(', ')}`
      });
    }

    const secondaryNetwork = network as SupportedX402Network;

    // Reject testnet in production
    if (isProduction) {
      if (secondaryNetwork.includes('84532') || secondaryNetwork.includes('EtWTRABZaYq6iMfeYKouRu166VU2xqa1')) {
        return res.status(400).json({
          success: false,
          error: 'Testnet wallets are not accepted in production'
        });
      }
    }

    // Validate address format for network
    let normalizedPayoutAddress: string;
    try {
      if (isSolanaNetwork(secondaryNetwork)) {
        normalizedPayoutAddress = normalizeSolanaAddress(payoutAddress);
      } else {
        normalizedPayoutAddress = normalizeAddress(payoutAddress);
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid payout address format',
        details: isSolanaNetwork(secondaryNetwork)
          ? 'Expected a valid Solana address (base58 encoded)'
          : 'Expected a valid EVM address (0x prefixed)'
      });
    }

    // Decode payment header
    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded) as PaymentPayload;
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment-signature header'
      });
    }

    // Detect network from payment structure
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;
    const hasTransaction = 'transaction' in rawPayload;

    const detectedNetwork: SupportedX402Network = hasTransaction
      ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
      : 'eip155:8453';

    const networkGroup = getNetworkGroup(detectedNetwork);

    // Build payment requirement for verification
    const payTo = networkGroup === 'solana' ? PLATFORM_SOLANA_ADDRESS : PLATFORM_EVM_ADDRESS;

    if (!payTo) {
      return res.status(500).json({
        success: false,
        error: 'Platform payout address not configured for this network'
      });
    }

    // Build payment requirements using OpenFacilitator SDK
    const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/setSecondaryWallet`;
    const paymentRequirement = await buildAgentPaymentRequirements(
      detectedNetwork,
      AGENT_SECONDARY_WALLET_FEE,
      payTo,
      resourceUrl,
      `Set secondary payout wallet: $${AGENT_SECONDARY_WALLET_FEE}`
    );

    // Verify payment with OpenFacilitator
    const verification = await openFacilitator.verify(paymentPayload as unknown as OFPaymentPayload, paymentRequirement);

    if (!verification.isValid) {
      console.log(`[agent/setSecondaryWallet] Payment verification failed: ${verification.invalidReason}`);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.invalidReason
      });
    }

    // Verify payment recipient is platform
    let paymentRecipient: string;
    if (networkGroup === 'solana') {
      paymentRecipient = normalizeRecipientForNetwork(payTo, detectedNetwork);
    } else {
      paymentRecipient = normalizeRecipientForNetwork(
        (authorization?.to as string) || '',
        detectedNetwork
      );
    }
    const expectedRecipient = normalizeRecipientForNetwork(payTo, detectedNetwork);

    if (paymentRecipient !== expectedRecipient) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch - must pay to platform'
      });
    }

    // Extract payer address from payment payload
    // For Solana: extract from transaction using getTokenPayerFromTransaction
    // For EVM: extract from authorization.from
    let payerAddress: string | null = null;

    if (hasTransaction && rawPayload.transaction) {
      // Solana payment - extract payer from transaction
      try {
        const transaction = decodeTransactionFromPayload({ transaction: rawPayload.transaction as string });
        const solanaPayer = getTokenPayerFromTransaction(transaction);
        payerAddress = tryNormalizeSolanaAddress(solanaPayer);
      } catch (e) {
        console.error('[agent/setSecondaryWallet] Failed to extract Solana payer:', e);
      }
    }

    // Fallback to verification.details.recipient or authorization.from (EVM)
    if (!payerAddress) {
      payerAddress =
        tryNormalizeFlexibleAddress(verification.details?.recipient || '') ||
        tryNormalizeFlexibleAddress(
          typeof authorization?.from === 'string' ? authorization.from : ''
        );
    }

    if (!payerAddress) {
      console.error('[agent/setSecondaryWallet] Could not extract payer:', { verification, authorization, hasTransaction });
      return res.status(400).json({
        success: false,
        error: 'Could not extract payer address from payment'
      });
    }

    // Look up author by payer address
    const author = await db.getAuthorByWallet(payerAddress);

    if (!author) {
      return res.status(400).json({
        success: false,
        error: 'No author profile found for this wallet',
        details: {
          message: 'You must publish at least one article before adding a secondary wallet.',
          action: 'POST /api/agent/postArticle to create your first article',
          payer: payerAddress
        }
      });
    }

    // Verify payer is authorized to set secondary wallet
    const primaryAddress = tryNormalizeFlexibleAddress(author.address);
    const currentSecondaryAddress = author.secondaryPayoutAddress
      ? tryNormalizeFlexibleAddress(author.secondaryPayoutAddress)
      : null;

    if (!currentSecondaryAddress) {
      // No secondary exists yet - must pay from primary to ADD
      if (payerAddress !== primaryAddress) {
        return res.status(400).json({
          success: false,
          error: 'Payment must come from your primary wallet',
          details: {
            message: 'To add a secondary wallet, payment must come from your primary wallet.',
            yourPrimaryWallet: author.address,
            yourPrimaryNetwork: author.primaryPayoutNetwork,
            payerWallet: payerAddress,
            action: 'Sign the payment with your primary wallet'
          }
        });
      }
    } else {
      // Secondary exists - allow payment from primary OR current secondary to UPDATE
      if (payerAddress !== primaryAddress && payerAddress !== currentSecondaryAddress) {
        return res.status(400).json({
          success: false,
          error: 'Payment must come from a wallet associated with your author profile',
          details: {
            message: 'To update your secondary wallet, payment must come from your primary or current secondary wallet.',
            yourPrimaryWallet: author.address,
            yourPrimaryNetwork: author.primaryPayoutNetwork,
            yourSecondaryWallet: author.secondaryPayoutAddress,
            yourSecondaryNetwork: author.secondaryPayoutNetwork,
            payerWallet: payerAddress,
            action: 'Sign the payment with either your primary or secondary wallet'
          }
        });
      }
    }

    // Verify secondary network is different type than primary
    const primaryNetworkGroup = getNetworkGroup(author.primaryPayoutNetwork);
    const secondaryNetworkGroup = getNetworkGroup(secondaryNetwork);

    if (primaryNetworkGroup === secondaryNetworkGroup) {
      return res.status(400).json({
        success: false,
        error: 'Secondary wallet must be on a different network type',
        details: {
          message: `Your primary is on ${primaryNetworkGroup.toUpperCase()}. Secondary must be on ${primaryNetworkGroup === 'evm' ? 'Solana' : 'EVM'}.`,
          yourPrimaryNetwork: author.primaryPayoutNetwork,
          requestedSecondaryNetwork: secondaryNetwork,
          suggestion: primaryNetworkGroup === 'evm'
            ? 'Use network: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
            : 'Use network: eip155:8453'
        }
      });
    }

    // Settle payment with OpenFacilitator
    const settlement = await openFacilitator.settle(paymentPayload as unknown as OFPaymentPayload, paymentRequirement);

    if (!settlement.success) {
      console.error('[agent/setSecondaryWallet] Settlement failed:', settlement.errorReason);
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed. Please try again.',
        details: settlement.errorReason || 'Unknown settlement error'
      });
    }

    const txHash = settlement.transaction;
    const networkType = hasTransaction ? 'SVM' : 'EVM';

    console.log(`[agent/setSecondaryWallet] 💰 Payment settled
  Network: ${detectedNetwork} | ${networkType}
  Amount: $${AGENT_SECONDARY_WALLET_FEE}
  Payer: ${payerAddress}
  Tx Hash: ${txHash || 'N/A'}`);

    // Update author with secondary wallet
    const authorUuid = author.authorUuid;
    if (authorUuid) {
      await db.setAuthorWallet({
        authorUuid,
        address: normalizedPayoutAddress,
        network: secondaryNetwork,
        isPrimary: false,
      });
    }

    // Create USDC ATA for Solana secondary wallets (fire-and-forget)
    if (isSolanaNetwork(secondaryNetwork)) {
      ensureSolanaUsdcAta(normalizedPayoutAddress, secondaryNetwork, 'secondary_wallet').catch((error) => {
        console.error('[agent/setSecondaryWallet] Background ATA creation failed:', error);
      });
    }

    author.secondaryPayoutNetwork = secondaryNetwork;
    author.secondaryPayoutAddress = normalizedPayoutAddress;

    const updatedAuthor = await db.createOrUpdateAuthor(author);

    console.log(`[agent/setSecondaryWallet] ✅ Secondary wallet added:`, {
      author: author.address,
      primaryNetwork: author.primaryPayoutNetwork,
      secondaryNetwork: secondaryNetwork,
      secondaryAddress: normalizedPayoutAddress,
      txHash
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Secondary payout wallet set successfully',
        author: {
          address: updatedAuthor.address,
          primaryPayoutNetwork: updatedAuthor.primaryPayoutNetwork,
          primaryPayoutAddress: updatedAuthor.primaryPayoutAddress || updatedAuthor.address,
          secondaryPayoutNetwork: updatedAuthor.secondaryPayoutNetwork,
          secondaryPayoutAddress: updatedAuthor.secondaryPayoutAddress,
        },
        txHash,
        note: 'Buyers can now pay you on either network. Your articles will show both payment options in 402 responses. Call this endpoint again to update your secondary wallet.'
      }
    });

  } catch (error: unknown) {
    console.error('[agent/setSecondaryWallet] Error:', error);

    // Handle unique constraint violation - wallet already associated with another author
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'This wallet is already associated with another author',
        details: {
          message: 'The payout address you specified is already linked to a different author profile.',
          action: 'Use a different wallet address for your secondary payout'
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to process secondary wallet update'
    });
  }
});

// Draft Routes

// POST /api/drafts - Create or update draft
router.post('/drafts', writeLimiter, requireAuth, requireOwnership('authorAddress'), validate(createDraftSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, price, isAutoSave }: CreateDraftRequest & { isAutoSave?: boolean } = req.body;
    const authorAddress = req.auth!.address;

    // Validation
    if (!authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Author address is required'
      };
      return res.status(400).json(response);
    }

    let canonicalAddress: string;
    try {
      ({ canonicalAddress } = await resolveCanonicalAuthorAddress(authorAddress));
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid author address'
      };
      return res.status(400).json(response);
    }

    await ensureAuthorRecord(canonicalAddress);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const draftData: Omit<Draft, 'id'> = {
      title: title || '',
      content: content || '',
      price: price || 0.05,
      authorAddress: canonicalAddress,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isAutoSave: !!isAutoSave,
    };

    const draft = await db.createOrUpdateRecentDraft(draftData, isAutoSave || false);

    const response: ApiResponse<Draft> = {
      success: true,
      data: draft,
      message: 'Draft saved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error saving draft:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to save draft'
    };
    res.status(500).json(response);
  }
});

// GET /api/drafts/:authorAddress - Get drafts for author
router.get('/drafts/:authorAddress', readLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { authorAddress } = req.params;
    let author: Author | null = null;

    if (req.auth?.authorUuid) {
      author = await db.getAuthorByUuid(req.auth.authorUuid);
    }
    if (!author) {
      author = await ensureAuthorRecord(req.auth!.address);
    }

    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Author not found'
      } satisfies ApiResponse<never>);
    }

    let isAuthorized = false;
    if (isUuid(authorAddress)) {
      isAuthorized = author.authorUuid === authorAddress;
    } else {
      try {
        const normalizedParam = normalizeFlexibleAddress(authorAddress);
        const normalizedAuth = normalizeFlexibleAddress(req.auth!.address);
        isAuthorized = normalizedParam === normalizedAuth;
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid author address'
        } satisfies ApiResponse<never>);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view drafts'
      } satisfies ApiResponse<never>);
    }

    await db.cleanupExpiredDrafts();
    const drafts = await db.getDraftsByAuthor(author.address);

    const response: ApiResponse<Draft[]> = {
      success: true,
      data: drafts
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch drafts'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/drafts/:id - Delete draft
router.delete('/drafts/:id', writeLimiter, requireAuth, requireOwnership('authorAddress'), validate(deleteRequestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const draftId = parseInt(req.params.id);
    const authorAddress = req.auth!.address;

    if (!authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Author address is required'
      };
      return res.status(400).json(response);
    }

    let canonicalAddress: string;
    try {
      ({ canonicalAddress } = await resolveCanonicalAuthorAddress(authorAddress));
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid author address'
      };
      return res.status(400).json(response);
    }

    const result = await db.deleteDraft(draftId, canonicalAddress);

    if (result) {
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Draft deleted successfully' }
      };
      res.json(response);
    } else {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Draft not found or unauthorized'
      };
      res.status(404).json(response);
    }
  } catch (error) {
    console.error('Error deleting draft:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete draft'
    };
    res.status(500).json(response);
  }
});

// PUT /api/articles/:id - Update existing article
router.put('/articles/:id', writeLimiter, requireAuth, requireOwnership('authorAddress'), validate(updateArticleSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { title, content, price, categories }: CreateArticleRequest = req.body;
    const authorAddress = req.auth!.address;

    // Validation
    if (!title || !content || !price || !authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Missing required fields: title, content, price, authorAddress'
      };
      return res.status(400).json(response);
    }

    if (price < 0.01 || price > 1.00) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Price must be between $0.01 and $1.00'
      };
      return res.status(400).json(response);
    }

    // Check if article exists and belongs to author
    const existingArticle = await db.getArticleById(articleId);
    if (!existingArticle) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Article not found'
      };
      return res.status(404).json(response);
    }

    let canonicalAddress: string;
    try {
      ({ canonicalAddress } = await resolveCanonicalAuthorAddress(authorAddress));
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid author address'
      };
      return res.status(400).json(response);
    }

    if (existingArticle.authorAddress !== canonicalAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Unauthorized: You can only edit your own articles'
      };
      return res.status(403).json(response);
    }

    const contentChanged = existingArticle.content !== content;
    if (contentChanged) {
      const qualityCheck = checkContentQuality(content);
      if (qualityCheck.isSpam) {
        const response: ApiResponse<null> = {
          success: false,
          error: qualityCheck.reason || 'Content blocked by spam filter',
          message: qualityCheck.details
        };
        return res.json(response);
      }
    }

    // Generate new preview and read time
    const preview = generatePreview(content);
    const readTime = estimateReadTime(content);
    const now = new Date().toISOString();

    const updatedArticle = await db.updateArticle(articleId, {
      title,
      content,
      preview,
      price,
      readTime,
      updatedAt: now,
      categories: categories || []
    });

    const response: ApiResponse<Article> = {
      success: true,
      data: updatedArticle,
      message: 'Article updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating article:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update article'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/articles/:id', writeLimiter, requireAuth, requireOwnership('authorAddress'), validate(deleteRequestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const authorAddress = req.auth!.address;

    if (!authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Author address is required'
      };
      return res.status(400).json(response);
    }

    // Check if article exists and belongs to author
    const existingArticle = await db.getArticleById(articleId);
    if (!existingArticle) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Article not found'
      };
      return res.status(404).json(response);
    }

    let canonicalAddress: string;
    try {
      ({ canonicalAddress } = await resolveCanonicalAuthorAddress(authorAddress));
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid author address'
      };
      return res.status(400).json(response);
    }

    if (existingArticle.authorAddress !== canonicalAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Unauthorized: You can only delete your own articles'
      };
      return res.status(403).json(response);
    }

    const result = await db.deleteArticle(articleId);

    if (result) {
      // NOTE: We do NOT decrement author lifetime totals when deleting articles
      // The user specifically requested that totalArticles, totalEarnings, totalViews, 
      // and totalPurchases should represent lifetime achievements and not be reduced
      // when articles are deleted, since "the money was earned, the article was published"

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Article deleted successfully' }
      };
      res.json(response);
    } else {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to delete article'
      };
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error deleting article:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete article'
    };
    res.status(500).json(response);
  }
});

// POST /api/upload - Upload image files for TinyMCE (Supabase Storage)
router.post('/upload', uploadLimiter, requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${uniqueSuffix}${fileExt}`;
    const filePath = `articles/${fileName}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('article-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload file to storage'
      });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(filePath);

    // TinyMCE expects this specific response format
    res.json({
      success: true,
      location: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// POST /api/articles/recalculate-popularity - Manually recalculate all popularity scores
router.post('/articles/recalculate-popularity', criticalLimiter, requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔄 Starting manual popularity score recalculation...');
    const result = await db.recalculateAllPopularityScores();

    const response: ApiResponse<{ updated: number; errors: number }> = {
      success: true,
      data: {
        updated: result.updated,
        errors: result.errors
      }
    };
    res.json(response);
  } catch (error) {
    console.error('Error recalculating popularity scores:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to recalculate popularity scores'
    };
    res.status(500).json(response);
  }
});

// Get payment status for an article
router.get('/payment-status/:articleId/:userAddress', readLimiter, async (req: Request, res: Response) => {
  try {
    const { articleId, userAddress } = req.params;

    const hasPaid = await checkPaymentStatus(parseInt(articleId), userAddress);

    res.json({
      success: true,
      data: {
        hasPaid,
        articleId: parseInt(articleId),
        userAddress
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status'
    });
  }
});

// Check if user can edit article (supports secondary wallets via UUID)
router.get('/articles/:id/can-edit/:userAddress', readLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { userAddress } = req.params;

    if (isNaN(articleId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid article ID'
      };
      return res.status(400).json(response);
    }

    // Get the article
    const article = await db.getArticleById(articleId);
    if (!article) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Article not found'
      };
      return res.status(404).json(response);
    }

    // Resolve canonical address (supports secondary wallets)
    let canonicalAddress: string;
    try {
      ({ canonicalAddress } = await resolveCanonicalAuthorAddress(userAddress));
    } catch {
      const response: ApiResponse<{ canEdit: boolean }> = {
        success: true,
        data: { canEdit: false }
      };
      return res.json(response);
    }

    // Check if user owns the article
    const canEdit = article.authorAddress === canonicalAddress;

    const response: ApiResponse<{ canEdit: boolean }> = {
      success: true,
      data: { canEdit }
    };
    res.json(response);

  } catch (error) {
    console.error('Error checking edit permission:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to check edit permission'
    };
    res.status(500).json(response);
  }
});

// Like/Unlike Routes

// POST /api/articles/:id/like - Like an article
router.post('/articles/:id/like', writeLimiter, requireAuth, requireOwnership('userAddress'), validate(likeRequestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const userAddress = req.auth!.address;

    if (!userAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'User address is required'
      };
      return res.status(400).json(response);
    }

    if (isNaN(articleId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid article ID'
      };
      return res.status(400).json(response);
    }

    // Check if article exists
    const article = await db.getArticleById(articleId);
    if (!article) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Article not found'
      };
      return res.status(404).json(response);
    }

    // Try to like the article
    const liked = await db.likeArticle(articleId, userAddress);

    if (liked) {
      // Update the article's likes count
      await db.updateArticleLikesCount(articleId);

      // Recalculate popularity score
      await db.updatePopularityScore(articleId);

      const response: ApiResponse<{ message: string; liked: boolean }> = {
        success: true,
        data: { message: 'Article liked successfully', liked: true }
      };
      res.json(response);
    } else {
      // User already liked this article
      const response: ApiResponse<{ message: string; liked: boolean }> = {
        success: true,
        data: { message: 'You have already liked this article', liked: false }
      };
      res.json(response);
    }
  } catch (error) {
    console.error('Error liking article:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to like article'
    };
    res.status(500).json(response);
  }
});

// DELETE /api/articles/:id/like - Unlike an article
router.delete('/articles/:id/like', writeLimiter, requireAuth, requireOwnership('userAddress'), validate(likeRequestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const userAddress = req.auth!.address;

    if (!userAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'User address is required'
      };
      return res.status(400).json(response);
    }

    if (isNaN(articleId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid article ID'
      };
      return res.status(400).json(response);
    }

    // Try to unlike the article
    const unliked = await db.unlikeArticle(articleId, userAddress);

    if (unliked) {
      // Update the article's likes count
      await db.updateArticleLikesCount(articleId);

      // Recalculate popularity score
      await db.updatePopularityScore(articleId);

      const response: ApiResponse<{ message: string; liked: boolean }> = {
        success: true,
        data: { message: 'Article unliked successfully', liked: false }
      };
      res.json(response);
    } else {
      // User hadn't liked this article
      const response: ApiResponse<{ message: string; liked: boolean }> = {
        success: true,
        data: { message: 'You have not liked this article', liked: false }
      };
      res.json(response);
    }
  } catch (error) {
    console.error('Error unliking article:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to unlike article'
    };
    res.status(500).json(response);
  }
});

// GET /api/articles/:id/like-status/:userAddress - Check if user liked article
router.get('/articles/:id/like-status/:userAddress', readLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { userAddress } = req.params;

    if (isNaN(articleId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid article ID'
      };
      return res.status(400).json(response);
    }

    const liked = await db.checkUserLikedArticle(articleId, userAddress);
    
    const response: ApiResponse<{ liked: boolean }> = {
      success: true,
      data: { liked }
    };
    res.json(response);
  } catch (error) {
    console.error('Error checking like status:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to check like status'
    };
    res.status(500).json(response);
  }
});

async function recordArticlePurchase(articleId: number): Promise<any> {
  try {
    // Get current article data
    const article = await db.getArticleById(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    // Update purchase count and earnings
    const newPurchases = article.purchases + 1;
    const newEarnings = article.earnings + article.price;

    await db.updateArticleStats(articleId, undefined, newPurchases, newEarnings);

    // Recalculate popularity score
    await db.updatePopularityScore(articleId);

    return {
      articleId,
      purchases: newPurchases,
      earnings: newEarnings
    };
  } catch (error) {
    console.error('Error recording article purchase:', error);
    throw error;
  }
}

// Payment tracking now uses database (payments table)
// These wrapper functions maintain backward compatibility with existing code
async function checkPaymentStatus(articleId: number, userAddress: string): Promise<boolean> {
  return db.checkPaymentStatus(articleId, userAddress);
}

async function recordPayment(articleId: number, userAddress: string, amount: number, transactionHash?: string): Promise<void> {
  await db.recordPayment(articleId, userAddress, amount, transactionHash);
}

async function incrementAuthorLifetimeStats(
  authorAddress: string,
  deltas: { earningsDelta?: number; purchaseDelta?: number }
): Promise<void> {
  try {
    const author = await db.getAuthor(authorAddress);
    if (!author) {
      return;
    }

    const updatedAuthor = {
      ...author,
      totalEarnings: Math.max(0, (author.totalEarnings || 0) + (deltas.earningsDelta || 0)),
      totalPurchases: Math.max(0, (author.totalPurchases || 0) + (deltas.purchaseDelta || 0)),
    };

    await db.createOrUpdateAuthor(updatedAuthor);
  } catch (error) {
    console.error('Failed to increment author stats:', error);
  }
}

async function resolveSolanaAtaOwner(ataAddress: string, network: SupportedX402Network | string): Promise<string | null> {
  const rpcUrl =
    network === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
      ? process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
      : process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          ataAddress,
          {
            encoding: 'jsonParsed'
          }
        ]
      })
    });

    if (!response.ok) {
      console.warn(`[solana] Failed to fetch ATA owner (status ${response.status})`);
      return null;
    }

    const payload = await response.json() as {
      result?: {
        value?: {
          data?: {
            parsed?: {
              info?: { owner?: string }
            }
          }
        }
      }
    };
    const owner = payload.result?.value?.data?.parsed?.info?.owner;
    return owner ? normalizeSolanaAddress(owner) : null;
  } catch (error) {
    console.warn('[solana] Unable to resolve ATA owner', error);
    return null;
  }
}

// ============================================
// USER HISTORY & FAVORITES (AUTHENTICATED)
// ============================================

async function enforceHistoryCap(wallet: string, client = pgPool) {
  await client.query(
    `
    DELETE FROM user_reads
    WHERE wallet_address = $1
      AND id IN (
        SELECT id FROM user_reads
        WHERE wallet_address = $1
        ORDER BY last_read_at DESC, id DESC
        OFFSET 20
      )
    `,
    [wallet]
  );
}

async function enforceFavoritesCap(wallet: string, client = pgPool) {
  await client.query(
    `
    DELETE FROM user_favorites
    WHERE wallet_address = $1
      AND id IN (
        SELECT id FROM user_favorites
        WHERE wallet_address = $1
        ORDER BY created_at DESC, id DESC
        OFFSET 20
      )
    `,
    [wallet]
  );
}

router.post('/users/me/history', writeLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { articleId } = historyRecordSchema.parse(req.body);
    const walletAddress = req.auth?.address;

    if (!walletAddress) {
      return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
    }

    const article = await db.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({ success: false, error: 'ARTICLE_NOT_FOUND' });
    }

    await pgPool.query(
      `
      INSERT INTO user_reads (wallet_address, article_id)
      VALUES ($1, $2)
      ON CONFLICT (wallet_address, article_id)
      DO UPDATE SET
        last_read_at = NOW(),
        read_count = user_reads.read_count + 1
      `,
      [walletAddress, articleId]
    );

    await enforceHistoryCap(walletAddress);

    return res.json({ success: true });
  } catch (error) {
    console.error('Error recording history:', error);
    return res.status(500).json({ success: false, error: 'Failed to record history' });
  }
});

router.get('/users/me/history', readLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit } = historyQuerySchema.parse(req.query);
    const walletAddress = req.auth?.address;

    if (!walletAddress) {
      return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
    }

    const { rows } = await pgPool.query(
      `
      SELECT
        ur.article_id AS id,
        a.title,
        a.preview,
        a.categories,
        a.author_address AS "authorAddress",
        a.publish_date AS "publishDate",
        ur.last_read_at AS "lastReadAt"
      FROM user_reads ur
      JOIN articles a ON a.id = ur.article_id
      WHERE ur.wallet_address = $1
      ORDER BY ur.last_read_at DESC
      LIMIT $2
      `,
      [walletAddress, limit || 20]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

router.post('/users/me/favorites', writeLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { articleId, favorite } = favoriteRequestSchema.parse(req.body);
    const walletAddress = req.auth?.address;

    if (!walletAddress) {
      return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
    }

    const article = await db.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({ success: false, error: 'ARTICLE_NOT_FOUND' });
    }

    if (favorite) {
      await pgPool.query(
        `
        INSERT INTO user_favorites (wallet_address, article_id)
        VALUES ($1, $2)
        ON CONFLICT (wallet_address, article_id) DO NOTHING
        `,
        [walletAddress, articleId]
      );
      await enforceFavoritesCap(walletAddress);
    } else {
      await pgPool.query(
        `DELETE FROM user_favorites WHERE wallet_address = $1 AND article_id = $2`,
        [walletAddress, articleId]
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating favorite:', error);
    return res.status(500).json({ success: false, error: 'Failed to update favorite' });
  }
});

// Check if a specific article is favorited (must be before general /favorites route)
router.get('/users/me/favorites/:articleId/status', readLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const walletAddress = req.auth?.address;

    if (!walletAddress) {
      return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
    }

    if (isNaN(articleId)) {
      return res.status(400).json({ success: false, error: 'Invalid article ID' });
    }

    const { rows } = await pgPool.query(
      `SELECT 1 FROM user_favorites WHERE wallet_address = $1 AND article_id = $2`,
      [walletAddress, articleId]
    );

    return res.json({ success: true, data: { isFavorited: rows.length > 0 } });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return res.status(500).json({ success: false, error: 'Failed to check favorite status' });
  }
});

router.get('/users/me/favorites', readLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit } = historyQuerySchema.parse(req.query);
    const walletAddress = req.auth?.address;

    if (!walletAddress) {
      return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
    }

    const { rows } = await pgPool.query(
      `
      SELECT
        uf.article_id AS id,
        a.title,
        a.preview,
        a.categories,
        a.author_address AS "authorAddress",
        a.publish_date AS "publishDate",
        uf.created_at AS "favoritedAt"
      FROM user_favorites uf
      JOIN articles a ON a.id = uf.article_id
      WHERE uf.wallet_address = $1
      ORDER BY uf.created_at DESC
      LIMIT $2
      `,
      [walletAddress, limit || 20]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch favorites' });
  }
});

// ============================================
// GET /api/agent/generateArticle - x402 protected AI article generation
// Accepts flexible instructions - Claude interprets and generates article
// Output always formatted for postArticle endpoint
// ============================================

// Google News RSS for dynamic topic-based news
const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss/search';

// Helper to extract search keywords from instructions
function extractSearchKeywords(instructions: string): string {
  // Remove common filler words and extract key topics
  const fillerWords = /\b(write|about|the|latest|news|article|blog|post|create|make|an?|and|or|for|with|from|today|current|recent|please|can|you|me|i|want|need|give|tell|summarize|analyze|cover|what|is|are|how|why|when|where)\b/gi;
  const cleaned = instructions.replace(fillerWords, ' ').replace(/\s+/g, ' ').trim();

  // Take first 3-5 meaningful words as search query (allow 2-char words like "AI")
  const words = cleaned.split(' ').filter(w => w.length >= 2).slice(0, 5);
  return words.length > 0 ? words.join(' ') : 'technology';
}

// Helper to parse Google News RSS XML
function parseGoogleNewsRSS(xml: string): Array<{ title: string; link: string; pubDate: string; source: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; source: string }> = [];

  // Simple regex-based XML parsing (no external dependency)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>([^<]+)<\/title>/;
  const linkRegex = /<link>([^<]+)<\/link>/;
  const pubDateRegex = /<pubDate>([^<]+)<\/pubDate>/;
  const sourceRegex = /<source[^>]*>([^<]+)<\/source>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const itemXml = match[1];
    const title = titleRegex.exec(itemXml)?.[1] || '';
    const link = linkRegex.exec(itemXml)?.[1] || '';
    const pubDate = pubDateRegex.exec(itemXml)?.[1] || '';
    // Extract source from title (format: "Title - Source Name")
    const sourceParts = title.split(' - ');
    const source = sourceParts.length > 1 ? sourceParts.pop() || 'Unknown' : 'Unknown';
    const cleanTitle = sourceParts.join(' - ');

    if (cleanTitle && link) {
      items.push({ title: cleanTitle, link, pubDate, source });
    }
  }

  return items;
}

router.post('/agent/generateArticle', async (req: Request, res: Response) => {
  try {
    // Check for x402 payment header (v2 uses payment-signature)
    const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'];

    // Get prompt from body (optional)
    const prompt = (req.body?.prompt as string) || '';

    // ============================================
    // DISCOVERY MODE: No payment header → return 402 with requirements
    // ============================================

    if (!paymentHeader) {
      const solanaNetwork: SupportedX402Network = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const evmNetwork: SupportedX402Network = 'eip155:8453';
      const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/generateArticle`;
      const description = `AI article generation: $${AGENT_GENERATE_ARTICLE_FEE}`;

      // Build payment requirements for both networks
      if (!PLATFORM_SOLANA_ADDRESS || !PLATFORM_EVM_ADDRESS) {
        return res.status(500).json({
          success: false,
          error: 'Platform payout addresses not configured'
        });
      }

      const [solanaRequirements, evmRequirements] = await Promise.all([
        buildAgentPaymentRequirements(solanaNetwork, AGENT_GENERATE_ARTICLE_FEE, PLATFORM_SOLANA_ADDRESS, resourceUrl, description),
        buildAgentPaymentRequirements(evmNetwork, AGENT_GENERATE_ARTICLE_FEE, PLATFORM_EVM_ADDRESS, resourceUrl, description)
      ]);

      // Create 402 response with both network options
      const paymentRequired = createAgentPaymentRequiredResponse(
        [solanaRequirements, evmRequirements],
        { url: resourceUrl, description, mimeType: 'application/json' },
        'Payment required'
      );

      // x402Jobs format: outputSchema with prompt input
      const x402OutputSchema = {
        input: {
          type: 'http',
          method: 'POST',
          bodyType: 'json',
          bodyFields: {
            prompt: {
              type: 'string',
              required: false,
              description: 'What would you like to write about? Examples: "Write 3 healthy cake recipes", "Cover the latest AI news", "Create a React hooks tutorial", "Write a travel guide for Paris". If not provided, defaults to trending tech news.'
            }
          }
        },
        output: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Generated article title' },
              content: { type: 'string', description: 'Generated HTML article content (compatible with postArticle)' },
              price: { type: 'number', description: 'Suggested article price ($0.01-$1.00)' },
              categories: { type: 'array', description: 'Article categories' },
              sourceUrl: { type: 'string', description: 'Reference URL if applicable' },
              sourceTitle: { type: 'string', description: 'Reference title if applicable' },
              txHash: { type: 'string', description: 'Payment transaction hash' }
            }
          }
        }
      };

      // Extra metadata for agents
      const extraMetadata = {
        serviceName: 'Logos by Readia AI Article Generator',
        serviceUrl: 'https://logos.readia.io',
        generationFee: AGENT_GENERATE_ARTICLE_FEE,
        description: 'General-purpose AI article generation. Write about anything: news, tutorials, recipes, opinion pieces, analysis, creative content, and more. For news-related prompts, live data is fetched from Google News. Output is formatted for direct use with postArticle endpoint.',
        usage: 'POST with { "prompt": "your prompt here" }. Works for any topic.',
        capabilities: [
          'News articles (fetches live data from Google News)',
          'Tutorials and how-to guides',
          'Recipes and food content',
          'Opinion pieces and analysis',
          'Creative writing and storytelling',
          'Technical explanations',
          'Product reviews and comparisons',
          'Any topic Claude has knowledge about'
        ],
        examples: [
          'Write about the latest AI developments',
          'Create 3 healthy cake recipes with nutritional info',
          'Write a tutorial on React hooks for beginners',
          'Explain quantum computing to a 10 year old',
          'Write an op-ed about remote work culture',
          'Cover the latest crypto market news',
          'Create a travel guide for Tokyo',
          'Write a product comparison: iPhone vs Android'
        ],
        validCategories: [
          'Technology', 'AI & Machine Learning', 'Web Development', 'Crypto & Blockchain', 'Security',
          'Business', 'Startup', 'Finance', 'Marketing', 'Science', 'Health', 'Education',
          'Politics', 'Sports', 'Entertainment', 'Gaming', 'Art & Design', 'Travel', 'Food', 'Other'
        ],
        rateLimits: { maxPerHour: 10, maxPerDay: 50 }
      };

      // Add outputSchema and extra to each accepts item
      const acceptsWithSchemas = paymentRequired.accepts.map((item) => ({
        ...item,
        outputSchema: x402OutputSchema,
        extra: {
          ...(item.extra || {}),
          ...extraMetadata
        }
      }));

      const responseWithDiscovery = {
        ...paymentRequired,
        accepts: acceptsWithSchemas
      };

      res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(responseWithDiscovery)).toString('base64'));
      return res.status(402).json(responseWithDiscovery);
    }

    // ============================================
    // EXECUTION MODE: Has payment header
    // ============================================

    // Check Claude API key is configured
    if (!ANTHROPIC_API_KEY) {
      console.error('[agent/generateArticle] ANTHROPIC_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Article generation service not configured'
      });
    }

    // Decode payment header
    let paymentPayload: PaymentPayload;
    try {
      const decodedPayment = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decodedPayment) as PaymentPayload;
    } catch (error) {
      console.error('[agent/generateArticle] Invalid payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // Detect network from payment payload
    const rawPayload = paymentPayload.payload as Record<string, unknown>;
    const hasTransaction = typeof rawPayload === 'object' && rawPayload !== null && 'transaction' in rawPayload;
    const detectedNetwork: SupportedX402Network = hasTransaction
      ? 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
      : 'eip155:8453';

    const payTo = hasTransaction ? PLATFORM_SOLANA_ADDRESS : PLATFORM_EVM_ADDRESS;
    if (!payTo) {
      return res.status(500).json({
        success: false,
        error: 'Platform payout address not configured'
      });
    }

    // Build payment requirements for verification
    const resourceUrl = `${req.protocol}://${req.get('host')}/api/agent/generateArticle`;
    const paymentRequirement = await buildAgentPaymentRequirements(
      detectedNetwork,
      AGENT_GENERATE_ARTICLE_FEE,
      payTo,
      resourceUrl,
      `Autonomous AI article generation: $${AGENT_GENERATE_ARTICLE_FEE}`
    );

    // Verify payment with OpenFacilitator
    let verification;
    try {
      verification = await openFacilitator.verify(paymentPayload as unknown as OFPaymentPayload, paymentRequirement);
    } catch (err) {
      console.error('[agent/generateArticle] Verify error:', err);
      return res.status(502).json({
        success: false,
        error: 'Payment verification failed: facilitator error'
      });
    }

    if (!verification.isValid) {
      return res.status(400).json({
        success: false,
        error: `Payment verification failed: ${verification.invalidReason || 'unknown_reason'}`
      });
    }

    // Settle payment
    let settlement;
    try {
      settlement = await openFacilitator.settle(paymentPayload as unknown as OFPaymentPayload, paymentRequirement);
    } catch (err) {
      const error = err as Error;
      console.error('[agent/generateArticle] Settle error:', error);
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed: ' + (error?.message || 'Unknown error')
      });
    }

    if (!settlement.success) {
      console.error('[agent/generateArticle] Settlement failed:', JSON.stringify(settlement, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed. Please try again.'
      });
    }

    const txHash = settlement.transaction;
    const networkType = hasTransaction ? 'SVM' : 'EVM';

    // Extract payer address for logging
    const authorization = rawPayload.authorization as Record<string, unknown> | undefined;
    let payerAddress: string | null = null;

    if (hasTransaction && rawPayload.transaction) {
      // Solana payment - extract payer from transaction
      try {
        const transaction = decodeTransactionFromPayload({ transaction: rawPayload.transaction as string });
        const solanaPayer = getTokenPayerFromTransaction(transaction);
        payerAddress = tryNormalizeSolanaAddress(solanaPayer);
      } catch (e) {
        console.error('[agent/generateArticle] Failed to extract Solana payer:', e);
      }
    }

    // Fallback to verification.details.recipient or authorization.from (EVM)
    if (!payerAddress) {
      payerAddress =
        tryNormalizeFlexibleAddress(verification.details?.recipient || '') ||
        tryNormalizeFlexibleAddress(
          typeof authorization?.from === 'string' ? authorization.from : ''
        );
    }

    console.log(`[agent/generateArticle] 💰 Payment settled
  Network: ${detectedNetwork} | ${networkType}
  Amount: $${AGENT_GENERATE_ARTICLE_FEE}
  Payer: ${payerAddress || 'unknown'}
  Tx Hash: ${txHash || 'N/A'}`);

    // ============================================
    // Step 1: Fetch relevant news based on prompt
    // ============================================

    // Check if prompt mentions news/trending topics that benefit from live data
    const needsNewsContext = !prompt ||
      /\b(news|trending|latest|today|current|recent|headlines?|update|happening)\b/i.test(prompt);

    let contextData = '';
    let sourceStory: { title: string; url: string } | null = null;

    if (needsNewsContext) {
      // Extract search keywords from prompt
      const searchQuery = extractSearchKeywords(prompt || 'technology trending');
      const googleNewsUrl = `${GOOGLE_NEWS_RSS_BASE}?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;

      console.log(`[agent/generateArticle] 🔍 Searching Google News for: "${searchQuery}"`);

      try {
        const newsResponse = await fetch(googleNewsUrl);
        if (newsResponse.ok) {
          const rssXml = await newsResponse.text();
          const newsItems = parseGoogleNewsRSS(rssXml);

          if (newsItems.length > 0) {
            const storiesSummary = newsItems.map((s, i) =>
              `${i + 1}. "${s.title}" (${s.source}, ${s.pubDate})`
            ).join('\n');
            contextData = `\n\nCURRENT NEWS (Search: "${searchQuery}"):\n${storiesSummary}`;
            // Save first story as potential source reference
            sourceStory = { title: newsItems[0].title, url: newsItems[0].link };
            console.log(`[agent/generateArticle] 📰 Fetched ${newsItems.length} news items for "${searchQuery}"`);
          }
        }
      } catch (err) {
        console.log('[agent/generateArticle] Google News fetch failed, continuing with Claude knowledge:', err);
      }
    }

    // ============================================
    // Step 2: Build flexible prompt for Claude
    // ============================================

    const userPrompt = prompt || 'Write about the most interesting trending tech news. Pick a compelling story and provide insightful analysis.';

    const claudePrompt = `You are an AI article writer for Logos by Readia, a micropayment content platform. Generate a blog article based on the user's prompt.

USER PROMPT:
${userPrompt}
${contextData}

IMPORTANT: Return ONLY valid JSON in this exact format, no other text:

{
  "title": "Your catchy headline here",
  "content": "<img src=\\"https://images.unsplash.com/photo-1234567890?w=800&q=80\\" alt=\\"Cover image\\" style=\\"display:block;margin:0 auto 1.5rem;max-width:100%;border-radius:8px;\\" /><h2>Section</h2><p>Content...</p>",
  "price": 0.05,
  "categories": ["Technology"]
}

STRICT VALIDATION REQUIREMENTS (your output MUST pass these):

1. TITLE (required):
   - Min: 1 character
   - Max: 200 characters
   - Make it catchy and descriptive

2. CONTENT (required):
   - Min: 50 characters (but aim for 300-500 words)
   - Max: 50,000 characters
   - Valid HTML tags: h2, h3, p, ul, li, ol, strong, em, img, table, thead, tbody, tr, th, td, blockquote, code, pre
   - Use tables for comparisons, data, specs - makes content more valuable
   - Use blockquotes for key insights or quotes
   - Use code/pre for technical content when relevant
   - Include a relevant Unsplash image at the top with centered styling (style="display:block;margin:0 auto 1.5rem;max-width:100%;border-radius:8px;")

3. PRICE (required):
   - Min: 0.01 (one cent)
   - Max: 1.00 (one dollar)
   - Suggest based on content value/length

4. CATEGORIES (required, pick 1-5):
   ONLY use these exact values:
   - Technology
   - AI & Machine Learning
   - Web Development
   - Crypto & Blockchain
   - Security
   - Business
   - Startup
   - Finance
   - Marketing
   - Science
   - Health
   - Education
   - Politics
   - Sports
   - Entertainment
   - Gaming
   - Art & Design
   - Travel
   - Food
   - Other

Write with authority and insight. Make it worth paying for.`;

    let claudeResponse;
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [
            { role: 'user', content: claudePrompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[agent/generateArticle] Claude API error:', response.status, errorText);
        return res.status(502).json({
          success: false,
          error: 'AI generation failed',
          txHash
        });
      }

      claudeResponse = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
    } catch (err) {
      console.error('[agent/generateArticle] Claude API request failed:', err);
      return res.status(502).json({
        success: false,
        error: 'AI generation service unavailable',
        txHash
      });
    }

    // Parse Claude's response
    let generatedArticle: {
      title?: string;
      content?: string;
      price?: number;
      categories?: string[];
      sourceReference?: string;
    };
    try {
      const responseText = claudeResponse.content[0]?.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      generatedArticle = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('[agent/generateArticle] Failed to parse Claude response:', err);
      console.error('[agent/generateArticle] Raw response:', claudeResponse.content[0]?.text);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        txHash
      });
    }

    // Validate required fields
    if (!generatedArticle.title || !generatedArticle.content) {
      console.error('[agent/generateArticle] Missing required fields:', generatedArticle);
      return res.status(500).json({
        success: false,
        error: 'AI response missing required fields (title or content)',
        txHash
      });
    }

    // Ensure price is within valid range
    let price = generatedArticle.price || 0.05;
    if (price < 0.01) price = 0.01;
    if (price > 1.00) price = 1.00;

    console.log(`[agent/generateArticle] ✅ Article generated:`, {
      prompt: userPrompt.substring(0, 50),
      generatedTitle: generatedArticle.title.substring(0, 50),
      contentLength: generatedArticle.content.length,
      price,
      txHash
    });

    return res.status(200).json({
      success: true,
      data: {
        title: generatedArticle.title,
        content: generatedArticle.content,
        price,
        categories: generatedArticle.categories || ['Other'],
        sourceUrl: sourceStory?.url || null,
        sourceTitle: sourceStory?.title || generatedArticle.sourceReference || 'Original analysis',
        txHash
      }
    });

  } catch (error) {
    console.error('[agent/generateArticle] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
