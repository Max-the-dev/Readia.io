import { useMemo, useState, useEffect } from 'react';
import { mockQuests } from '../data/mockQuests';
import { extractXHandle, calcProgress } from '../types';

interface HomeProps {
  setPage: (page: string) => void;
}

function Home({ setPage }: HomeProps) {
  const featured = useMemo(() => mockQuests.slice(0, 3), []);

  // Crypto degen typing animation phrases
  const degenPhrases = [
    "Instant payouts, no cap",
    "x402 SOL & BASE USDC",
    "Shilling pays the bills now",
    "Automated content verification",
    "Control budget, content types, and payout",
    "Stack rewards for viral content",
    "Shill, get paid, repeat",
    "Stack racks for posting",
    "Post content, print money",
  ];

  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentText = degenPhrases[currentPhrase];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, 80); // Slightly faster typing for degen energy
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
        }, 40); // Faster deletion
        return () => clearTimeout(timeout);
      } else {
        setCurrentPhrase((prev) => (prev + 1) % degenPhrases.length);
        setIsTyping(true);
      }
    }
  }, [displayText, isTyping, currentPhrase, degenPhrases]);

  return (
    <>
      <div className="hero-grid-section">
        <div className="floating-icons" aria-hidden="true">
          <span className="float-icon">💰</span>
          <span className="float-icon">🚀</span>
          <span className="float-icon">✨</span>
          <span className="float-icon">📣</span>
          <span className="float-icon">💎</span>
          <span className="float-icon">🔥</span>
          <span className="float-icon">⚡</span>
          <span className="float-icon">🎯</span>
          <span className="float-icon">💸</span>
          <span className="float-icon">🌟</span>
          <span className="float-icon">📈</span>
          <span className="float-icon">🏆</span>
          <span className="float-icon">🎉</span>
          <span className="float-icon">💵</span>
          <span className="float-icon">📢</span>
        </div>
        <section className="hero">
          <div className="hero-content">
            <h1>Get Paid to Shill</h1>
            <div className="hero-dynamic" aria-live="polite" aria-atomic="true">
              <div className="typing-text-box">
                <span className="typing-text">
                  {displayText}
                  <span className="cursor" aria-hidden="true">|</span>
                </span>
              </div>
            </div>
            <div className="hero-cta-buttons">
              <a href="#" className="cta-simple-button" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                Browse Quests
              </a>
              <a href="#" className="cta-simple-button" data-page="create" onClick={(e) => { e.preventDefault(); setPage('create'); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Quest
              </a>
            </div>
          </div>
          <div className="hero-lower">
            <p className="hero-subtitle">
              <span>Post bounties for content creation.</span>
              <span>Make content & get paid instantly via x402.</span>
            </p>
            <div className="hero-meta">
              <span className="hero-powered-label">Powered by</span>
              <a href="https://readia.io" target="_blank" rel="noopener noreferrer" className="hero-powered-brand">Readia.io</a>
            </div>
          </div>
        </section>
        <div className="scroll-indicator">
          <div className="scroll-arrow"></div>
        </div>
      </div>

      {/* Token Section */}
      <section className="token-section shillquest-token">
        <div className="token-section-inner">
          <div className="token-header">
            <h2>$SHILLQUEST</h2>
            <div className="token-price-badge">
              <span className="token-market-cap-label">Market Cap</span>
              <span className="token-price">$--</span>
              <span className="token-change">Coming Soon</span>
            </div>
          </div>

          <div className="token-contract">
            <code className="token-contract-address">TBA...coming</code>
            <button className="token-copy-btn" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copy CA
            </button>
          </div>

          <div className="token-cta">
            <a href="#" className="token-buy-btn disabled" onClick={(e) => e.preventDefault()}>Buy $SHILLQUEST</a>
            <a href="#" className="token-learn-btn" data-page="about" onClick={(e) => { e.preventDefault(); setPage('about'); }}>Learn More</a>
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="tokenomics-section">
        <div className="tokenomics-inner">
          <h2>Tokenomics</h2>
          <p className="tokenomics-subtitle">Fair launch, no presale, no team allocation</p>

          <div className="tokenomics-grid">
            <div className="tokenomics-card">
              <span className="tokenomics-value">1B</span>
              <span className="tokenomics-label">Total Supply</span>
            </div>
            <div className="tokenomics-card">
              <span className="tokenomics-value">0%</span>
              <span className="tokenomics-label">Team Allocation</span>
            </div>
            <div className="tokenomics-card">
              <span className="tokenomics-value">100%</span>
              <span className="tokenomics-label">Circulating</span>
            </div>
            <div className="tokenomics-card">
              <span className="tokenomics-value">0%</span>
              <span className="tokenomics-label">Tax</span>
            </div>
          </div>

        </div>
      </section>

      {/* Stats & Social Proof Section */}
      <section className="social-proof-section">
        <div className="social-proof-inner">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">1,234+</span>
              <span className="stat-label">Quests Completed</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">$50,000+</span>
              <span className="stat-label">Paid to Creators</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">50+</span>
              <span className="stat-label">Active Projects</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">500+</span>
              <span className="stat-label">Active Creators</span>
            </div>
          </div>

          <div className="partners-section">
            <h3 className="partners-title">Trusted By Leading Projects</h3>
            <div className="partners-marquee">
              <div className="partners-track">
                <div className="partner-logo">Solana</div>
                <div className="partner-logo">Jupiter</div>
                <div className="partner-logo">Raydium</div>
                <div className="partner-logo">Marinade</div>
                <div className="partner-logo">Tensor</div>
                <div className="partner-logo">Drift</div>
                <div className="partner-logo">Jito</div>
                <div className="partner-logo">Kamino</div>
                {/* Duplicate for seamless loop */}
                <div className="partner-logo">Solana</div>
                <div className="partner-logo">Jupiter</div>
                <div className="partner-logo">Raydium</div>
                <div className="partner-logo">Marinade</div>
                <div className="partner-logo">Tensor</div>
                <div className="partner-logo">Drift</div>
                <div className="partner-logo">Jito</div>
                <div className="partner-logo">Kamino</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="featured-articles">
        <h2>Latest Quests</h2>
        <div className="article-grid">
          {featured.map((quest) => {
            const handle = extractXHandle(quest.xUrl);
            const progress = calcProgress(quest.budgetUsed, quest.totalBudget);
            const hasBonus = quest.bonusAmount && quest.bonusAmount > 0;

            return (
              <div className="quest-card" key={quest.id}>
                <a href={`/shill/quest/${quest.id}`} className="quest-card-link">
                  {/* Badge Row */}
                  <div className="quest-card-badges">
                    <span className="quest-card-category">{quest.category}</span>
                    {hasBonus && (
                      <span className="quest-card-bonus">+${quest.bonusAmount}</span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="quest-card-title">{quest.title}</h3>
                  <p className="quest-card-desc">{quest.description}</p>
                </a>

                {/* Divider */}
                <div className="quest-card-divider" />

                {/* Footer Row 1: Handle & Payout */}
                <div className="quest-card-footer-row">
                  <span className="quest-card-handle">by @{handle}</span>
                  <span className="quest-card-payout">${quest.payoutPerPost.toFixed(2)}/task</span>
                </div>

                {/* Footer Row 2: Content Type & Progress */}
                <div className="quest-card-footer-row">
                  <span className="quest-card-type">{quest.contentType}</span>
                  <div className="quest-card-progress">
                    <div className="quest-card-progress-bar">
                      <div
                        className="quest-card-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="quest-card-progress-text">
                      ${quest.budgetUsed}/${quest.totalBudget}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="explore-cta-section">
        <div className="explore-cta">
          <a href="#" className="fancy" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>
            <span className="top-key"></span>
            <span className="text">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              View All Quests
            </span>
            <span className="bottom-key-1"></span>
            <span className="bottom-key-2"></span>
          </a>
        </div>
      </div>
    </>
  );
}

export default Home;
