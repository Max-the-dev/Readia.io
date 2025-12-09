export type ContentType = 'X Thread' | 'X Post' | 'Video' | 'Article (Readia)';
export type Category = 'Token Launch' | 'Product Launch' | 'New Feature' | 'Partnership' | 'Airdrop' | 'Event';
export type BonusMetric = 'likes' | 'views' | 'retweets';
export type ReviewMode = 'auto' | 'manual';

export interface Quest {
  id: string;

  // Project Info
  projectName: string;
  xUrl: string;               // Required - derives projectHandle
  tokenTicker?: string;       // Optional (e.g., "$READ")
  websiteUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;

  // Quest Details
  title: string;
  description: string;
  contentType: ContentType;
  category: Category;
  keywords: string[];

  // Rewards
  payoutPerPost: number;      // In USD
  totalBudget: number;        // In USD
  budgetUsed: number;         // Tracked by system
  bonusAmount?: number;       // Optional
  bonusThreshold?: number;    // Optional
  bonusMetric?: BonusMetric;

  // Payout
  fundingWallet: string;

  // Timeline
  startDate: string;          // ISO date
  endDate: string;            // ISO date

  // Settings
  reviewMode: ReviewMode;

  // Stats (system-managed)
  submissionsCount: number;
  submissionsPaid: number;
}

// Helper to extract @handle from X URL
export function extractXHandle(xUrl: string): string {
  if (!xUrl) return '';
  const match = xUrl.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/);
  return match ? match[1] : '';
}

// Calculate progress percentage
export function calcProgress(used: number, total: number): number {
  return total > 0 ? Math.min((used / total) * 100, 100) : 0;
}
