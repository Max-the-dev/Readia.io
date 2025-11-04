// API service for communicating with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export interface Author {
  address: string;
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

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
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
    return this.request<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    });
  }

  async updateArticle(id: number, article: CreateArticleRequest): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(article),
    });
  }

  async deleteArticle(id: number, authorAddress: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/articles/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ authorAddress }),
    });
  }

  async recordPurchase(articleId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/articles/${articleId}/purchase`, {
      method: 'POST',
    });
  }

  // Author endpoints
  async getAuthor(address: string): Promise<ApiResponse<Author>> {
    return this.request<Author>(`/authors/${address}`);
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
    return this.request<{ message: string; liked: boolean }>(`/articles/${articleId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userAddress }),
    });
  }

  async unlikeArticle(articleId: number, userAddress: string): Promise<ApiResponse<{ message: string; liked: boolean }>> {
    return this.request<{ message: string; liked: boolean }>(`/articles/${articleId}/like`, {
      method: 'DELETE',
      body: JSON.stringify({ userAddress }),
    });
  }

  async checkUserLikedArticle(articleId: number, userAddress: string): Promise<ApiResponse<{ liked: boolean }>> {
    return this.request<{ liked: boolean }>(`/articles/${articleId}/like-status/${userAddress}`);
  }

  // Draft endpoints
  async saveDraft(draft: CreateDraftRequest): Promise<ApiResponse<Draft>> {
    return this.request<Draft>('/drafts', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async getDrafts(authorAddress: string): Promise<ApiResponse<Draft[]>> {
    return this.request<Draft[]>(`/drafts/${authorAddress}`);
  }

  async deleteDraft(draftId: number, authorAddress: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/drafts/${draftId}`, {
      method: 'DELETE',
      body: JSON.stringify({ authorAddress }),
    });
  }

}

export const apiService = new ApiService();
export default apiService;
