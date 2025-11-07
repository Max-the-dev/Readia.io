import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PenTool, BookOpen, BookType } from 'lucide-react';
import { apiService, Article } from '../services/api';

// We'll fetch real articles from the backend instead of using mock data

function Home() {
  const benefits = [
    "Instant payouts",
    "You set the price", 
    "Access infinite resources",
    "No subscriptions needed",
    "Support creators directly",
    "Empower AI agents with knowledge"
  ];

  // Utility function to strip HTML tags from preview text
  const stripHtmlTags = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const [currentBenefit, setCurrentBenefit] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch articles on component mount
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await apiService.getArticles();
        if (response.success && response.data) {
          // Show first 6 articles for the home page
          setArticles(response.data.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    const currentText = benefits[currentBenefit];
    
    if (isTyping) {
      if (displayText.length < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (displayText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        setCurrentBenefit((prev) => (prev + 1) % benefits.length);
        setIsTyping(true);
      }
    }
  }, [displayText, isTyping, currentBenefit, benefits]);

  return (
    <div className="home">
      <div className="hero">
        <div className="hero-content">
          <div className="hero-meta">
            <span className="hero-powered-label">Powered by</span>
            <span className="hero-powered-brand">Coinbase x402</span>
          </div>
          <h1>Content Monetization Reimagined</h1>
          <p className="hero-subtitle">
            Pay only for what you read—no subscriptions, no ads. Support creators directly with instant payments.
          </p>
        </div>
      </div>
      
      <div className="typing-cta-section">
        <div className="typing-cta-wrapper">
          <div className="typing-cta-container">
            <div className="logo-section">
              <span className="typing-prefix"><BookType size={18}></BookType></span>
            </div>
            <div className="typing-text-box">
              <span className="typing-text">
                {displayText}
                <span className="cursor">|</span>
              </span>
            </div>
          </div>
          <Link to="/write" className="cta-simple-button">
            <PenTool size={18} />
            Start Writing
          </Link>
        </div>
      </div>
      
      <div className="featured-articles">
        <h2></h2>
        <h2>Recently Published</h2>
        <div className="article-grid">
          {loading ? (
            <div className="loading-articles">
              <p>Loading articles...</p>
            </div>
          ) : articles.length > 0 ? (
            articles.map((article) => (
              <div key={article.id} className="article-card">
                <Link to={`/article/${article.id}`} className="article-card-link">
                  <h3>{article.title}</h3>
                  <p>{stripHtmlTags(article.preview)}</p>
                </Link>
                <div className="article-meta">
                  <div className="author-info">
                    <span className="author">by @{article.authorAddress.slice(0, 6)}...{article.authorAddress.slice(-4)}</span>
                    <span className="read-time">• {article.readTime}</span>
                  </div>
                  <span className="price">${article.price.toFixed(2)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-articles">
              <p>No articles available yet. Be the first to write one!</p>
              <Link to="/write" className="write-first-btn">
                <PenTool size={18} />
                Write First Article
              </Link>
            </div>
          )}
        </div>
        
        {/* Explore All Articles Button */}
        <div className="explore-cta">
          <Link to="/explore" className="explore-button">
            <BookOpen size={20} />
            Explore All Articles
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
