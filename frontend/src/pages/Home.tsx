import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PenTool } from 'lucide-react';

const mockArticles = [
  {
    id: 1,
    title: "Building Scalable Web3 Applications with x402 Protocol",
    preview: "Learn how to implement instant micropayments in your dApps using the latest x402 protocol. This comprehensive guide covers everything from setup to deployment...",
    price: 0.12,
    author: "alex_crypto",
    readTime: "8 min read"
  },
  {
    id: 2,
    title: "The Future of Creator Economy: Beyond Subscriptions",
    preview: "Traditional subscription models are failing creators. Discover how micropayments are revolutionizing content monetization and creating new opportunities...",
    price: 0.08,
    author: "sarah_writes",
    readTime: "6 min read"
  },
  {
    id: 3,
    title: "Smart Contract Security Best Practices in 2024",
    preview: "A deep dive into the latest security vulnerabilities and how to protect your smart contracts from common attack vectors. Real-world examples included...",
    price: 0.15,
    author: "dev_security",
    readTime: "12 min read"
  },
  {
    id: 4,
    title: "AI Agents and Autonomous Content Consumption",
    preview: "How AI agents are changing the way we discover and consume content. Explore the technical implementation of autonomous payment systems...",
    price: 0.10,
    author: "ai_researcher",
    readTime: "7 min read"
  },
  {
    id: 5,
    title: "Decentralized Publishing: A Technical Deep Dive",
    preview: "Understanding IPFS, content addressing, and how decentralized storage is reshaping digital publishing. Code examples and deployment strategies...",
    price: 0.18,
    author: "blockchain_dev",
    readTime: "15 min read"
  },
  {
    id: 6,
    title: "UX Design for Web3: Bridging Traditional and Crypto Users",
    preview: "Design patterns that make Web3 applications accessible to mainstream users. Case studies from successful DeFi and NFT platforms...",
    price: 0.06,
    author: "ux_designer",
    readTime: "5 min read"
  }
];

function Home() {
  const benefits = [
    "Instant payouts",
    "You set the price", 
    "Access infinite resources",
    "No subscriptions needed",
    "Support creators directly",
    "Empower AI agents with knowledge"
  ];

  const [currentBenefit, setCurrentBenefit] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

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
        <h1>Micropayments for Quality Content </h1>
        <p>Pay only for what you read. No subscriptions, no ads. Support creators directly with instant payments.</p>
      </div>
      
      <div className="typing-cta-section">
        <div className="typing-cta-wrapper">
          <div className="typing-cta-container">
            <div className="logo-section">
              <span className="typing-prefix">LOGO</span>
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
        <h2>Explore Articles</h2>
        <div className="article-grid">
          {mockArticles.map((article) => (
            <Link key={article.id} to={`/article/${article.id}`} className="article-card-link">
              <div className="article-card">
                <h3>{article.title}</h3>
                <p>{article.preview}</p>
                <div className="article-meta">
                  <span className="price">${article.price.toFixed(2)}</span>
                  <div className="author-info">
                    <span className="author">by @{article.author}</span>
                    <span className="read-time">• {article.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;