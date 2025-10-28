import express, { Request, Response } from 'express';
import Database from './database';
import { Article, Author, CreateArticleRequest, ApiResponse, GetArticlesQuery } from './types';

const router = express.Router();
const db = new Database();

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
router.get('/articles', async (req: Request, res: Response) => {
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
router.get('/articles/:id', async (req: Request, res: Response) => {
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
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const { title, content, price, authorAddress }: CreateArticleRequest = req.body;

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
      readTime
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
router.get('/authors/:address', async (req: Request, res: Response) => {
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

// POST /api/articles/:id/purchase - Record article purchase
router.post('/articles/:id/purchase', async (req: Request, res: Response) => {
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

    // Update article stats
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

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Purchase recorded successfully' }
    };

    res.json(response);
  } catch (error) {
    console.error('Error recording purchase:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to record purchase'
    };
    res.status(500).json(response);
  }
});

export default router;