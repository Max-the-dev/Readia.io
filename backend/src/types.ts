// Backend types for Penny.io

export interface Article {
  id: number;
  title: string;
  content: string;
  preview: string;
  price: number;
  authorAddress: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
  earnings: number;
  readTime: string;
}

export interface Author {
  address: string;
  displayName?: string;
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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GetArticlesQuery {
  authorAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'title' | 'price' | 'earnings' | 'views';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}