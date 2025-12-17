// Backend types for Readia.io

// CAIP-2 network identifiers
export type SupportedAuthorNetwork =
  | 'eip155:8453'      // Base mainnet
  | 'eip155:84532'     // Base Sepolia
  | 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'  // Solana mainnet
  | 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Solana devnet

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

export interface AuthorWallet {
  id: string;
  authorUuid: string;
  address: string;
  network: SupportedAuthorNetwork;
  isPrimary: boolean;
  createdAt: string;
}

export interface Author {
  authorUuid?: string;
  address: string;
  primaryPayoutNetwork: SupportedAuthorNetwork;
  primaryPayoutAddress?: string;
  secondaryPayoutNetwork?: SupportedAuthorNetwork;
  secondaryPayoutAddress?: string;
  createdAt: string;
  totalEarnings: number;
  totalArticles: number;
  totalViews: number;
  totalPurchases: number;
  supportedNetworks?: SupportedAuthorNetwork[];
  wallets?: AuthorWallet[];
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
