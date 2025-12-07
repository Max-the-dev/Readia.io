import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import mockupCss from './mockupStyles.css?raw';
import { mockQuests } from './data/mockQuests';

type PageKey = 'home' | 'explore' | 'create';

function ShillQuestContent({
  onNavigate,
  theme,
  toggleTheme,
}: {
  onNavigate: (page: PageKey) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  const [activePage, setActivePage] = useState<PageKey>('home');

  const setPage = (page: PageKey) => {
    setActivePage(page);
    onNavigate(page);
  };

  const featured = useMemo(() => mockQuests.slice(0, 3), []);

  return (
    <div className="App" data-theme={theme}>
      <header className="header">
        <div className="container">
          <div className="header-left">
            <a href="#" className="logo" data-page="home" onClick={(e) => { e.preventDefault(); setPage('home'); }}>
              <h1>ShillQuest</h1>
            </a>
          </div>

          <nav className="nav-links-center">
            <a href="#" className="link" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>
              <span className="link-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <span className="link-title">Quests</span>
            </a>
            <a href="#" className="link" data-page="how-it-works">
              <span className="link-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
                </svg>
              </span>
              <span className="link-title">How It Works</span>
            </a>
            <a href="#" className="link" data-page="create" onClick={(e) => { e.preventDefault(); setPage('create'); }}>
              <span className="link-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="link-title">Create</span>
            </a>
          </nav>

          <div className="header-right">
            <button className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
              <svg className="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <svg className="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
            <a href="#" className="nav-btn" data-page="creator-dashboard">
              Dashboard
            </a>
            <button className="wallet-connect-button wallet-connect-button--disconnected">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
              </svg>
              <span>Connect Wallet</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section id="page-home" className={`page ${activePage === 'home' ? 'active' : ''}`}>
          <div className="hero-grid-section">
            <section className="hero">
              <div className="hero-content">
                <h1>Get Paid to Promote</h1>
                <div className="hero-dynamic">
                  <div className="typing-text-box">
                    <span className="typing-text">Instant payouts on approval<span className="cursor">|</span></span>
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

          <section className="token-section">
            <div className="token-section-inner">
              <div className="token-header">
                <h2>$READ</h2>
                <div className="token-price-badge">
                  <span className="token-market-cap-label">Market Cap</span>
                  <span className="token-price">$1.2M</span>
                  <span className="token-change positive">+12.5% (24h)</span>
                </div>
              </div>

              <div className="token-contract">
                <code className="token-contract-address">C8wvVN...pump</code>
                <button className="token-copy-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  Copy CA
                </button>
              </div>

              <div className="token-benefits-grid">
                <div className="token-benefit-card">
                  <div className="token-benefit-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h3>Lower Fees</h3>
                  <p>Hold $READ to reduce platform fees by up to 50%</p>
                </div>
                <div className="token-benefit-card">
                  <div className="token-benefit-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                  </div>
                  <h3>Priority Access</h3>
                  <p>Early access to high-paying quests before public</p>
                </div>
                <div className="token-benefit-card">
                  <div className="token-benefit-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <h3>Verified Status</h3>
                  <p>Earn verified badge for faster approvals</p>
                </div>
              </div>

              <div className="token-cta">
                <a href="https://pump.fun" target="_blank" rel="noreferrer" className="token-buy-btn">Buy $READ</a>
                <a href="#" className="token-learn-btn" data-page="ecosystem">Learn More</a>
              </div>
            </div>
          </section>

          <div className="featured-articles">
            <h2>Active Quests</h2>
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
        </section>

        <section id="page-explore" className={`page ${activePage === 'explore' ? 'active' : ''}`}>
          <div className="explore-page">
            <div className="container">
              <div className="explore-hero">
                <div className="hero-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <h1>Explore Quests</h1>
                <p>Find campaigns that match your audience and start earning.</p>
              </div>

              <div className="explore-content">
                <div className="categories-sidebar">
                  <div className="sidebar-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" />
                    </svg>
                    <h3>Categories</h3>
                  </div>
                  <div className="category-list">
                    <button className="category-item active">All Quests <span className="selected-indicator">✓</span></button>
                    <button className="category-item">DeFi</button>
                    <button className="category-item">NFT</button>
                    <button className="category-item">Gaming</button>
                    <button className="category-item">Infrastructure</button>
                    <button className="category-item">Token Launch</button>
                    <button className="category-item">Education</button>
                  </div>
                </div>

                <div className="explore-main">
                  <div className="search-section">
                    <div className="search-container">
                      <div className="search-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        <input type="text" placeholder="Search quests..." className="search-input" />
                      </div>
                      <button className="filter-toggle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                      </button>
                    </div>
                    <div className="search-results-info">
                      <div className="results-count">
                        <p>Found {mockQuests.length} quests</p>
                      </div>
                      <div className="view-toggle">
                        <button className="view-btn active">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                          </svg>
                        </button>
                        <button className="view-btn">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="explore-articles">
                    <div className="article-grid">
                      {mockQuests.map((quest) => (
                        <div className="article-card" key={quest.id}>
                          <a href="#" className="article-card-link">
                            <h3>{quest.title}</h3>
                            <p>{quest.description}</p>
                          </a>
                          <div className="article-meta">
                            <div className="author-info">
                              <span className="author">by {quest.sponsor}</span>
                              <span className="read-time">• {quest.spotsTaken}/{quest.spotsTotal}</span>
                            </div>
                            <span className="price">${quest.payout.toFixed(2)}</span>
                          </div>
                          <div className="article-stats">
                            <div className="article-stats-left">
                              {quest.tags.map((tag) => (
                                <span className={`quest-tag ${tag.toLowerCase() === 'hot' ? 'hot' : ''}`} key={tag}>{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="page-create" className={`page ${activePage === 'create' ? 'active' : ''}`}>
          <div className="write-page">
            <div className="write-header">
              <h1>Create Quest</h1>
              <p>Self-serve builder coming soon. For pilots, reach out and we’ll set it up.</p>
            </div>
            <div className="write-form">
              <div className="form-group">
                <label>Quest title</label>
                <input className="form-input" placeholder="e.g., $READ launch thread" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-textarea" placeholder="Tell creators what you need, required keywords, links, and proof." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Base payout</label>
                  <div className="price-input-container">
                    <span className="price-prefix">$</span>
                    <input className="form-input price-input" placeholder="5.00" />
                  </div>
                  <small className="form-hint">Per accepted submission</small>
                </div>
                <div className="form-group">
                  <label>Spots</label>
                  <input className="form-input" placeholder="100" />
                  <small className="form-hint">Number of slots for this quest</small>
                </div>
              </div>
              <div className="form-group">
                <label>Bonus (optional)</label>
                <div className="bonus-row">
                  <span>+$</span>
                  <input className="form-input small" placeholder="25" />
                  <span>for viral posts</span>
                </div>
              </div>
              <div className="form-actions">
                <button className="secondary-btn">Cancel</button>
                <button className="publish-btn">Save (mock)</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ShillQuestApp() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (hostRef.current && !shadowRoot) {
      setShadowRoot(hostRef.current.attachShadow({ mode: 'open' }));
    }
  }, [shadowRoot]);

  useEffect(() => {
    if (shadowRoot) {
      (shadowRoot.host as HTMLElement).setAttribute('data-theme', theme);
    }
  }, [theme, shadowRoot]);

  const handleNav = (page: PageKey) => {
    if (page === 'home') {
      navigate('/shill');
    } else {
      navigate(`/shill/${page === 'explore' ? 'explore' : 'create'}`);
    }
  };

  if (!shadowRoot) {
    return <div ref={hostRef} />;
  }

  return createPortal(
    <>
      <style>{mockupCss}</style>
      <ShillQuestContent onNavigate={handleNav} theme={theme} toggleTheme={toggleTheme} />
    </>,
    shadowRoot
  );
}

export default ShillQuestApp;
