import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link } from 'react-router-dom';
import { DollarSign, Eye, Users, Edit3, LayoutDashboard, Search, Filter, X, Book, Trash2, Edit } from 'lucide-react';
import { isDateWithinRange, getRelativeTimeString } from '../utils/dateUtils';
import { apiService, Article, Author } from '../services/api';


function Dashboard() {
  const { isConnected, address, balance } = useWallet();
  
  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; article: Article | null }>({ show: false, article: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>('');
  
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
    setError('');
    
    try {
      const response = await apiService.getArticles({ 
        authorAddress: address,
        search: searchTerm,
        sortBy: sortBy as any,
        sortOrder: 'desc' // Always descending for dashboard
      });
      
      if (response.success && response.data) {
        setArticles(response.data);
      } else {
        setError(response.error || 'Failed to fetch articles');
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
      }
    } catch (err) {
      console.error('Error fetching author:', err);
    }
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
        setError(response.error || 'Failed to delete article');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting');
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
  };

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
            <a href="/write" className="write-new-btn">
              <Edit3 size={18} />
              Write New Article
            </a>
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
                    <option value="Technology">Technology</option>
                    <option value="Crypto">Crypto</option>
                    <option value="AI & Machine Learning">AI & Machine Learning</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Blockchain">Blockchain</option>
                    <option value="Startup">Startup</option>
                    <option value="Business">Business</option>
                    <option value="Finance">Finance</option>
                    <option value="Science">Science</option>
                    <option value="Programming">Programming</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Security">Security</option>
                    <option value="Data Science">Data Science</option>
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
