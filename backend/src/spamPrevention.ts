/**
 * Spam Prevention Utilities
 *
 * Detects spam articles, duplicate content, and bot-generated content.
 * Prevents platform abuse and maintains content quality.
 */

import { pgPool } from './supabaseClient';

// ============================================
// CONFIGURATION
// ============================================

const SPAM_CONFIG = {
  // Per-wallet rate limiting
  MAX_ARTICLES_PER_HOUR: 5,     // Increased from 3 - allow more during testing/active writing
  MAX_ARTICLES_PER_DAY: 20,     // Increased from 10 - reasonable daily limit for active authors

  // Content quality thresholds
  MIN_UNIQUE_WORDS: 50,
  MAX_REPETITION_RATIO: 0.65,   // Increased from 0.3 to 0.65 - most legitimate content has 40-60% repetition

  // Duplicate detection
  SIMILARITY_THRESHOLD: 0.85, // 85% similarity = duplicate

  // Pattern detection
  RAPID_SUBMISSION_WINDOW_MS: 60000, // 1 minute
  MAX_RAPID_SUBMISSIONS: 3,     // Increased from 2 - allow 3 rapid submissions (e.g., testing variations)
};

// ============================================
// SPAM DETECTION RESULTS
// ============================================

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
  details?: string;
}

// ============================================
// PER-WALLET RATE LIMITING
// ============================================

/**
 * Check if wallet has exceeded article creation limits
 */
export async function checkWalletRateLimit(authorAddress: string): Promise<SpamCheckResult> {
  try {
    // Check hourly limit
    const hourlyResult = await pgPool.query(
      `SELECT COUNT(*) as count FROM articles
       WHERE author_address = $1
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [authorAddress]
    );

    const hourlyCount = parseInt(hourlyResult.rows[0].count);

    if (hourlyCount >= SPAM_CONFIG.MAX_ARTICLES_PER_HOUR) {
      return {
        isSpam: true,
        reason: 'Rate limit exceeded',
        details: `Maximum ${SPAM_CONFIG.MAX_ARTICLES_PER_HOUR} articles per hour allowed`
      };
    }

    // Check daily limit
    const dailyResult = await pgPool.query(
      `SELECT COUNT(*) as count FROM articles
       WHERE author_address = $1
       AND created_at > NOW() - INTERVAL '1 day'`,
      [authorAddress]
    );

    const dailyCount = parseInt(dailyResult.rows[0].count);

    if (dailyCount >= SPAM_CONFIG.MAX_ARTICLES_PER_DAY) {
      return {
        isSpam: true,
        reason: 'Daily limit exceeded',
        details: `Maximum ${SPAM_CONFIG.MAX_ARTICLES_PER_DAY} articles per day allowed`
      };
    }

    return { isSpam: false };
  } catch (error) {
    console.error('Error checking wallet rate limit:', error);
    // Fail open - don't block legitimate users if check fails
    return { isSpam: false };
  }
}

// ============================================
// RAPID SUBMISSION DETECTION
// ============================================

/**
 * Detect rapid consecutive article submissions (bot behavior)
 */
export async function checkRapidSubmission(authorAddress: string): Promise<SpamCheckResult> {
  try {
    const result = await pgPool.query(
      `SELECT COUNT(*) as count FROM articles
       WHERE author_address = $1
       AND created_at > NOW() - INTERVAL '${SPAM_CONFIG.RAPID_SUBMISSION_WINDOW_MS} milliseconds'`,
      [authorAddress]
    );

    const recentCount = parseInt(result.rows[0].count);

    if (recentCount >= SPAM_CONFIG.MAX_RAPID_SUBMISSIONS) {
      return {
        isSpam: true,
        reason: 'Rapid submission detected',
        details: `Please wait a minute between article submissions`
      };
    }

    return { isSpam: false };
  } catch (error) {
    console.error('Error checking rapid submission:', error);
    return { isSpam: false };
  }
}

// ============================================
// DUPLICATE CONTENT DETECTION
// ============================================

/**
 * Calculate similarity between two strings using Jaccard similarity
 * (simpler and faster than Levenshtein for long texts)
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) =>
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2); // Ignore short words

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  // Jaccard similarity: |intersection| / |union|
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check if article content is too similar to author's existing articles
 */
export async function checkDuplicateContent(
  authorAddress: string,
  title: string,
  content: string
): Promise<SpamCheckResult> {
  try {
    // Get author's recent articles (last 30 days)
    const result = await pgPool.query(
      `SELECT title, content FROM articles
       WHERE author_address = $1
       AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC
       LIMIT 20`,
      [authorAddress]
    );

    const existingArticles = result.rows;

    // Check similarity against each existing article
    for (const existing of existingArticles) {
      const titleSimilarity = calculateSimilarity(title, existing.title);
      const contentSimilarity = calculateSimilarity(content, existing.content);

      // If either title or content is too similar, flag as duplicate
      if (titleSimilarity >= SPAM_CONFIG.SIMILARITY_THRESHOLD) {
        return {
          isSpam: true,
          reason: 'Duplicate content detected',
          details: 'An article with a very similar title already exists'
        };
      }

      if (contentSimilarity >= SPAM_CONFIG.SIMILARITY_THRESHOLD) {
        return {
          isSpam: true,
          reason: 'Duplicate content detected',
          details: 'An article with very similar content already exists'
        };
      }
    }

    return { isSpam: false };
  } catch (error) {
    console.error('Error checking duplicate content:', error);
    return { isSpam: false };
  }
}

// ============================================
// CONTENT QUALITY VALIDATION
// ============================================

/**
 * Detect low-quality content (gibberish, excessive repetition, etc.)
 */
export function checkContentQuality(content: string): SpamCheckResult {
  // Normalize content (remove HTML tags, extra whitespace)
  const normalizedContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalizedContent.split(/\s+/).filter(word => word.length > 0);
  const uniqueWords = new Set(words.map(word => word.toLowerCase()));

  // Check 1: Minimum unique words
  if (uniqueWords.size < SPAM_CONFIG.MIN_UNIQUE_WORDS) {
    return {
      isSpam: true,
      reason: 'Low content quality',
      details: `Content must contain at least ${SPAM_CONFIG.MIN_UNIQUE_WORDS} unique words`
    };
  }

  // Check 2: Excessive repetition
  const repetitionRatio = 1 - (uniqueWords.size / words.length);

  if (repetitionRatio > SPAM_CONFIG.MAX_REPETITION_RATIO) {
    return {
      isSpam: true,
      reason: 'Excessive repetition detected',
      details: 'Content contains too many repeated words or phrases'
    };
  }

  // Check 3: Detect gibberish (too many words without vowels)
  const wordsWithoutVowels = [...uniqueWords].filter(
    word => word.length > 3 && !/[aeiou]/i.test(word)
  );

  const gibberishRatio = wordsWithoutVowels.length / uniqueWords.size;

  if (gibberishRatio > 0.3) {
    return {
      isSpam: true,
      reason: 'Suspicious content pattern',
      details: 'Content appears to contain gibberish or invalid text'
    };
  }

  return { isSpam: false };
}

// ============================================
// COMPREHENSIVE SPAM CHECK
// ============================================

/**
 * Run all spam detection checks on article submission
 */
export async function checkForSpam(
  authorAddress: string,
  title: string,
  content: string
): Promise<SpamCheckResult> {
  // Check 1: Content quality (fast, synchronous)
  const qualityCheck = checkContentQuality(content);
  if (qualityCheck.isSpam) {
    return qualityCheck;
  }

  // Check 2: Wallet rate limiting
  const rateLimitCheck = await checkWalletRateLimit(authorAddress);
  if (rateLimitCheck.isSpam) {
    return rateLimitCheck;
  }

  // Check 3: Rapid submission detection
  const rapidCheck = await checkRapidSubmission(authorAddress);
  if (rapidCheck.isSpam) {
    return rapidCheck;
  }

  // Check 4: Duplicate content detection
  const duplicateCheck = await checkDuplicateContent(authorAddress, title, content);
  if (duplicateCheck.isSpam) {
    return duplicateCheck;
  }

  // All checks passed
  return { isSpam: false };
}
