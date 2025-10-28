import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link } from 'react-router-dom';
import { DollarSign, Eye, Users, Edit3, LayoutDashboard, Search, Filter, X } from 'lucide-react';
import { getDateDaysAgo, isDateWithinRange, getRelativeTimeString } from '../utils/dateUtils';
import { apiService, Article } from '../services/api';

// Mock analytics data - function to create articles based on connected address
const createMockArticles = (userAddress: string | undefined) => [
  {
    id: 4,
    title: "Getting Started with Penny.io: A Writer's Guide",
    publishDate: getDateDaysAgo(1), // Yesterday
    price: 0.05,
    views: 234,
    purchases: 23,
    earnings: 1.15,
    readTime: "4 min",
    authorAddress: userAddress || "0x0000000000000000000000000000000000000000"
  },
  {
    id: 1,
    title: "Building Scalable Web3 Applications with x402 Protocol",
    publishDate: getDateDaysAgo(3), // 3 days ago
    price: 0.12,
    views: 1247,
    purchases: 89,
    earnings: 10.68,
    readTime: "8 min"
  },
  {
    id: 2,
    title: "The Future of Creator Economy: Beyond Subscriptions",
    publishDate: getDateDaysAgo(5), // 5 days ago
    price: 0.08,
    views: 892,
    purchases: 156,
    earnings: 12.48,
    readTime: "6 min"
  },
  {
    id: 3,
    title: "Smart Contract Security Best Practices in 2025",
    publishDate: getDateDaysAgo(14), // 2 weeks ago
    price: 0.15,
    views: 2108,
    purchases: 203,
    earnings: 30.45,
    readTime: "12 min"
  }
];

const mockStats = {
  totalEarnings: 54.76,
  totalArticles: 4,
  totalViews: 4481,
  totalPurchases: 471,
  conversionRate: 10.5,
  thisMonthEarnings: 25.28,
  lastMonthEarnings: 29.48,
  avgEarningsPerArticle: 13.69
};

function Dashboard() {
  const { isConnected, address, balance } = useWallet();
  
  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, title, price, earnings, views
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month, quarter

  // Fetch articles on component mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchArticles();
    } else {
      setArticles([]);
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
        sortOrder: sortOrder as any
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

  // Refetch when search/filter changes
  useEffect(() => {
    if (isConnected && address) {
      const timeoutId = setTimeout(() => {
        fetchArticles();
      }, 300); // Debounce search
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, sortBy, sortOrder]);

  // Filter articles by date (client-side filtering for date ranges)
  const filteredAndSortedArticles = articles.filter(article => {
    if (dateFilter !== 'all') {
      return isDateWithinRange(article.publishDate, dateFilter as 'week' | 'month' | 'quarter');
    }
    return true;
  });

  // Calculate stats from real articles
  const stats = {
    totalEarnings: filteredAndSortedArticles.reduce((sum, article) => sum + article.earnings, 0),
    totalArticles: filteredAndSortedArticles.length,
    totalViews: filteredAndSortedArticles.reduce((sum, article) => sum + article.views, 0),
    totalPurchases: filteredAndSortedArticles.reduce((sum, article) => sum + article.purchases, 0),
    avgEarningsPerArticle: filteredAndSortedArticles.length > 0 
      ? filteredAndSortedArticles.reduce((sum, article) => sum + article.earnings, 0) / filteredAndSortedArticles.length 
      : 0
  };

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
    setSortBy('date');
    setSortOrder('desc');
    setDateFilter('all');
    setShowFilters(false);
  };

  if (!isConnected) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="connect-prompt">
            <h1>Connect Your Wallet</h1>
            <p>Connect your wallet to access your writer dashboard and start earning from your content.</p>
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
            <h2>Your Articles</h2>
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
                Filter
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="filter-panel">
              <div className="filter-group">
                <label>Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="price">Price</option>
                  <option value="earnings">Earnings</option>
                  <option value="views">Views</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Order:</label>
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="filter-select"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
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
              
              <div className="filter-actions">
                <button 
                  className="clear-filters-btn"
                  onClick={clearSearch}
                >
                  Clear all
                </button>
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
            </div>
            
            {loading ? (
              <div className="loading-state">
                <p>Loading your articles...</p>
              </div>
            ) : filteredAndSortedArticles.length > 0 ? (
              filteredAndSortedArticles.map((article) => (
                <Link key={article.id} to={`/article/${article.id}`} className="table-row-link">
                  <div className="table-row">
                    <div className="table-cell article-info">
                      <div className="article-title">{article.title}</div>
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
                      {((article.purchases / article.views) * 100).toFixed(1)}%
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="no-results">
                <div className="no-results-content">
                  <Search size={48} />
                  <h3>No articles found</h3>
                  <p>Try adjusting your search terms or filters</p>
                  {(searchTerm || dateFilter !== 'all') && (
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
    </div>
  );
}

export default Dashboard;