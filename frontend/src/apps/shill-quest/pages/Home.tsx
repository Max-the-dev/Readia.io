import { useMemo } from 'react';
import { mockQuests } from '../data/mockQuests';

interface HomeProps {
  setPage: (page: string) => void;
}

function Home({ setPage }: HomeProps) {
  const featured = useMemo(() => mockQuests.slice(0, 3), []);

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
            <div className="hero-dynamic">
              <div className="typing-text-box">
                <span className="typing-text">Instant payouts<span className="cursor">|</span></span>
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
              <span>Projects post bounties for content creation.</span>
              <span>Creators submit posts and get paid instantly via x402.</span>
            </p>
            <div className="hero-meta">
              <span className="hero-powered-label">Powered by</span>
              <span className="hero-powered-brand">Readia x402</span>
            </div>
          </div>
        </section>
        <div className="scroll-indicator">
          <div className="scroll-arrow"></div>
        </div>
      </div>

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

        <div className="token-section-divider"></div>

        <div className="token-social-proof">
          <div className="token-stats-grid">
            <div className="token-stat-card">
              <span className="token-stat-number">1,234+</span>
              <span className="token-stat-label">Quests Completed</span>
            </div>
            <div className="token-stat-card">
              <span className="token-stat-number">$50,000+</span>
              <span className="token-stat-label">Paid to Creators</span>
            </div>
            <div className="token-stat-card">
              <span className="token-stat-number">50+</span>
              <span className="token-stat-label">Active Projects</span>
            </div>
            <div className="token-stat-card">
              <span className="token-stat-number">500+</span>
              <span className="token-stat-label">Active Creators</span>
            </div>
          </div>

          <div className="token-partners">
            <h3 className="token-partners-title">Trusted By Leading Projects</h3>
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
          {featured.map((quest) => (
            <div className="article-card" key={quest.id}>
              <a href="#" className="article-card-link" data-page="quest-detail">
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>
              </a>
              <div className="article-meta">
                <div className="author-info">
                  <span className="author">by {quest.sponsor}</span>
                  <span className="read-time">• {quest.spotsTaken}/{quest.spotsTotal} spots</span>
                </div>
                <span className="price">${quest.payout.toFixed(2)}</span>
              </div>
              <div className="article-stats">
                <div className="article-stats-left">
                  {quest.tags.map((tag) => (
                    <span className={`quest-tag ${tag.toLowerCase() === 'hot' ? 'hot' : ''}`} key={tag}>{tag}</span>
                  ))}
                  {quest.daysLeft ? <span className="quest-tag">{quest.daysLeft} days left</span> : null}
                </div>
                <div className="article-stats-right">
                  {quest.bonus ? <span className="bonus-tag">{quest.bonus}</span> : null}
                </div>
              </div>
            </div>
          ))}
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
