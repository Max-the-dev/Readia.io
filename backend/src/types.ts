// Backend types for Penny.io

export interface Article {
  id: number;
  title: string;
  content: string;
  preview: string;
  price: number;
  authorAddress: string;
  authorPrimaryNetwork?: string;
  authorSecondaryNetwork?: string | null;
  authorSecondaryAddress?: string | null;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
  earnings: number;
  readTime: string;
  categories: string[];
  likes: number;
  popularityScore: number;
}

export interface Author {
  address: string;
  primaryPayoutNetwork: 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';
  secondaryPayoutNetwork?: 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';
  secondaryPayoutAddress?: string;
  createdAt: string;
  totalEarnings: number;
  totalArticles: number;
  totalViews: number;
  totalPurchases: number;
}

export interface CreateArticleRequest {
  title: string;
  content: string;
  price: number;
  authorAddress: string;
  categories: string[];
  draftId?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Draft {
  id: number;
  title: string;
  content: string;
  price: number;
  authorAddress: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  isAutoSave: boolean;
}

export interface CreateDraftRequest {
  title: string;
  content: string;
  price: number;
  authorAddress: string;
  isAutoSave?: boolean;
}

export interface GetArticlesQuery {
  authorAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'publishDate' | 'title' | 'price' | 'earnings' | 'views' | 'likes' | 'purchases' | 'popularityScore';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  categories?: string[];
}
