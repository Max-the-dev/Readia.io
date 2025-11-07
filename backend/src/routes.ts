import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import rateLimit from 'express-rate-limit';
import Database from './database';
import { supabase } from './supabaseClient';
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
import { facilitator as defaultFacilitator, createFacilitatorConfig } from '@coinbase/x402';
import { useFacilitator } from 'x402/verify';
import { PaymentPayload, PaymentPayloadSchema, PaymentRequirements } from 'x402/types';
import { normalizeAddress, tryNormalizeAddress } from './utils/address';
import { error } from 'console';
import { success } from 'zod';
import { settleAuthorization } from './settlementService';

const router = express.Router();
const db = new Database();
const isProduction = process.env.NODE_ENV === 'production';

const facilitatorConfig = process.env.COINBASE_CDP_API_KEY && process.env.COINBASE_CDP_API_SECRET
  ? createFacilitatorConfig(process.env.COINBASE_CDP_API_KEY, process.env.COINBASE_CDP_API_SECRET)
  : defaultFacilitator;

const { verify: verifyWithFacilitator } = useFacilitator(facilitatorConfig);

type SupportedX402Network = 'base' | 'base-sepolia';
const DEFAULT_X402_NETWORK: SupportedX402Network =
  process.env.X402_NETWORK === 'base' ? 'base' : 'base-sepolia';

function resolveNetworkPreference(req: Request): SupportedX402Network {
  const rawPreference = (req.query?.network ?? undefined);
  let candidate: string | undefined;

  if (typeof rawPreference === 'string') {
    candidate = rawPreference;
  } else if (Array.isArray(rawPreference) && typeof rawPreference[0] === 'string') {
    candidate = rawPreference[0];
  }

  if (candidate === 'base' || candidate === 'base-sepolia') {
    return candidate;
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
  skip: () => !isProduction, // Disable limiter entirely outside production
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
  skip: () => !isProduction,
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
  skip: () => !isProduction,
});

/**
 * Rate Limiter: File Uploads
 * For image upload endpoint
 * Moderate limit to prevent storage abuse
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 30 : 300,
  message: {
    success: false,
    error: 'Too many upload requests. Please wait before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
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

function buildPaymentRequirement(article: Article, req: Request, network: SupportedX402Network): PaymentRequirements {
  const priceInCents = Math.round(article.price * 100);
  const priceInMicroUSDC = (priceInCents * 10000).toString();
  const asset =
    network === 'base'
      ? process.env.X402_MAINNET_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      : process.env.X402_TESTNET_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

  const resourceUrl = `${req.protocol}://${req.get('host')}/api/articles/${article.id}/purchase?network=${network}`;

  return {
    scheme: 'exact',
    network,
    maxAmountRequired: priceInMicroUSDC,
    resource: resourceUrl,
    description: `Purchase access to: ${article.title}`,
    mimeType: 'application/json',
    payTo: article.authorAddress,
    maxTimeoutSeconds: 60,
    asset,
    outputSchema: {
      input: {
        type: 'http',
        method: 'POST',
        discoverable: true
      }
    },
    extra: {
      name: 'USDC',
      version: '2',
      title: `Purchase: ${article.title}`,
      category: article.categories?.[0] || 'content',
      tags: article.categories || ['article', 'content'],
      serviceName: 'Penny.io Article Access',
      serviceDescription: `Unlock full access to "${article.title}" by ${article.authorAddress.slice(0, 6)}...${article.authorAddress.slice(-4)}`,
      pricing: {
        currency: 'USD',
        amount: article.price.toString(),
        display: `$${article.price.toFixed(2)}`
      }
    }
  };
}

async function ensureAuthorRecord(address: string): Promise<Author> {
  const normalizedAddress = normalizeAddress(address);
  const existingAuthor = await db.getAuthor(normalizedAddress);
  if (existingAuthor) {
    return existingAuthor;
  }

  const now = new Date().toISOString();
  const newAuthor: Author = {
    address: normalizedAddress,
    createdAt: now,
    totalArticles: 0,
    totalEarnings: 0,
    totalViews: 0,
    totalPurchases: 0
  };

  await db.createOrUpdateAuthor(newAuthor);
  return newAuthor;
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

// GET /api/articles - Get all articles or articles by author
router.get('/articles', readLimiter, validate(getArticlesQuerySchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { authorAddress, search, sortBy, sortOrder } = req.query as GetArticlesQuery;

    const articles = await db.getArticles({
      authorAddress,
      search,
      sortBy,
      sortOrder
    });

    const response: ApiResponse<Article[]> = {
      success: true,
      data: articles
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
router.post('/articles/validate', writeLimiter, validate(createArticleSchema), async (req: Request, res: Response) => {
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
router.post('/articles', writeLimiter, validate(createArticleSchema), async (req: Request, res: Response) => {
  try {
    const { title, content, price, authorAddress, categories, draftId }: CreateArticleRequest = req.body;

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
      authorAddress,
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
        await db.deleteDraft(draftId, authorAddress);
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
router.get('/authors/:address', readLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    let normalizedAddress: string;
    try {
      normalizedAddress = normalizeAddress(address);
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid author address'
      };
      return res.status(400).json(response);
    }

    const author = await ensureAuthorRecord(normalizedAddress);

    const response: ApiResponse<Author> = {
      success: true,
      data: author
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
    const paymentRequirement = buildPaymentRequirement(article, req, networkPreference);
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
    const requiredAmount = BigInt(paymentRequirement.maxAmountRequired);
    const providedAmount = BigInt(paymentPayload.payload.authorization.value);

    if (providedAmount < requiredAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient payment amount'
      });
    }

    // Verify payment with facilitator (CDP when configured, public otherwise)
    const verification = await verifyWithFacilitator(paymentPayload, paymentRequirement);
    if (!verification.isValid) {
      return res.status(400).json({
        success: false,
        error: `Payment verification failed: ${verification.invalidReason || 'unknown_reason'}`
      });
    }

    const paymentRecipient = normalizeAddress(paymentPayload.payload.authorization.to);
    if (paymentRecipient !== article.authorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch'
      });
    }

    const payerAddress =
      tryNormalizeAddress(verification.payer) ||
      tryNormalizeAddress(
        typeof paymentPayload.payload.authorization.from === 'string'
          ? paymentPayload.payload.authorization.from
          : ''
    );

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
// POST /api/donate - Donate to Penny.io platform
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

    const platformAddress = normalizeAddress('0x6945890B1c074414b813C7643aE10117dec1C8e7');
    const amountInMicroUSDC = Math.floor(amount * 1_000_000);
    const network = process.env.X402_NETWORK || 'base-sepolia';
    const usdcAddress = network === 'base-sepolia'
      ? process.env.X402_TESTNET_USDC_ADDRESS
      : process.env.X402_MAINNET_USDC_ADDRESS;

    if (!usdcAddress) {
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error'
      });
    }

    const paymentRequirement: PaymentRequirements = {
      scheme: 'exact',
      network,
      maxAmountRequired: amountInMicroUSDC.toString(),
      resource: `${req.protocol}://${req.get('host')}/api/donate?network=${network}`,
      description: `Donation to Penny.io platform - $${amount}`,
      mimeType: 'application/json',
      payTo: platformAddress,
      maxTimeoutSeconds: 300,
      asset: usdcAddress,
      outputSchema: {
        input: {
          type: 'http',
          method: 'POST',
          discoverable: true
        }
      },
      extra: {
        name: 'USDC',
        version: '2',
        title: `Donate $${amount} to Penny.io`,
        category: 'donation',
        tags: ['donation', 'platform-support'],
        serviceName: 'Penny.io Platform Donation',
        serviceDescription: `Support Penny.io platform with a $${amount} donation`,
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

    const paymentRecipient = normalizeAddress(paymentPayload.payload.authorization.to);
    if (paymentRecipient !== platformAddress) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch'
      });
    }

    const payerAddress =
      tryNormalizeAddress(verification.payer) ||
      tryNormalizeAddress(
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

    console.log(`✅ Donation successful: $${amount} from ${payerAddress || 'unknown'}`);
    if (txHash) {
      console.log(`   Transaction: ${txHash}`);
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

    const authorAddress = article.authorAddress;
    const amountInMicroUSDC = Math.floor(amount * 1_000_000);
    const network = process.env.X402_NETWORK || 'base-sepolia';
    const usdcAddress = network === 'base-sepolia'
      ? process.env.X402_TESTNET_USDC_ADDRESS
      : process.env.X402_MAINNET_USDC_ADDRESS;

    if (!usdcAddress) {
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error'
      });
    }

    const paymentRequirement: PaymentRequirements = {
      scheme: 'exact',
      network,
      maxAmountRequired: amountInMicroUSDC.toString(),
      resource: `${req.protocol}://${req.get('host')}/api/articles/${articleId}/tip?network=${network}`,
      description: `Tip for article: ${article.title}`,
      mimeType: 'application/json',
      payTo: authorAddress,
      maxTimeoutSeconds: 300,
      asset: usdcAddress,
      outputSchema: {
        input: {
          type: 'http',
          method: 'POST',
          discoverable: true
        }
      },
      extra: {
        name: 'USDC',
        version: '2',
        title: `Tip $${amount} to author`,
        category: 'tip',
        tags: ['tip', 'author-support', 'article'],
        serviceName: 'Penny.io Article Tip',
        serviceDescription: `Tip the author of "${article.title}" with $${amount}`,
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
    console.log(`💰 Processing $${amount} tip for article ${articleId} to ${authorAddress}`);

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

    const paymentRecipient = normalizeAddress(paymentPayload.payload.authorization.to);
    if (paymentRecipient !== authorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Payment recipient mismatch'
      });
    }

    const payerAddress =
      tryNormalizeAddress(verification.payer) ||
      tryNormalizeAddress(
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

    console.log(`✅ Tip successful: $${amount} from ${payerAddress || 'unknown'} to ${authorAddress}`);
    if (txHash) {
      console.log(`   Transaction: ${txHash}`);
    }

    // TODO: Optional - record tip in database for analytics
    // await recordTip(articleId, authorAddress, amount, payerAddress, txHash);

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
router.post('/drafts', writeLimiter, validate(createDraftSchema), async (req: Request, res: Response) => {
  try {
    const { title, content, price, authorAddress, isAutoSave }: CreateDraftRequest & { isAutoSave?: boolean } = req.body;

    // Validation
    if (!authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Author address is required'
      };
      return res.status(400).json(response);
    }

    await ensureAuthorRecord(authorAddress);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const draftData: Omit<Draft, 'id'> = {
      title: title || '',
      content: content || '',
      price: price || 0.05,
      authorAddress,
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
router.get('/drafts/:authorAddress', readLimiter, async (req: Request, res: Response) => {
  try {
    const { authorAddress } = req.params;
    let normalizedAddress: string;
    try {
      normalizedAddress = normalizeAddress(authorAddress);
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid author address'
      };
      return res.status(400).json(response);
    }
    
    // Clean up expired drafts first
    await db.cleanupExpiredDrafts();
    
    const drafts = await db.getDraftsByAuthor(normalizedAddress);

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
router.delete('/drafts/:id', writeLimiter, validate(deleteRequestSchema), async (req: Request, res: Response) => {
  try {
    const draftId = parseInt(req.params.id);
    const { authorAddress } = req.body;

    if (!authorAddress) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Author address is required'
      };
      return res.status(400).json(response);
    }

    const result = await db.deleteDraft(draftId, authorAddress);

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
router.put('/articles/:id', writeLimiter, validate(updateArticleSchema), async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { title, content, price, authorAddress, categories }: CreateArticleRequest = req.body;

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

    if (existingArticle.authorAddress !== authorAddress) {
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
router.delete('/articles/:id', writeLimiter, validate(deleteRequestSchema), async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { authorAddress } = req.body;

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

    if (existingArticle.authorAddress !== authorAddress) {
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
router.post('/upload', uploadLimiter, upload.single('file'), async (req: Request, res: Response) => {
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
router.post('/articles/recalculate-popularity', criticalLimiter, async (req: Request, res: Response) => {
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

// Like/Unlike Routes

// POST /api/articles/:id/like - Like an article
router.post('/articles/:id/like', writeLimiter, validate(likeRequestSchema), async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { userAddress } = req.body;

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
router.delete('/articles/:id/like', writeLimiter, validate(likeRequestSchema), async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { userAddress } = req.body;

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

export default router;
