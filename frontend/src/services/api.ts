// API service for communicating with the backend

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  categories: string[];
  likes: number;
  popularityScore?: number;
}

// CAIP-2 network identifiers (must match backend)
export type SupportedAuthorNetwork =
  | 'eip155:8453'      // Base mainnet
  | 'eip155:84532'     // Base Sepolia
  | 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'  // Solana mainnet
  | 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Solana devnet

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
  createdAt: string;
  totalEarnings: number;
  totalArticles: number;
  totalViews: number;
  totalPurchases: number;
  primaryPayoutNetwork?: SupportedAuthorNetwork;
  primaryPayoutAddress?: string;
  secondaryPayoutNetwork?: SupportedAuthorNetwork;
  secondaryPayoutAddress?: string;
  supportedNetworks?: SupportedAuthorNetwork[];
  wallets?: AuthorWallet[];
}

interface AuthorPurchaseStatsResponse {
  purchases7d: number;
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

export interface UserArticleMeta {
  id: number;
  title: string;
  preview: string;
  categories: string[];
  authorAddress: string;
  publishDate: string;
  lastReadAt?: string;
  favoritedAt?: string;
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
  search?: string;
  sortBy?: 'date' | 'publishDate' | 'title' | 'price' | 'earnings' | 'views' | 'likes' | 'purchases' | 'popularityScore';
  sortOrder?: 'asc' | 'desc';
  categories?: string[];
}

export interface AuthorStats {
  purchases7d: number;
}

type AuthHeaderProvider = () => Record<string, string> | null | undefined;

class ApiService {
  private authHeaderProvider: AuthHeaderProvider | null = null;

  setAuthHeaderProvider(provider: AuthHeaderProvider | null) {
    this.authHeaderProvider = provider;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      const headers: Record<string, string> = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string> | undefined),
      };

      if (requireAuth) {
        const authHeaders = this.authHeaderProvider?.();
        if (!authHeaders || !authHeaders.Authorization) {
          return {
            success: false,
            error: 'AUTH_REQUIRED',
          } as ApiResponse<T>;
        }
        Object.assign(headers, authHeaders);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data.error || `HTTP error! status: ${response.status}`;
        // If we got a 401, surface a structured error so the auth context can react
        if (response.status === 401) {
          throw Object.assign(new Error(error), { code: 'AUTH_401' });
        }
        throw new Error(error);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Article endpoints
  async getArticles(query: GetArticlesQuery = {}): Promise<ApiResponse<Article[]>> {
    const params = new URLSearchParams();
    
    if (query.authorAddress) params.append('authorAddress', query.authorAddress);
    if (query.search) params.append('search', query.search);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    if (query.categories && query.categories.length > 0) {
      query.categories.forEach(category => params.append('categories', category));
    }

    const queryString = params.toString();
    const endpoint = `/articles${queryString ? `?${queryString}` : ''}`;

    return this.request<Article[]>(endpoint);
  }

  async getArticleById(id: number): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${id}`);
  }

  async createArticle(article: CreateArticleRequest): Promise<ApiResponse<Article>> {
    return this.request<Article>(
      '/articles',
      {
        method: 'POST',
        body: JSON.stringify(article),
      },
      true
    );
  }

  async validateArticle(article: CreateArticleRequest): Promise<ApiResponse<{ message?: string }>> {
    return this.request<{ message?: string }>(
      '/articles/validate',
      {
        method: 'POST',
        body: JSON.stringify(article),
      },
      true
    );
  }

  async updateArticle(id: number, article: CreateArticleRequest): Promise<ApiResponse<Article>> {
    return this.request<Article>(
      `/articles/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(article),
      },
      true
    );
  }

  async deleteArticle(id: number, authorAddress: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      `/articles/${id}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ authorAddress }),
      },
      true
    );
  }

  async canEditArticle(articleId: number, userAddress: string): Promise<ApiResponse<{ canEdit: boolean }>> {
    return this.request<{ canEdit: boolean }>(
      `/articles/${articleId}/can-edit/${userAddress}`,
      undefined,
      false
    );
  }

  async recordPurchase(articleId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/articles/${articleId}/purchase`, {
      method: 'POST',
    });
  }

  // Author endpoints
  async getAuthor(address: string): Promise<ApiResponse<Author>> {
    return this.request<Author>(`/authors/${address}`, undefined, true);
  }

  async getPublicAuthor(identifier: string): Promise<ApiResponse<Author>> {
    return this.request<Author>(`/public/authors/${identifier}`);
  }

  async getAuthorPurchaseStats(address: string): Promise<ApiResponse<AuthorPurchaseStatsResponse>> {
    return this.request<AuthorPurchaseStatsResponse>(`/authors/${address}/stats`, undefined, true);
  }

  async addSecondaryPayoutMethod(
    address: string,
    payload: { network: SupportedAuthorNetwork; payoutAddress: string }
  ): Promise<ApiResponse<Author>> {
    return this.request<Author>(
      `/authors/${address}/payout-methods`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true
    );
  }

  async removeSecondaryPayoutMethod(
    address: string,
    network: SupportedAuthorNetwork
  ): Promise<ApiResponse<Author>> {
    return this.request<Author>(
      `/authors/${address}/payout-methods`,
      {
        method: 'DELETE',
        body: JSON.stringify({ network }),
      },
      true
    );
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ message: string; timestamp: string; version: string }>> {
    return this.request<{ message: string; timestamp: string; version: string }>('/health');
  }

  // Increment Article Views 
  async incrementArticleViews(articleId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/articles/${articleId}/view`, {
      method: 'PUT'
    });
  }

  // Like/Unlike Article
  async likeArticle(articleId: number, userAddress: string): Promise<ApiResponse<{ message: string; liked: boolean }>> {
    return this.request<{ message: string; liked: boolean }>(
      `/articles/${articleId}/like`,
      {
        method: 'POST',
        body: JSON.stringify({ userAddress }),
      },
      true
    );
  }

  async unlikeArticle(articleId: number, userAddress: string): Promise<ApiResponse<{ message: string; liked: boolean }>> {
    return this.request<{ message: string; liked: boolean }>(
      `/articles/${articleId}/like`,
      {
        method: 'DELETE',
        body: JSON.stringify({ userAddress }),
      },
      true
    );
  }

  async checkUserLikedArticle(articleId: number, userAddress: string): Promise<ApiResponse<{ liked: boolean }>> {
    return this.request<{ liked: boolean }>(`/articles/${articleId}/like-status/${userAddress}`);
  }

  // Draft endpoints
  async saveDraft(
    draft: CreateDraftRequest,
    options: { signal?: AbortSignal } = {}
  ): Promise<ApiResponse<Draft>> {
    return this.request<Draft>(
      '/drafts',
      {
        method: 'POST',
        body: JSON.stringify(draft),
        signal: options.signal,
      },
      true
    );
  }

  async getDrafts(authorAddress: string): Promise<ApiResponse<Draft[]>> {
    return this.request<Draft[]>(`/drafts/${authorAddress}`, { method: 'GET' }, true);
  }

  async deleteDraft(draftId: number, authorAddress: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      `/drafts/${draftId}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ authorAddress }),
      },
      true
    );
  }

  // Reading history / favorites (auth required)
  async recordHistory(articleId: number): Promise<ApiResponse<null>> {
    return this.request<null>(
      '/users/me/history',
      {
        method: 'POST',
        body: JSON.stringify({ articleId }),
      },
      true
    );
  }

  async getHistory(limit = 20): Promise<ApiResponse<UserArticleMeta[]>> {
    return this.request<UserArticleMeta[]>(
      `/users/me/history?limit=${Math.min(limit, 20)}`,
      {},
      true
    );
  }

  async setFavorite(articleId: number, favorite: boolean): Promise<ApiResponse<null>> {
    return this.request<null>(
      '/users/me/favorites',
      {
        method: 'POST',
        body: JSON.stringify({ articleId, favorite }),
      },
      true
    );
  }

  async getFavorites(limit = 20): Promise<ApiResponse<UserArticleMeta[]>> {
    return this.request<UserArticleMeta[]>(
      `/users/me/favorites?limit=${Math.min(limit, 20)}`,
      {},
      true
    );
  }

  async getFavoriteStatus(articleId: number): Promise<ApiResponse<{ isFavorited: boolean }>> {
    return this.request<{ isFavorited: boolean }>(
      `/users/me/favorites/${articleId}/status`,
      {},
      true
    );
  }

}



export const apiService = new ApiService();
export default apiService;
