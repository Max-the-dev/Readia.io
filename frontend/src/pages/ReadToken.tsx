import { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import XLogo from '../components/XLogo';

function ReadToken() {
  const benefits = [
    "Platform Governance",
    "Revenue Sharing",
    "Early Access",
    "Exclusive Rewards",
    "Platform Economy",
    "Pay-with-$READ",
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
    <div className="read-token-page">
      {/* Identical Hero Section from Home.tsx */}
      <div className="hero-grid-section">
        <div className="hero">
          <div className="hero-content">
            <div className="hero-meta">
              <span className="hero-powered-label">Governance Token</span>
              <span className="hero-powered-brand">$READ</span>
            </div>
            <h1>Readia Native Token</h1>
            <div className="typing-text-box">
              <span className="typing-text">
                {displayText}
                <span className="cursor">|</span>
              </span>
            </div>
            <div className="hero-cta-buttons">
              <a
                href="https://x.com/Readia_io"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-simple-button"
              >
                <XLogo size={18} />
                Readia.io
              </a>
              <a
                href="https://github.com/Max-the-dev/Readia.io"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-simple-button"
              >
                <Github size={18} />
                GitHub
              </a>
              <a
                href="https://pump.fun/coin/C8wvVNuRPm237bQqqcfRxas77GTK3RzzoBCkWgrGpump"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-simple-button cta-primary"
              >
                Buy $READ
              </a>
            </div>
            <p className="home-hero-subtitle">
              Hold $READ tokens to participate in platform governance.
              <br></br>
              Vote on proposals, earn rewards, and shape the future of Readia.
            </p>
          </div>
        </div>
      </div>

      {/* Token Information Section */}
      <div className="container read-token-content">
        <h2>Live Token Chart</h2>

        {/* DexScreener Embed */}
        <div className="dexscreener-embed">
          <iframe
            src="https://dexscreener.com/solana/7hkhyz4picrcom1tupp898tc2shjd7yqtqkfrw4pptdr?embed=1&theme=dark&trades=0&info=0"
            title="DexScreener Chart"
            style={{
              border: 'none',
              borderRadius: '12px',
              width: '100%',
              height: '600px',
            }}
          />
        </div>

        {/* Quick Links */}
        <div className="token-links">
          <a
            href="https://dexscreener.com/solana/7hkhyz4picrcom1tupp898tc2shjd7yqtqkfrw4pptdr"
            target="_blank"
            rel="noopener noreferrer"
            className="token-link-button"
          >
            View on DexScreener
          </a>
          <a
            href="https://pump.fun/coin/C8wvVNuRPm237bQqqcfRxas77GTK3RzzoBCkWgrGpump"
            target="_blank"
            rel="noopener noreferrer"
            className="token-link-button token-link-primary"
          >
            Buy $READ
          </a>
        </div>

        {/* Listings */}
        <div className="token-listings">
          <a
            href="https://www.coingecko.com/en/coins/readia-io"
            target="_blank"
            rel="noopener noreferrer"
            className="listing-badge"
          >
            <img src="/icons/coingecko.svg" alt="CoinGecko" className="coingecko-logo" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default ReadToken;
