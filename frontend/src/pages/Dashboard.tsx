import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, Eye, Users, Edit3, LayoutDashboard, Search, Filter, X, Book, Trash2, Edit, FileText, Clock } from 'lucide-react';
import { isDateWithinRange, getRelativeTimeString } from '../utils/dateUtils';
import { apiService, Article, Author, Draft } from '../services/api';


function Dashboard() {
  const { isConnected, address, balance } = useWallet();
  const navigate = useNavigate();

  // Available categories (must match backend validation schema)
  const availableCategories = [
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
  ];

  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; article: Article | null }>({ show: false, article: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [articleError, setArticleError] = useState<string>('');
  const [authorError, setAuthorError] = useState<string>('');
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState('');
  const [draftDeleteId, setDraftDeleteId] = useState<number | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, title, price, earnings, views
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month, quarter
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, or specific category

  // Fetch articles and author data on component mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchArticles();
      fetchAuthor();
    } else {
      setArticles([]);
      setAuthor(null);
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchArticles = async () => {
    if (!address) return;
    
    setLoading(true);
    setArticleError('');
    
    try {
      const response = await apiService.getArticles({ 
        authorAddress: address,
        search: searchTerm,
        sortBy: sortBy as any,
        sortOrder: 'desc' // Always descending for dashboard
      });
      
      if (response.success && response.data) {
        setArticles(response.data);
        setArticleError('');
      } else {
        // API returned error response - show specific error
        const friendlyError = response.error === 'Failed to fetch'
          ? 'Failed to fetch articles'
          : response.error;
        setArticleError(friendlyError || 'An unexpected error occurred');
      }
    } catch (err) {
      // Network error or exception - show generic message
      if (err instanceof Error && err.message && err.message !== 'Failed to fetch') {
        setArticleError(err.message);
      } else {
        setArticleError('Failed to fetch articles');
      }
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthor = async () => {
    if (!address) return;
    
    try {
      const response = await apiService.getAuthor(address);
      if (response.success && response.data) {
        setAuthor(response.data);
        setAuthorError('');
      } else {
        const friendlyError = response.error === 'Failed to fetch'
          ? 'Failed to fetch author stats'
          : response.error;
        setAuthorError(prev => prev || friendlyError || 'Failed to fetch author stats');
      }
    } catch (err) {
      const fallbackMessage = err instanceof Error && err.message && err.message !== 'Failed to fetch'
        ? err.message
        : 'Failed to fetch author stats';
      setAuthorError(prev => prev || fallbackMessage);
      console.error('Error fetching author:', err);
    }
  };

  const loadDraftsForModal = async () => {
    if (!address) return;

    setDraftsLoading(true);
    setDraftsError('');

    try {
      const response = await apiService.getDrafts(address);
      if (response.success && response.data) {
        setDrafts(response.data);
      } else {
        setDrafts([]);
        setDraftsError(response.error || 'Failed to load drafts');
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Failed to load drafts';
      setDrafts([]);
      setDraftsError(message);
      console.error('Error fetching drafts:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const openDraftsModal = async () => {
    if (!address) return;
    setShowDraftsModal(true);
    await loadDraftsForModal();
  };

  const closeDraftsModal = () => {
    setShowDraftsModal(false);
    setDraftsError('');
    setDraftDeleteId(null);
  };

  const handleDraftEdit = (draft: Draft) => {
    setShowDraftsModal(false);
    navigate(`/write?draftId=${draft.id}`);
  };

  const handleDraftPublish = (draft: Draft) => {
    setShowDraftsModal(false);
    navigate(`/write?draftId=${draft.id}&action=publish`);
  };

  const handleDraftDelete = async (draft: Draft) => {
    if (!address) return;

    setDraftDeleteId(draft.id);
    try {
      const response = await apiService.deleteDraft(draft.id, address);
      if (response.success) {
        setDrafts(prev => {
          const next = prev.filter(d => d.id !== draft.id);
          if (next.length === 0) {
            setDraftsError('');
          }
          return next;
        });
      } else {
        setDraftsError(response.error || 'Failed to delete draft');
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Failed to delete draft';
      setDraftsError(message);
      console.error('Error deleting draft:', err);
    } finally {
      setDraftDeleteId(null);
    }
  };

  const getDraftPreview = (html: string) => {
    if (!html) return 'No content yet';
    const text = html.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (!text) return 'No content yet';
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  };

  // Delete article handler
  const handleDeleteArticle = async (article: Article) => {
    if (!address) return;
    
    setIsDeleting(true);
    try {
      const response = await apiService.deleteArticle(article.id, address);
      if (response.success) {
        // Remove article from local state
        setArticles(prev => prev.filter(a => a.id !== article.id));
        setDeleteConfirm({ show: false, article: null });
        // Refresh author data to ensure lifetime totals are current
        fetchAuthor();
        // Show success message or notification here if needed
      } else {
        setArticleError(response.error || 'Failed to delete article');
      }
    } catch (err) {
      setArticleError('An unexpected error occurred while deleting');
      console.error('Error deleting article:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Refetch when search/sort changes
  useEffect(() => {
    if (isConnected && address) {
      const timeoutId = setTimeout(() => {
        fetchArticles();
      }, 300); // Debounce search
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, sortBy]);

  // Filter articles by date and category (client-side filtering)
  const filteredArticles = articles.filter(article => {
    // Date filter
    if (dateFilter !== 'all') {
      if (!isDateWithinRange(article.publishDate, dateFilter as 'week' | 'month' | 'quarter')) {
        return false;
      }
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      if (!article.categories || !article.categories.includes(categoryFilter)) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate stats from author data (lifetime totals) and current articles (for average)
  const stats = {
    totalEarnings: author?.totalEarnings || 0,
    totalArticles: author?.totalArticles || 0,
    totalViews: author?.totalViews || 0,
    totalPurchases: author?.totalPurchases || 0,
    avgEarningsPerArticle: (author?.totalArticles || 0) > 0 
      ? (author?.totalEarnings || 0) / (author?.totalArticles || 0)
      : 0
  };

  // Clear search and filters function
  const clearSearch = () => {
    setSearchTerm('');
    setSortBy('date');
    setDateFilter('all');
    setCategoryFilter('all');
    setShowFilters(false);
    setArticleError('');
  };

  const error = articleError || authorError;

  if (!isConnected) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="connect-prompt">
            <h1>Connect Your Wallet</h1>
            <p>Connect your wallet to access your writer dashboard.</p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1> <LayoutDashboard size={25}/> Writer Dashboard</h1>
          <div className="wallet-info">
            <p><strong>Address:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            <p><strong>Balance:</strong> {balance}</p>
          </div>
        </div>
        
        {/* Main Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Earnings</h3>
              <p className="stat-value">${stats.totalEarnings.toFixed(2)}</p>
              <span className="stat-change">From {stats.totalArticles} articles</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Edit3 size={24} />
            </div>
            <div className="stat-content">
              <h3>Articles Published</h3>
              <p className="stat-value">{stats.totalArticles}</p>
              <span className="stat-change">Avg. ${stats.avgEarningsPerArticle.toFixed(2)} per article</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Eye size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Views</h3>
              <p className="stat-value">{stats.totalViews.toLocaleString()}</p>
              <span className="stat-change">{stats.totalViews > 0 ? ((stats.totalPurchases / stats.totalViews) * 100).toFixed(1) : '0'}% conversion rate</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Purchases</h3>
              <p className="stat-value">{stats.totalPurchases}</p>
              <span className="stat-change">{stats.totalViews > 0 ? ((stats.totalPurchases / stats.totalViews) * 100).toFixed(1) : '0'}% of viewers</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={fetchArticles} className="retry-btn">Try Again</button>
          </div>
        )}

        {/* Articles List */}
        <div className="articles-section">
          <div className="articles-header">
            <h2><Book size={20} />Your Articles</h2>
            <div className="articles-header-actions">
              <button
                type="button"
                onClick={openDraftsModal}
                className="view-drafts-btn"
                disabled={draftsLoading && showDraftsModal}
              >
                <FileText size={18} />
                {draftsLoading && showDraftsModal ? 'Loading Drafts...' : 'View Drafts'}
              </button>
              <Link to="/write" className="write-new-btn">
                <Edit3 size={18} />
                Write New Article
              </Link>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="articles-controls">
            <div className="search-container">
              <div className="search-icon-section">
                <Search size={18} />
              </div>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your articles..."
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search-btn"
                    onClick={clearSearch}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="filter-container">
              <button 
                className={`filter-button ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="filter-panel">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Sort by:</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select"
                  >
                    <option value="date">Latest First</option>
                    <option value="title">Title A-Z</option>
                    <option value="price">Price (High to Low)</option>
                    <option value="earnings">Earnings (High to Low)</option>
                    <option value="views">Most Viewed</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Date range:</label>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All time</option>
                    <option value="week">Last week</option>
                    <option value="month">Last month</option>
                    <option value="quarter">Last 3 months</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Category:</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-separator"></div>
                
                <div className="filter-group" style={{minWidth: 'auto'}}>
                  <button 
                    className="clear-filters-btn"
                    onClick={clearSearch}
                    style={{marginTop: 'auto'}}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="articles-table">
            <div className="table-header">
              <div className="table-cell">Article</div>
              <div className="table-cell">Published</div>
              <div className="table-cell">Price</div>
              <div className="table-cell">Views</div>
              <div className="table-cell">Readers</div>
              <div className="table-cell">Earnings</div>
              <div className="table-cell">Rate</div>
              <div className="table-cell">Actions</div>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <p>Loading your articles...</p>
              </div>
            ) : filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <div key={article.id} className="table-row">
                  <div className="table-cell article-info">
                    <Link to={`/article/${article.id}`} className="article-title-link">
                      <div className="article-title">{article.title}</div>
                    </Link>
                    <div className="article-meta">{article.readTime} read</div>
                  </div>
                  <div className="table-cell">
                    <div className="date-info">
                      <div className="date-primary">{new Date(article.publishDate).toLocaleDateString()}</div>
                      <div className="date-relative">{getRelativeTimeString(article.publishDate)}</div>
                    </div>
                  </div>
                  <div className="table-cell">
                    ${article.price.toFixed(2)}
                  </div>
                  <div className="table-cell">
                    {article.views.toLocaleString()}
                  </div>
                  <div className="table-cell">
                    {article.purchases}
                  </div>
                  <div className="table-cell earnings">
                    ${article.earnings.toFixed(2)}
                  </div>
                  <div className="table-cell">
                    {/* Calculate conversion rate. Display 0 if none */}
                    {article.views > 0 ? ((article.purchases / article.views) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="table-cell actions">
                    <Link to={`/edit/${article.id}`} className="action-btn edit-btn" title="Edit article">
                      <Edit size={12} />
                    </Link>
                    <button 
                      onClick={() => setDeleteConfirm({ show: true, article })}
                      className="action-btn delete-btn" 
                      title="Delete article"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <div className="no-results-content">
                  <Search size={48} />
                  <h3>No articles found</h3>
                  <p>Try adjusting your search terms or filters</p>
                  {(searchTerm || dateFilter !== 'all' || categoryFilter !== 'all') && (
                    <button 
                      className="clear-filters-btn"
                      onClick={clearSearch}
                    >
                      Clear search and filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDraftsModal && (
        <div className="modal-overlay">
          <div className="drafts-modal" role="dialog" aria-modal="true" aria-labelledby="drafts-modal-title">
            <div className="drafts-modal-header">
              <h3 id="drafts-modal-title">Saved Drafts</h3>
              <button 
                type="button"
                onClick={closeDraftsModal}
                className="close-btn"
                aria-label="Close drafts modal"
              >
                ×
              </button>
            </div>
            <p className="drafts-modal-subtitle">Access drafts saved from the editor. Drafts automatically expire after 7 days.</p>
            <div className="drafts-modal-content">
              {draftsLoading ? (
                <div className="drafts-modal-loading">Loading drafts...</div>
              ) : draftsError ? (
                <div className="drafts-modal-error">❌ {draftsError}</div>
              ) : drafts.length === 0 ? (
                <div className="drafts-modal-empty">
                  <FileText size={36} />
                  <p>No drafts available</p>
                  <span>Drafts you save from the editor will appear here.</span>
                </div>
              ) : (
                <div className="drafts-list">
                  {drafts.map(draft => (
                    <div key={draft.id} className="drafts-item">
                      <div className="drafts-item-main">
                        <h4>{draft.title || 'Untitled Draft'}</h4>
                        <p className="drafts-item-preview">{getDraftPreview(draft.content)}</p>
                        <div className="drafts-item-meta">
                          <span className="drafts-item-meta-entry">
                            <Clock size={14} />
                            Updated {getRelativeTimeString(draft.updatedAt)}
                          </span>
                          <span className="drafts-item-meta-entry price">
                            ${draft.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="drafts-item-actions">
                        <button
                          type="button"
                          className="drafts-action edit"
                          onClick={() => handleDraftEdit(draft)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="drafts-action publish"
                          onClick={() => handleDraftPublish(draft)}
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          className="drafts-action delete"
                          onClick={() => handleDraftDelete(draft)}
                          disabled={draftDeleteId === draft.id}
                        >
                          {draftDeleteId === draft.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
        {deleteConfirm.show && deleteConfirm.article && (
          <div className="modal-overlay">
            <div className="confirm-modal">
              <h3>Delete Article</h3>
              <p>Are you sure you want to delete "<strong>{deleteConfirm.article.title}</strong>"?</p>
              <p className="warning-text">This action cannot be undone.</p>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setDeleteConfirm({ show: false, article: null })}
                  className="secondary-btn"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteArticle(deleteConfirm.article!)}
                  className="delete-confirm-btn"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Article'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default Dashboard;
