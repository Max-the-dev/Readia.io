import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, X, BookOpen, Tag } from 'lucide-react';
import { apiService, Article } from '../services/api';

function Explore() {
  // Utility function to strip HTML tags from preview text
  const stripHtmlTags = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  // Predefined categories
  const categories = [
    'All Articles',
    'Technology',
    'Crypto', 
    'AI & Machine Learning',
    'Web Development',
    'Blockchain',
    'Startup',
    'Business',
    'Finance',
    'Science',
    'Programming',
    'Design',
    'Marketing',
    'Productivity',
    'Security',
    'Data Science'
  ];

  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month
  const [sortBy, setSortBy] = useState('date'); // date, likes
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Articles');

  // Fetch articles on component mount
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await apiService.getArticles();
        if (response.success && response.data) {
          setArticles(response.data);
          setFilteredArticles(response.data);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // Filter and search articles
  useEffect(() => {
    let filtered = [...articles];

    // Category filter
    if (selectedCategory !== 'All Articles') {
      filtered = filtered.filter(article => 
        article.categories && article.categories.includes(selectedCategory)
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.preview.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Author filter
    if (authorFilter) {
      filtered = filtered.filter(article => 
        article.authorAddress.toLowerCase().includes(authorFilter.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }
      
      filtered = filtered.filter(article => 
        new Date(article.publishDate) >= filterDate
      );
    }

    // Sort articles
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      } else if (sortBy === 'likes') {
        // For now, sort by views as a proxy for popularity (we'll add likes later)
        return b.views - a.views;
      }
      return 0;
    });

    setFilteredArticles(filtered);
  }, [articles, searchTerm, authorFilter, dateFilter, sortBy, selectedCategory]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setAuthorFilter('');
    setDateFilter('all');
    setSortBy('date');
    setShowFilters(false);
    setSelectedCategory('All Articles');
  };

  return (
    <div className="explore-page">
      <div className="container">
        {/* Hero Section */}
        <div className="explore-hero">
          <div className="hero-icon">
            <BookOpen size={48} />
          </div>
          <h1>Explore Articles</h1>
          <p>Discover quality content from writers around the world. Pay only for what you read.</p>
        </div>

        {/* Main Content with Sidebar */}
        <div className="explore-content">
          {/* Categories Sidebar */}
          <div className="categories-sidebar">
            <div className="sidebar-header">
              <Tag size={20} />
              <h3>Categories</h3>
            </div>
            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-item ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                  {selectedCategory === category && (
                    <span className="selected-indicator">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="explore-main">
            {/* Search and Filter Section */}
            <div className="search-section">
              <div className="search-container">
                <div className="search-box">
                  <Search size={20} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search articles by title or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="clear-search">
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`filter-toggle ${showFilters ? 'active' : ''}`}
                >
                  <Filter size={18} />
                  Filters
                </button>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="filter-panel">
                  <div className="filter-row">
                    <div className="filter-group">
                      <label>Author (wallet address):</label>
                      <input
                        type="text"
                        placeholder="0x... or partial address"
                        value={authorFilter}
                        onChange={(e) => setAuthorFilter(e.target.value)}
                        className="filter-input"
                      />
                    </div>
                    
                    <div className="filter-group">
                      <label>Date:</label>
                      <select 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All time</option>
                        <option value="week">Last week</option>
                        <option value="month">Last month</option>
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Sort by:</label>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                      >
                        <option value="date">Latest</option>
                        <option value="likes">Most Popular</option>
                      </select>
                    </div>
                    
                    <div className="filter-actions">
                      <button onClick={clearFilters} className="clear-btn">
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Results count */}
              <div className="search-results-info">
                {searchTerm || authorFilter || dateFilter !== 'all' || selectedCategory !== 'All Articles' ? (
                  <p>Found {filteredArticles.length} articles</p>
                ) : (
                  <p>{filteredArticles.length} articles available</p>
                )}
              </div>
            </div>

            {/* Articles Grid */}
            <div className="explore-articles">
              {loading ? (
                <div className="loading-articles">
                  <p>Loading articles...</p>
                </div>
              ) : selectedCategory === 'All Articles' && !searchTerm && !authorFilter && dateFilter === 'all' ? (
                <div className="explore-prompt">
                  <div className="prompt-content">
                    <Search size={64} />
                    <h3>Discover Amazing Content</h3>
                    <p>Select a category from the sidebar or use the search to find articles that interest you.</p>
                    <div className="prompt-stats">
                      <span className="total-articles">{articles.length} articles waiting to be discovered</span>
                    </div>
                  </div>
                </div>
              ) : filteredArticles.length > 0 ? (
                <div className="article-grid">
                  {filteredArticles.map((article) => (
                    <Link key={article.id} to={`/article/${article.id}`} className="article-card-link">
                      <div className="article-card">
                        <h3>{article.title}</h3>
                        <p>{stripHtmlTags(article.preview)}</p>
                        <div className="article-meta">
                          <span className="price">${article.price.toFixed(2)}</span>
                          <div className="author-info">
                            <span className="author">by @{article.authorAddress.slice(0, 6)}...{article.authorAddress.slice(-4)}</span>
                            <span className="read-time">• {article.readTime}</span>
                          </div>
                        </div>
                        <div className="article-stats">
                          <span className="views">{article.views} views</span>
                          <span className="purchases">{article.purchases} readers</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="no-articles">
                  <div className="no-articles-content">
                    <Search size={48} />
                    <h3>No articles found</h3>
                    <p>Try adjusting your search terms or filters</p>
                    {(searchTerm || authorFilter || dateFilter !== 'all' || selectedCategory !== 'All Articles') && (
                      <button 
                        className="clear-filters-btn"
                        onClick={clearFilters}
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
    </div>
  );
}

export default Explore;