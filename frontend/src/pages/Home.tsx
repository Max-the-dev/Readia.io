import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PenTool, BookOpen, Copy, Vote, Coins, Sparkles, Rocket, Check } from 'lucide-react';
import { apiService, Article } from '../services/api';

// We'll fetch real articles from the backend instead of using mock data

function Home() {
  const benefits = [
    "Instant payouts",
    "Support creators directly",
    "You set the price", 
    "Pay only for what you read",
    "No subscriptions",
    "No ads",
    "No middlemen", 
    "100% Free",
    "Sign up, publish, get paid"
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
  const [copied, setCopied] = useState(false);
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  // Format market cap for display (e.g., $1.2M, $500K)
  const formatMarketCap = (value: number): string => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const CONTRACT_ADDRESS = 'C8wvVNuRPm237bQqqcfRxas77GTK3RzzoBCkWgrGpump';

  const tokenBenefits = [
    { icon: Vote, title: 'Governance Voting', description: 'Holders vote on platform decisions and feature priorities' },
    { icon: Coins, title: 'Revenue Share', description: 'Earn a portion of platform revenue' },
    { icon: Sparkles, title: 'Early Access', description: 'Get exclusive access to new features before launch' },
  ];

  const upcomingFeatures = [
    { title: 'XXXXXX', timeline: 'Dec 2025' },
    { title: 'XXXXXX', timeline: 'Jan 2026' },
    { title: 'XXXXXX', timeline: 'Q1 2026' },
  ];

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch articles on component mount
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await apiService.getArticles();
        if (response.success && response.data) {
          // Filter out test articles (used only for x402 test page)
          const TEST_ARTICLE_AUTHOR = '0x6D084C5857b7FE93e3F947a09a8A68E6B2d5Ec75';
          const filtered = response.data.filter(
            article => article.authorAddress.toLowerCase() !== TEST_ARTICLE_AUTHOR.toLowerCase()
          );
          // Show first 6 articles for the home page
          setArticles(filtered.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // Fetch token price from DexScreener
  useEffect(() => {
    const fetchTokenPrice = async () => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`
        );
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
          // Get the first pair (usually the most liquid)
          const pair = data.pairs[0];
          setMarketCap(pair.fdv || pair.marketCap || 0);
          setPriceChange(pair.priceChange?.h24 || 0);
        }
      } catch (error) {
        console.error('Error fetching token price:', error);
      }
    };

    fetchTokenPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchTokenPrice, 30000);
    return () => clearInterval(interval);
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
      <div className="hero-grid-section home-hero-grid">
        <section className="hero home-hero" aria-labelledby="home-hero-title">
          <div className="hero-content">
            <h1 id="home-hero-title">The New Content Economy</h1>
            <div className="hero-dynamic" aria-live="polite" aria-atomic="true">
              <div className="typing-text-box">
                <span className="typing-text">
                  {displayText}
                  <span className="cursor" aria-hidden="true">|</span>
                </span>
              </div>
            </div>
            <div className="hero-cta-buttons">
              <Link to="/write" className="cta-simple-button">
                <PenTool size={18} />
                Start Writing
              </Link>
              <Link to="/explore" className="cta-simple-button">
                <BookOpen size={18} />
                Explore Articles
              </Link>
            </div>
          </div>
          <div className="hero-lower">
            <p className="home-hero-subtitle">
              <span>Readers: Pay only for what you read—no subscriptions, no ads.</span>
              <span>Authors: Receive 100% of revenue directly into your wallet.</span>
            </p>
            <div className="hero-meta">
              <span className="hero-powered-label">Powered by</span>
              <span className="hero-powered-brand">Coinbase x402</span>
            </div>
          </div>
        </section>
        <div className="scroll-indicator" aria-hidden="true">
          <div className="scroll-arrow"></div>
        </div>
      </div>

      {/* $READ Token Section */}
      <section className="token-section">
        <div className="token-section-inner">
          <div className="token-header">
            <h2>$READ</h2>
            <div className="token-price-badge">
              {marketCap !== null ? (
                <>
                  <span className="token-market-cap-label">Market Cap</span>
                  <span className="token-price">{formatMarketCap(marketCap)}</span>
                  {priceChange !== null && (
                    <span className={`token-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                    </span>
                  )}
                </>
              ) : (
                <span className="token-price-loading">Loading...</span>
              )}
            </div>
          </div>

          <div className="token-contract">
            <code className="token-contract-address">
              {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
            </code>
            <button onClick={handleCopyAddress} className="token-copy-btn">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>

          <div className="token-benefits-grid">
            {tokenBenefits.map((benefit, index) => (
              <div key={index} className="token-benefit-card">
                <div className="token-benefit-icon">
                  <benefit.icon size={24} />
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>

          <div className="token-roadmap">
            <h3>Upcoming Features</h3>
            <div className="token-roadmap-list">
              {upcomingFeatures.map((feature, index) => (
                <div key={index} className="token-roadmap-item">
                  <Rocket size={16} />
                  <span className="roadmap-title">{feature.title}</span>
                  <span className="roadmap-timeline">{feature.timeline}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="token-cta">
            <a
              href={`https://pump.fun/coin/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="token-buy-btn"
            >
              Buy $READ
            </a>
            <Link to="/read-token" className="token-learn-btn">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Articles - separate white section */}
      <div className="featured-articles">
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
      </div>

      {/* Explore CTA - separate grid background section */}
      <div className="explore-cta-section">
        <div className="explore-cta">
          <Link to="/explore" className="fancy">
            <span className="top-key"></span>
            <span className="text">
              <BookOpen size={20} />
              Explore All Articles
            </span>
            <span className="bottom-key-1"></span>
            <span className="bottom-key-2"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
