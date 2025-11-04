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
  verifyPaymentSchema,
  deleteRequestSchema
} from './validation';
import { checkForSpam } from './spamPrevention';

const router = express.Router();
const db = new Database();
const isProduction = process.env.NODE_ENV === 'production';

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

    let articles: Article[];

    if (authorAddress) {
      articles = await db.getArticlesByAuthor(authorAddress);
    } else {
      articles = await db.getAllArticles();
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      articles = articles.filter(article => 
        article.title.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (sortBy) {
      articles.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'price':
            aValue = a.price;
            bValue = b.price;
            break;
          case 'earnings':
            aValue = a.earnings;
            bValue = b.earnings;
            break;
          case 'views':
            aValue = a.views;
            bValue = b.views;
            break;
          case 'date':
          default:
            aValue = new Date(a.publishDate);
            bValue = new Date(b.publishDate);
            break;
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

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
router.post('/articles', writeLimiter, validate(createArticleSchema), async (req: Request, res: Response) => {
  try {
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

    // Create or update author record
    let author = await db.getAuthor(authorAddress);
    if (!author) {
      author = {
        address: authorAddress,
        createdAt: now,
        totalEarnings: 0,
        totalArticles: 1,
        totalViews: 0,
        totalPurchases: 0
      };
    } else {
      author.totalArticles += 1;
    }

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
    const author = await db.getAuthor(address);

    if (!author) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Author not found'
      };
      return res.status(404).json(response);
    }

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

// Verify x402 payment payload
async function verifyX402Payment(paymentData: any, article: any): Promise<boolean> {
  try {
    // Basic validation
    if (!paymentData.authorization || !paymentData.signature) {
      return false;
    }

    const { authorization } = paymentData;
    
    // Verify payment amount
    const requiredAmount = Math.round(article.price * 100 * 10000); // Convert to micro USDC
    const paidAmount = parseInt(authorization.value);
    
    if (paidAmount < requiredAmount) {
      console.log(`Insufficient payment: ${paidAmount} < ${requiredAmount}`);
      return false;
    }

    // Verify payment recipient
    if (authorization.to.toLowerCase() !== article.authorAddress.toLowerCase()) {
      console.log(`Wrong recipient: ${authorization.to} != ${article.authorAddress}`);
      return false;
    }

    // Verify timing
    const now = Math.floor(Date.now() / 1000);
    if (now < authorization.validAfter || now > authorization.validBefore) {
      console.log('Payment authorization expired');
      return false;
    }

    // In production, verify signature here:
    // const message = createEIP712Message(authorization);
    // const recoveredAddress = ethers.utils.verifyMessage(message, paymentData.signature);
    // return recoveredAddress.toLowerCase() === authorization.from.toLowerCase();

    console.log('Payment validation passed (demo mode)');
    return true;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

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

    // Check if x402 payment header is present
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      // Return 402 Payment Required with x402 format
      const priceInCents = Math.round(article.price * 100);
      const priceInMicroUSDC = priceInCents * 10000; // Convert to micro USDC

      const facilitatorUrl = process.env.COINBASE_CDP_API_KEY
        ? `https://facilitator.cdp.coinbase.com`
        : process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

      return res.status(402).json({
        x402Version: 1,
        error: "X-PAYMENT header is required",
        accepts: [{
          scheme: "exact",
          network: process.env.X402_NETWORK || "base-sepolia",
          maxAmountRequired: priceInMicroUSDC.toString(),
          resource: `${req.protocol}://${req.get('host')}/api/articles/${articleId}/purchase`,
          description: `Purchase access to: ${article.title}`,
          mimeType: "application/json",
          payTo: article.authorAddress, // Dynamic recipient - payment goes to author!
          maxTimeoutSeconds: 60,
          asset: process.env.X402_NETWORK === 'base'
            ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC Base mainnet
            : "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC Base Sepolia
          outputSchema: {
            input: {
              type: "http",
              method: "POST",
              discoverable: true
            }
          },
          extra: {
            name: "USDC",
            version: "2",
            // Bazaar discovery metadata
            title: `Purchase: ${article.title}`,
            category: article.categories?.[0] || "content",
            tags: article.categories || ["article", "content"],
            serviceName: "Penny.io Article Access",
            serviceDescription: `Unlock full access to "${article.title}" by ${article.authorAddress.slice(0, 6)}...${article.authorAddress.slice(-4)}`,
            pricing: {
              currency: "USD",
              amount: article.price.toString(),
              display: `$${article.price.toFixed(2)}`
            }
          }
        }]
      });
    }

    // Payment header is present - verify and process payment
    try {
      const paymentData = JSON.parse(Buffer.from(paymentHeader as string, 'base64').toString());
      
      // Verify payment (simplified for demo)
      const isValidPayment = await verifyX402Payment(paymentData, article);
      
      if (!isValidPayment) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment'
        });
      }

      // Payment verified! Update article stats
      const newPurchases = article.purchases + 1;
      const newEarnings = article.earnings + article.price;

      await db.updateArticleStats(articleId, undefined, newPurchases, newEarnings);

      // Update author stats
      const author = await db.getAuthor(article.authorAddress);
      if (author) {
        author.totalPurchases += 1;
        author.totalEarnings += article.price;
        await db.createOrUpdateAuthor(author);
      }

      // Recalculate popularity score
      await db.updatePopularityScore(articleId);

      // Record payment for persistence
      await recordPayment(articleId, paymentData.authorization?.from || 'unknown', article.price);

      return res.json({
        success: true,
        data: { 
          message: 'Payment verified and purchase recorded',
          receipt: `payment-${articleId}-${Date.now()}`
        }
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid payment format'
      });
    }

  } catch (error) {
    console.error('Error in purchase route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process purchase'
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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const draftData: Omit<Draft, 'id'> = {
      title: title || '',
      content: content || '',
      price: price || 0.05,
      authorAddress,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
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
    
    // Clean up expired drafts first
    await db.cleanupExpiredDrafts();
    
    const drafts = await db.getDraftsByAuthor(authorAddress);

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

// x402 Payment Verification Routes

interface PaymentPayload {
  from: string;
  to: string;
  value: number;
  signature: string;
  message?: string;
  validAfter?: number;
  validBefore?: number;
  nonce?: string;
}

// Verify x402 payment
router.post('/verify-payment', criticalLimiter, validate(verifyPaymentSchema), async (req: Request, res: Response) => {
  try {
    const { paymentPayload, articleId } = req.body as {
      paymentPayload: PaymentPayload;
      articleId: number;
    };

    // Basic validation
    if (!paymentPayload || !articleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment payload or article ID'
      });
    }

    // Verify payment signature and authorization
    const isValid = await verifyPaymentSignature(paymentPayload);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // Check payment amount against article price
    const article = await db.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    const requiredAmount = Math.round(article.price * 100 * 10000); // Convert to micro USDC
    const paidAmount = typeof paymentPayload.value === 'number'
      ? paymentPayload.value
      : parseInt(paymentPayload.value as unknown as string, 10);

    if (paidAmount < requiredAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient payment amount'
      });
    }

    // Verify payment timing if provided
    if (paymentPayload.validAfter && paymentPayload.validBefore) {
      const now = Math.floor(Date.now() / 1000);
      if (now < paymentPayload.validAfter || now > paymentPayload.validBefore) {
        return res.status(400).json({
          success: false,
          error: 'Payment authorization expired'
        });
      }
    }

    // Record successful payment
    const purchaseResponse = await recordArticlePurchase(articleId);

    // Track payment for this user
    await recordPayment(articleId, paymentPayload.from, article.price);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      receipt: `payment-${articleId}-${Date.now()}`,
      data: purchaseResponse
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
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

// Helper functions for payment verification

async function verifyPaymentSignature(paymentPayload: PaymentPayload): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Verify the signature against the authorization data
    // 2. Check that the signer is the same as the 'from' address
    // 3. Validate the signature format and cryptographic integrity
    
    // For demo purposes, we'll do basic validation
    const { signature, from, to, value } = paymentPayload;

    // Check required fields
    if (!signature || !from || !to || value === undefined || value === null) {
      return false;
    }

    // Check that signature looks like a valid hex string
    if (!/^0x[a-fA-F0-9]+$/.test(signature)) {
      return false;
    }

    // Check addresses format
    if (!/^0x[a-fA-F0-9]{40}$/.test(from) || 
        !/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return false;
    }

    // Basic value validation (micro USDC, must be positive integer)
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return false;
    }

    // In production, use a library like ethers.js to verify the signature:
    // const message = createEIP712Message(authorization);
    // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    // return recoveredAddress.toLowerCase() === authorization.from.toLowerCase();

    return true; // Demo validation passed
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

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
