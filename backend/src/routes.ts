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
  updateArticleSchema,
  createDraftSchema,
  getArticlesQuerySchema,
  articleIdSchema,
  draftIdSchema,
  likeRequestSchema,
  deleteRequestSchema
} from './validation';
import { checkForSpam, checkContentQuality } from './spamPrevention';
import { facilitator } from '@coinbase/x402';
import { useFacilitator } from 'x402/verify';
import { PaymentPayload, PaymentPayloadSchema, PaymentRequirements } from 'x402/types';
import {
  normalizeAddress,
  normalizeSolanaAddress,
  normalizeFlexibleAddress,
  tryNormalizeFlexibleAddress,
  tryNormalizeSolanaAddress,
  tryNormalizeAddress,
} from './utils/address';
import { settleAuthorization } from './settlementService';
import { getFacilitatorFeePayer } from './facilitatorSupport';
import { getCACertificates } from 'tls';
import { success } from 'zod';
import { requireAuth, requireOwnership, AuthenticatedRequest } from './auth';

const router = express.Router();
const db = new Database();
const isProduction = process.env.NODE_ENV === 'production';
const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';

// Use CDP facilitator - auto-detects CDP_API_KEY_ID and CDP_API_KEY_SECRET from env
const { verify: verifyWithFacilitator, settle: settleWithFacilitator } = useFacilitator(facilitator);

type SupportedX402Network = 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';

const SUPPORTED_X402_NETWORKS: SupportedX402Network[] = [
  'base',
  'base-sepolia',
  'solana',
  'solana-devnet',
];

const X402_EVM_NETWORKS: SupportedX402Network[] = ['base', 'base-sepolia'];
const X402_SOLANA_NETWORKS: SupportedX402Network[] = ['solana', 'solana-devnet'];
type NetworkGroup = 'evm' | 'solana';

const DEFAULT_X402_NETWORK: SupportedX402Network =
  SUPPORTED_X402_NETWORKS.includes((process.env.X402_NETWORK || '') as SupportedX402Network)
    ? (process.env.X402_NETWORK as SupportedX402Network)
    : 'base-sepolia';

const DEFAULT_EVM_PAYOUT_NETWORK: SupportedPayoutNetwork =
  DEFAULT_X402_NETWORK === 'base' || DEFAULT_X402_NETWORK === 'base-sepolia'
    ? (DEFAULT_X402_NETWORK as SupportedPayoutNetwork)
    : 'base';

const DEFAULT_SOLANA_PAYOUT_NETWORK: SupportedPayoutNetwork =
  DEFAULT_X402_NETWORK === 'solana-devnet' ? 'solana-devnet' : 'solana';

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
    return candidate as SupportedX402Network;
  }

  return DEFAULT_X402_NETWORK;
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
  max: isProduction ? 100 : 1000, // Relax limits in development
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
  max: isProduction ? 20 : 200,
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
  max: isProduction ? 10 : 100,
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
  max: isProduction ? 10 : 100,
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


const SOLANA_USDC_MAINNET =
  process.env.X402_SOLANA_MAINNET_USDC_ADDRESS ||
  'EPjFWdd5AufqSSqeM2qE7c4wAkwcGw7Doe8kJ3e1ecp';
const SOLANA_USDC_DEVNET =
  process.env.X402_SOLANA_DEVNET_USDC_ADDRESS ||
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

const PLATFORM_EVM_ADDRESS = normalizeAddress(
  process.env.X402_PLATFORM_EVM_ADDRESS || '0x6945890B1c074414b813C7643aE10117dec1C8e7'
);

const PLATFORM_SOLANA_ADDRESS = process.env.X402_PLATFORM_SOL_ADDRESS
  ? normalizeSolanaAddress(process.env.X402_PLATFORM_SOL_ADDRESS)
  : null;

const getNetworkGroup = (network?: SupportedX402Network | null): NetworkGroup =>
  network && X402_SOLANA_NETWORKS.includes(network) ? 'solana' : 'evm';

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
    'base'
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

// Choose the right USDC contract/mint for the network. Base(*) use ERC-20 addresses,
// Solana networks use the SPL USDC mint (with env overrides if provided).
function resolveAsset(network: SupportedX402Network): string {
  if (network === 'base') {
    return process.env.X402_MAINNET_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  }
  if (network === 'base-sepolia') {
    return process.env.X402_TESTNET_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }
  return network === 'solana' ? SOLANA_USDC_MAINNET : SOLANA_USDC_DEVNET;
}

function normalizeRecipientForNetwork(address: string, network: SupportedX402Network | string): string {
  return X402_SOLANA_NETWORKS.includes(network as SupportedX402Network)
    ? normalizeSolanaAddress(address)
    : normalizeAddress(address);
}

/**
 * Builds the PaymentRequirements object for purchases, choosing the correct payout address and asset per network.
 */
async function buildPaymentRequirement(
  article: Article,
  payoutProfile: PayoutProfile,
  req: Request,
  network: SupportedX402Network
): Promise<PaymentRequirements> {
  const priceInCents = Math.round(article.price * 100);
  const priceInMicroUSDC = (priceInCents * 10000).toString();
  const resourceUrl = `${req.protocol}://${req.get('host')}/api/articles/${article.id}/purchase?network=${network}`;
  const displayAssetName = network === 'base' ? 'USD Coin' : 'USDC';

  const payTo = resolvePayTo(payoutProfile, network);
  const asset = resolveAsset(network);
  let feePayer: string | undefined;

  // use cached CDP feePayer for solana tx
  if (getNetworkGroup(network) === 'solana') {
    const rawFeePayer = await getFacilitatorFeePayer(network);
    feePayer = rawFeePayer ? normalizeSolanaAddress(rawFeePayer) : undefined;
    if (!feePayer) {
      throw new Error('FACILITATOR_FEE_PAYER_UNAVAILABLE');
    }
  }

  return {
    scheme: 'exact',
    network,
    maxAmountRequired: priceInMicroUSDC,
    resource: resourceUrl,
    description: `Purchase access to: ${article.title}`,
    mimeType: 'application/json',
    payTo,
    maxTimeoutSeconds: 900,
    asset,
    extra: {
      name: displayAssetName,
      version: '2',
      title: `Purchase: ${article.title}`,
      category: article.categories?.[0] || 'content',
      tags: article.categories || ['article', 'content'],
      serviceName: 'Readia.io Article Access',
      serviceDescription: `Unlock full access to "${article.title}" by ${article.authorAddress.slice(0, 6)}...${article.authorAddress.slice(-4)}`,
      gasLimit: '1000000',
      ...(feePayer ? { feePayer } : {}),
      pricing: {
        currency: displayAssetName,
        amount: article.price.toString(),
        display: `$${article.price.toFixed(2)}`
      }
    }
  };
}

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
    normalizedAddress = SOLANA_NETWORKS.includes(networkHint)
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
    await db.setAuthorWallet({
      authorUuid: savedAuthor.authorUuid,
      address: normalizedAddress,
      network: savedAuthor.primaryPayoutNetwork,
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

    // Spam prevention check
    const spamCheck = await checkForSpam(authorAddress, title, content);
    if (spamCheck.isSpam) {
      const response: ApiResponse<never> = {
        success: false,
        error: spamCheck.reason || 'Content blocked by spam filter',
        message: spamCheck.details
      };
      return res.status(429).json(response); // 429 Too Many Requests
    }

    // Ensure author exists BEFORE creating article (required by foreign key constraint)
    const author = await ensureAuthorRecord(authorAddress);

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

const SUPPORTED_PAYOUT_NETWORKS = ['base', 'base-sepolia', 'solana', 'solana-devnet'] as const;
type SupportedPayoutNetwork = (typeof SUPPORTED_PAYOUT_NETWORKS)[number];
const SOLANA_NETWORKS: SupportedPayoutNetwork[] = ['solana', 'solana-devnet'];

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
      if (SOLANA_NETWORKS.includes(network)) {
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

    author.secondaryPayoutNetwork = network;
    author.secondaryPayoutAddress = normalizedPayoutAddress;

    const updatedAuthor = await db.createOrUpdateAuthor(author);

    return res.json({
      success: true,
      data: updatedAuthor,
      message: 'Secondary payout method saved'
    } satisfies ApiResponse<Author>);
  } catch (error) {
    console.error('Error updating payout method:', error);
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

    const networkPreference = resolveNetworkPreference(req);
    const authorRecord = await db.getAuthor(article.authorAddress);
    const payoutProfile = buildPayoutProfile(article, authorRecord);
    let paymentRequirement: PaymentRequirements;
    try {
      paymentRequirement = await buildPaymentRequirement(article, payoutProfile, req, networkPreference);
    } catch (error) {
      if ((error as Error).message === 'AUTHOR_NETWORK_UNSUPPORTED') {
        return res.status(400).json({
          success: false,
          error: 'Author does not accept payments on this network'
        });
      }
      throw error;
    }
    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        error: 'X-PAYMENT header is required',
        accepts: [paymentRequirement]
      });
    }

    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = PaymentPayloadSchema.parse(JSON.parse(decoded));
    } catch (error) {
      console.error('Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    // Basic guard to ensure amounts align before calling facilitator
    console.log(`[x402] Purchase request for article ${articleId} on ${paymentRequirement.network} → payTo ${paymentRequirement.payTo}, asset ${paymentRequirement.asset}`);
    console.log('[x402] Received payment payload:', JSON.stringify(paymentPayload, null, 2));
    const requiredAmount = BigInt(paymentRequirement.maxAmountRequired);
    const authorization = paymentPayload.payload.authorization;
    const providedAmount = authorization && typeof authorization.value !== 'undefined'
      ? BigInt(authorization.value)
      : requiredAmount;

    if (providedAmount < requiredAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient payment amount'
      });
    }

    // Verify payment with facilitator (CDP when configured, public otherwise)
    const rawPayload: unknown = paymentPayload.payload;
    const hasTransaction = typeof rawPayload === 'object' && rawPayload !== null && 'transaction' in rawPayload;
    const transactionValue = hasTransaction ? (rawPayload as { transaction: string }).transaction : undefined;

    console.log('[x402] Verifying payment payload:', JSON.stringify({
      articleId,
      paymentRequirement,
      payloadPreview: {
        scheme: paymentPayload.scheme,
        network: paymentPayload.network,
        hasTransaction,
        transactionLength: transactionValue?.length,
      }
    }, null, 2));

    let verification;
    try {
      verification = await verifyWithFacilitator(paymentPayload, paymentRequirement);
    } catch (error: any) {
      let responseBody;
      if (error?.response?.text) {
        try {
          responseBody = await error.response.text();
        } catch (bodyError) {
          responseBody = `Failed to read response body: ${bodyError}`;
        }
      }
      const correlationId =
        (error?.response?.headers?.get && error.response.headers.get('correlation-id')) ||
        error?.response?.headers?.get?.('x-correlation-id') ||
        error?.response?.headers?.get?.('Correlation-Context');

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
        paymentPayload.payload.authorization.to as string,
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
        typeof paymentPayload.payload.authorization.from === 'string'
          ? paymentPayload.payload.authorization.from
          : ''
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
      const aldreadyPaid = await checkPaymentStatus(articleId, payerAddress);
      if (aldreadyPaid) {
        console.log(`⚠️ Duplicate payment attempt blocked for article ${articleId} by ${payerAddress}`);
        return res.status(409).json({
        success: false,
        error: 'You have already purchased this article',
        code: 'ALREADY_PAID'
      });
    }
  }

    // Settle authorization using CDP settle()
    const settlement = await settleAuthorization(paymentPayload, paymentRequirement);
   

    // Type guard: check if it's an error response
    if ('error' in settlement) {
      return res.status(500).json({
        success: false,
        error: 'Payment settlement failed. Please try again.', 
        details: settlement.error
      });
    }

    // Settlement succeeded => Grant access regardless of txHash
    const txHash = settlement.txHash;
    
    // Record payment with txHash
    await recordArticlePurchase(articleId);
    await recordPayment(articleId, payerAddress || 'unknown', article.price, txHash);
    await incrementAuthorLifetimeStats(article.authorAddress, {
      earningsDelta: article.price,
      purchaseDelta: 1,
    });

    console.log(`✅ Purchase successful: "${article.title}" (ID: ${article.id})`);
    console.log(`   💰 Amount: $${article.price.toFixed(2)} | 🧾 From: ${payerAddress || 'unknown'} | ✉️ To: ${article.authorAddress}`);
    if (txHash) {
      console.log(`   🔗 Transaction: ${txHash}`);
    }

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
    const paymentHeader = req.headers['x-payment'];

    // Validate donation amount
    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation amount. Must be between $0.10 and $1.00.'
      });
    }

    const amountInMicroUSDC = Math.floor(amount * 1_000_000);
    const networkPreference = resolveNetworkPreference(req);
    const payTo =
      networkPreference === 'solana' || networkPreference === 'solana-devnet'
        ? PLATFORM_SOLANA_ADDRESS
        : PLATFORM_EVM_ADDRESS;

    if (!payTo) {
      return res.status(400).json({
        success: false,
        error: 'Platform does not accept donations on this network'
      });
    }

    const asset = resolveAsset(networkPreference);
    const networkGroup = getNetworkGroup(networkPreference as SupportedX402Network);
    let feePayer: string | undefined;
    if (networkGroup === 'solana') {
      const rawFeePayer = await getFacilitatorFeePayer(networkPreference);
      if (!rawFeePayer) {
        console.error('[x402] Facilitator fee payer unavailable for donations on', networkPreference);
        return res.status(503).json({
          success: false,
          error: 'Facilitator fee payer unavailable. Please try again shortly.'
        });
      }
      feePayer = normalizeSolanaAddress(rawFeePayer);
    }

    const paymentRequirement: PaymentRequirements = {
      scheme: 'exact',
      network: networkPreference,
      maxAmountRequired: amountInMicroUSDC.toString(),
      resource: `${req.protocol}://${req.get('host')}/api/donate?network=${networkPreference}`,
      description: `Donation to Readia.io platform - $${amount}`,
      mimeType: 'application/json',
      payTo,
      maxTimeoutSeconds: 900,
      asset,
      outputSchema: {
        input: {
          type: 'http',
          method: 'POST',
          discoverable: true
        }
      },
      extra: {
        name: networkPreference === 'base' ? 'USD Coin' : 'USDC',
        version: '2',
        title: `Donate $${amount} to Readia.io`,
        category: 'donation',
        tags: ['donation', 'platform-support'],
        serviceName: 'Readia.io Platform Donation',
        serviceDescription: `Support Readia.io platform with a $${amount} donation`,
        ...(feePayer ? { feePayer } : {}),
        pricing: {
          currency: 'USD',
          amount: amount.toString(),
          display: `$${amount.toFixed(2)}`
        }
      }
    };

    // If no payment header, return 402 with requirements
    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        error: 'Payment required',
        price: `$${amount.toFixed(2)}`,
        accepts: [paymentRequirement]
      });
    }

    // Payment header provided - verify it
    console.log(`[x402] Donation request on ${networkPreference} → payTo ${payTo}, asset ${asset}`);
    console.log(`💰 Processing donation of $${amount} to platform`);

    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = PaymentPayloadSchema.parse(JSON.parse(decoded));
    } catch (error) {
      console.error('Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    console.log('🔍 Verifying donation payment with CDP facilitator...');
    const verification = await verifyWithFacilitator(paymentPayload, paymentRequirement);
    
    if (!verification.isValid) {
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
        paymentPayload.payload.authorization.to as string,
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
        typeof paymentPayload.payload.authorization.from === 'string'
          ? paymentPayload.payload.authorization.from
          : ''
      );

    console.log('🔧 Settling donation via CDP facilitator...');
    const settlement = await settleAuthorization(paymentPayload, paymentRequirement);

    if ('error' in settlement) {
      console.error('❌ Donation settlement failed:', settlement.error);
      return res.status(500).json({
        success: false,
        error: 'Donation settlement failed. Please try again.',
        details: settlement.error
      });
    }

    const txHash = settlement.txHash;

    console.log(`✅ Donation successful: $${amount.toFixed(2)} from ${payerAddress || 'unknown'} to ${payTo}`);
    if (txHash) {
      console.log(`   🔗 Transaction: ${txHash}`);
    }

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

// POST /api/articles/:id/tip - Tip article author with x402 payment
router.post('/articles/:id/tip', criticalLimiter, async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { amount } = req.body;
    const paymentHeader = req.headers['x-payment'];

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

    const amountInMicroUSDC = Math.floor(amount * 1_000_000);
    const networkPreference = resolveNetworkPreference(req);
    let payTo: string;
    try {
      payTo = resolvePayTo(payoutProfile, networkPreference);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Author does not accept tips on this network'
      });
    }

    const asset = resolveAsset(networkPreference);
    const networkGroup = getNetworkGroup(networkPreference as SupportedX402Network);
    let feePayer: string | undefined;
    if (networkGroup === 'solana') {
      const rawFeePayer = await getFacilitatorFeePayer(networkPreference);
      if (!rawFeePayer) {
        console.error('[x402] Facilitator fee payer unavailable for tips on', networkPreference);
        return res.status(503).json({
          success: false,
          error: 'Facilitator fee payer unavailable. Please try again shortly.'
        });
      }
      feePayer = normalizeSolanaAddress(rawFeePayer);
    }

    const paymentRequirement: PaymentRequirements = {
      scheme: 'exact',
      network: networkPreference,
      maxAmountRequired: amountInMicroUSDC.toString(),
      resource: `${req.protocol}://${req.get('host')}/api/articles/${articleId}/tip?network=${networkPreference}`,
      description: `Tip for article: ${article.title}`,
      mimeType: 'application/json',
      payTo,
      maxTimeoutSeconds: 900,
      asset,
      outputSchema: {
        input: {
          type: 'http',
          method: 'POST',
          discoverable: true
        }
      },
      extra: {
        name: networkPreference === 'base' ? 'USD Coin' : 'USDC',
        version: '2',
        title: `Tip $${amount} to author`,
        category: 'tip',
        tags: ['tip', 'author-support', 'article'],
        serviceName: 'Readia.io Article Tip',
        serviceDescription: `Tip the author of "${article.title}" with $${amount}`,
        ...(feePayer ? { feePayer } : {}),
        pricing: {
          currency: 'USD',
          amount: amount.toString(),
          display: `$${amount.toFixed(2)}`
        }
      }
    };

    // If no payment header, return 402 with requirements
    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        error: 'Payment required',
        price: `$${amount.toFixed(2)}`,
        accepts: [paymentRequirement]
      });
    }

    // Payment header provided - verify it
    console.log(`[x402] Tip request for article ${articleId} on ${networkPreference} → payTo ${payTo}, asset ${asset}`);
    console.log(`💰 Processing $${amount} tip for article ${articleId} to ${payTo}`);

    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader as string, 'base64').toString('utf8');
      paymentPayload = PaymentPayloadSchema.parse(JSON.parse(decoded));
    } catch (error) {
      console.error('Invalid x402 payment header:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid x402 payment header'
      });
    }

    console.log('🔍 Verifying tip payment with CDP facilitator...');
    const verification = await verifyWithFacilitator(paymentPayload, paymentRequirement);
    
    if (!verification.isValid) {
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
        paymentPayload.payload.authorization.to as string,
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
        typeof paymentPayload.payload.authorization.from === 'string'
          ? paymentPayload.payload.authorization.from
          : ''
      );

    console.log('🔧 Settling tip via CDP facilitator...');
    const settlement = await settleAuthorization(paymentPayload, paymentRequirement);

    if ('error' in settlement) {
      console.error('❌ Tip settlement failed:', settlement.error);
      return res.status(500).json({
        success: false,
        error: 'Tip settlement failed. Please try again.',
        details: settlement.error
      });
    }

    const txHash = settlement.txHash;

    console.log(`✅ Tip successful: $${amount.toFixed(2)} from ${payerAddress || 'unknown'} to ${payTo}`);
    if (txHash) {
      console.log(`   🔗 Transaction: ${txHash}`);
    }

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
    const { data, error } = await supabase.storage
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
router.post('/articles/recalculate-popularity', criticalLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

async function resolveSolanaAtaOwner(ataAddress: string, network: SupportedX402Network): Promise<string | null> {
  const rpcUrl =
    network === 'solana'
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

export default router;
