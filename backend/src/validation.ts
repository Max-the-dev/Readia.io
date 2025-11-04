/**
 * Input Validation Schemas
 *
 * Uses Zod for runtime type checking and validation.
 * Prevents malformed data, type confusion, and injection attacks.
 */

import { z } from 'zod';

// ============================================
// ETHEREUM ADDRESS VALIDATION
// ============================================

/**
 * Ethereum address format: 0x followed by 40 hexadecimal characters
 */
const ethereumAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

// ============================================
// ARTICLE VALIDATION
// ============================================

/**
 * Categories: Must be array of predefined category strings
 * Total: 20 categories covering tech, business, lifestyle, and creative fields
 */
const categorySchema = z.enum([
  // Tech (5)
  'Technology',
  'AI & Machine Learning',
  'Web Development',
  'Crypto & Blockchain',
  'Security',
  // Business (4)
  'Business',
  'Startup',
  'Finance',
  'Marketing',
  // General Topics (11)
  'Science',
  'Health',
  'Education',
  'Politics',
  'Sports',
  'Entertainment',
  'Gaming',
  'Art & Design',
  'Travel',
  'Food',
  'Other'
]);

/**
 * Article Creation/Update Schema
 */
export const createArticleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .trim(),

  content: z.string()
    .min(50, 'Content must be at least 50 characters')
    .max(25000, 'Content must be 25,000 characters or less')
    .trim(),

  price: z.number()
    .min(0.01, 'Price must be at least $0.01')
    .max(1.00, 'Price must be $1.00 or less')
    .refine(val => Number.isFinite(val), 'Price must be a valid number'),

  authorAddress: ethereumAddressSchema,

  categories: z.array(categorySchema)
    .max(5, 'Maximum 5 categories allowed')
    .optional()
    .default([])
});

/**
 * Article Update Schema (allows partial updates)
 */
export const updateArticleSchema = createArticleSchema.partial().extend({
  authorAddress: ethereumAddressSchema, // Always required for auth
});

// ============================================
// DRAFT VALIDATION
// ============================================

/**
 * Draft Creation/Update Schema
 */
export const createDraftSchema = z.object({
  title: z.string()
    .max(200, 'Title must be 200 characters or less')
    .trim()
    .optional()
    .default(''),

  content: z.string()
    .max(25000, 'Content must be 25,000 characters or less')
    .trim()
    .optional()
    .default(''),

  price: z.number()
    .min(0.01, 'Price must be at least $0.01')
    .max(1.00, 'Price must be $1.00 or less')
    .optional()
    .default(0.05),

  authorAddress: ethereumAddressSchema,

  isAutoSave: z.boolean().optional().default(false)
});

// ============================================
// QUERY PARAMETER VALIDATION
// ============================================

/**
 * Article List Query Parameters
 */
const articleSortOptions = [
  'date',
  'publishDate',
  'title',
  'price',
  'earnings',
  'views',
  'likes',
  'purchases',
  'popularityScore'
] as const;

export const getArticlesQuerySchema = z.object({
  authorAddress: ethereumAddressSchema.optional(),

  search: z.string()
    .max(200, 'Search query too long')
    .trim()
    .optional(),

  sortBy: z.enum(articleSortOptions)
    .optional()
    .default('date'),

  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

/**
 * Article ID Parameter
 */
export const articleIdSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'Article ID must be a number')
    .transform(Number)
    .refine(val => val > 0, 'Article ID must be positive')
});

/**
 * Draft ID Parameter
 */
export const draftIdSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'Draft ID must be a number')
    .transform(Number)
    .refine(val => val > 0, 'Draft ID must be positive')
});

// ============================================
// LIKE/UNLIKE VALIDATION
// ============================================

/**
 * Like/Unlike Request Body
 */
export const likeRequestSchema = z.object({
  userAddress: ethereumAddressSchema
});

// ============================================
// PAYMENT VALIDATION
// ============================================

/**
 * x402 Payment Payload
 */
export const paymentPayloadSchema = z.object({
  from: ethereumAddressSchema,
  to: ethereumAddressSchema,
  value: z.number()
    .int('Payment value must be an integer')
    .positive('Payment value must be positive'),
  message: z.string().optional(),
  signature: z.string()
    .regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format')
});

/**
 * Verify Payment Request
 */
export const verifyPaymentSchema = z.object({
  paymentPayload: paymentPayloadSchema,
  articleId: z.number()
    .int('Article ID must be an integer')
    .positive('Article ID must be positive')
});

// ============================================
// DELETION VALIDATION
// ============================================

/**
 * Delete Article/Draft Request
 */
export const deleteRequestSchema = z.object({
  authorAddress: ethereumAddressSchema
});

// ============================================
// HELPER: VALIDATE MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware factory for validating request data with Zod schemas
 *
 * @param schema - Zod schema to validate against
 * @param source - Which part of request to validate ('body' | 'query' | 'params')
 * @returns Express middleware function
 */
export function validate(
  schema: z.ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);

      // Replace request data with validated (and transformed) data
      if (source === 'query' || source === 'params') {
        // For query and params, we need to merge because they're getter properties
        Object.assign(req[source], validated);
      } else {
        // For body, we can directly assign
        req[source] = validated;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors for client
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }

      // Unexpected error
      console.error('❌ Validation error (non-Zod):', error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}
