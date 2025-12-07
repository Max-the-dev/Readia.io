import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Wallet, Moon, Sun, Home, Search, Plus, WalletMinimal, HelpCircle, Compass, LayoutDashboard, BookOpen, Info, Globe, FileText, Shield, Mail, CheckCircle, Eye, EyeOff, Users, Scale, AlertTriangle, ArrowRight, PenTool, CreditCard, Target, Layers, Coins, Zap, Heart, MessageCircle, Vote, TrendingUp, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import mockupCss from './mockupStyles.css?raw';
import layoutCss from '../../styles/layout.css?raw';
import themeCss from '../../styles/theme.css?raw';
import staticCss from '../../styles/pages/static.css?raw';
import walletCss from '../../styles/components/wallet.css?raw';
import miscCss from '../../styles/components/misc.css?raw';
import navigationCss from '../../styles/components/navigation.css?raw';
import badgesCss from '../../styles/components/badges.css?raw';
import { mockQuests } from './data/mockQuests';

type PageKey = 'home' | 'explore' | 'create' | 'contact' | 'privacy' | 'terms' | 'how-it-works' | 'about' | 'ecosystem';

function ShillQuestContent({
  onNavigate,
  theme,
  toggleTheme,
  location,
}: {
  onNavigate: (page: PageKey) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  location: string;
}) {
  // Derive activePage from URL - makes URL the source of truth
  const activePage: PageKey = (() => {
    const path = location.replace('/shill', '').replace('/', '');
    if (path === '' || path === 'home') return 'home';
    if (['explore', 'create', 'contact', 'privacy', 'terms', 'how-it-works', 'about', 'ecosystem'].includes(path)) {
      return path as PageKey;
    }
    return 'home';
  })();

  const setPage = (page: PageKey) => {
    onNavigate(page);
  };

  const featured = useMemo(() => mockQuests.slice(0, 3), []);

  return (
    <div className="App" data-theme={theme}>
      <header className="header">
        <div className="container">
          <div className="header-left">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <a href="#" className="logo" data-page="home" onClick={(e) => { e.preventDefault(); setPage('home'); }}>
              <h1>ShillQuest</h1>
            </a>
          </div>

          <nav className="nav-links-center">
            <a href="#" className="link" data-page="home" onClick={(e) => { e.preventDefault(); setPage('home'); }}>
              <span className="link-icon"><Home size={20} /></span>
              <span className="link-title">Home</span>
            </a>
            <a href="#" className="link" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>
              <span className="link-icon"><Search size={20} /></span>
              <span className="link-title">Quests</span>
            </a>
            <a href="#" className="link" data-page="create" onClick={(e) => { e.preventDefault(); setPage('create'); }}>
              <span className="link-icon"><Plus size={20} /></span>
              <span className="link-title">Create</span>
            </a>
          </nav>

          <div className="auth-container">
            <button className="wallet-connect-button wallet-connect-button--disconnected" type="button">
              <WalletMinimal
                aria-hidden="true"
                className="wallet-connect-button--disconnected__icon"
                strokeWidth={2.4}
                size={18}
              />
              <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">Connect Wallet</span>
            </button>
            <div className="auth-status-badges">
              <div className="auth-badge auth-badge--inactive" title="Wallet Not Connected">
                <Wallet size={16} />
              </div>
              <div className="auth-badge auth-badge--inactive" title="Not Authenticated">
                <Lock size={16} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="page-home" className={`page ${activePage === 'home' ? 'active' : ''}`}>
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
            </div>
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
              <p>Self-serve builder coming soon. For pilots, reach out and we'll set it up.</p>
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

        <section id="page-contact" className={`page ${activePage === 'contact' ? 'active' : ''}`}>
          <div className="help-page">
            <div className="container">
              {/* Hero Section */}
              <div className="help-hero">
                <h1>Help Center</h1>
                <p className="hero-subtitle">Find answers to common questions about ShillQuest.</p>
              </div>

              {/* FAQ Section */}
              <section className="help-section">
                <div className="section-header">
                  <HelpCircle size={32} />
                  <h2>Frequently Asked Questions</h2>
                </div>

                <div className="faq-list">
                  <div className="faq-item">
                    <h3>Getting Started</h3>
                    <div className="faq-questions">
                      <details className="faq-question">
                        <summary>What is ShillQuest?</summary>
                        <p>ShillQuest is a platform where crypto projects post bounties for content creation, and creators get paid instantly when their submissions are approved. Projects fund campaigns, creators submit proof of their posts, and payments happen automatically via x402.</p>
                      </details>
                      <details className="faq-question">
                        <summary>How do I get started as a creator?</summary>
                        <p>Connect your wallet, browse available quests, and submit your content. Once your submission is approved by the project, you'll receive instant payment to your wallet.</p>
                      </details>
                      <details className="faq-question">
                        <summary>How do I post a quest as a project?</summary>
                        <p>Connect your wallet, click "Create" in the navigation, fill out your campaign details including payout amount and number of spots, then fund your campaign. Creators will start submitting content immediately.</p>
                      </details>
                    </div>
                  </div>

                  <div className="faq-item">
                    <h3>Payments & Rewards</h3>
                    <div className="faq-questions">
                      <details className="faq-question">
                        <summary>How do payouts work?</summary>
                        <p>When a project approves your submission, payment is sent instantly to your connected wallet via the x402 protocol. No waiting periods, no manual claims.</p>
                      </details>
                      <details className="faq-question">
                        <summary>What currencies are supported?</summary>
                        <p>Currently we support USDC on Base. More networks and currencies coming soon.</p>
                      </details>
                      <details className="faq-question">
                        <summary>Are there any fees?</summary>
                        <p>ShillQuest takes a small platform fee from campaign budgets. Creators receive 100% of the posted payout amount with no hidden deductions.</p>
                      </details>
                    </div>
                  </div>

                  <div className="faq-item">
                    <h3>$READ Token</h3>
                    <div className="faq-questions">
                      <details className="faq-question">
                        <summary>What is $READ?</summary>
                        <p>$READ is the utility token for the Readia ecosystem. Holding $READ unlocks benefits like reduced platform fees, priority access to high-paying quests, and verified creator status.</p>
                      </details>
                      <details className="faq-question">
                        <summary>Do I need $READ to use ShillQuest?</summary>
                        <p>No, $READ is completely optional. You can use ShillQuest with just USDC. $READ simply provides additional perks for holders.</p>
                      </details>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact Section */}
              <section className="help-section">
                <div className="section-header">
                  <Mail size={32} />
                  <h2>Still Need Help?</h2>
                </div>

                <div className="contact-options">
                  <div className="contact-item">
                    <div className="contact-text">
                      <div className="contact-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <h3>Community</h3>
                      <p>Join our community on X for support and project updates.</p>
                    </div>
                    <a href="https://x.com/i/communities/1986841883000156422" className="contact-link" target="_blank" rel="noopener noreferrer">Join Community</a>
                  </div>

                  <div className="contact-item">
                    <div className="contact-text">
                      <div className="contact-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      </div>
                      <h3>Discord</h3>
                      <p>Chat with our team and other users in real time.</p>
                    </div>
                    <a href="#" className="contact-link" target="_blank" rel="noopener noreferrer">Join Discord</a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="page-privacy" className={`page ${activePage === 'privacy' ? 'active' : ''}`}>
          <div className="privacy-page">
            <div className="container">
              {/* Hero Section */}
              <div className="privacy-hero">
                <h1>Privacy Policy</h1>
                <p className="hero-subtitle">
                  Simple, transparent privacy built on blockchain principles.
                </p>
              </div>

              {/* Privacy Highlights */}
              <section className="privacy-section">
                <div className="section-header">
                  <Shield size={32} />
                  <h2>Privacy-First Design</h2>
                </div>

                <div className="privacy-highlights">
                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <CheckCircle size={24} />
                    </div>
                    <h3>No Accounts Required</h3>
                    <p>Connect directly with your existing crypto wallet. No usernames, passwords, or personal information needed.</p>
                  </div>

                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <Lock size={24} />
                    </div>
                    <h3>No Credit Cards</h3>
                    <p>All payments are handled through verified blockchain networks. No sensitive financial information is stored.</p>
                  </div>

                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <Globe size={24} />
                    </div>
                    <h3>Decentralized by Design</h3>
                    <p>Your wallet, your keys, your control. We never have access to your funds or private information.</p>
                  </div>
                </div>
              </section>

              {/* Data Privacy */}
              <section className="privacy-section">
                <div className="section-header">
                  <Users size={32} />
                  <h2>Data Privacy</h2>
                </div>

                <div className="privacy-cards">
                  {/* What We DO See Card */}
                  <div className="privacy-card do-see">
                    <div className="card-header">
                      <div className="card-icon">
                        <Eye size={28} />
                      </div>
                      <h3>What we DO see</h3>
                      <p>Minimal data required for platform functionality</p>
                    </div>

                    <ul className="privacy-list">
                      <li><strong>Wallet Address:</strong> Only your public wallet address</li>
                      <li><strong>Quest Activity:</strong> Submissions you make and their status</li>
                      <li><strong>Transaction Records:</strong> Public on-chain payment activity</li>
                      <li><strong>Basic Analytics:</strong> Anonymous usage data to improve platform performance</li>
                    </ul>
                  </div>

                  {/* What We DON'T See Card */}
                  <div className="privacy-card dont-see">
                    <div className="card-header">
                      <div className="card-icon">
                        <EyeOff size={28} />
                      </div>
                      <h3>What we DON'T see</h3>
                      <p>We never collect or store sensitive personal information</p>
                    </div>

                    <ul className="privacy-list">
                      <li>Personal information (names, emails, phone numbers)</li>
                      <li>Private keys or wallet credentials</li>
                      <li>Credit card or banking information</li>
                      <li>Browsing history or tracking cookies</li>
                      <li>Location data or device information</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* How We Protect You */}
              <section className="privacy-section">
                <div className="section-header">
                  <Lock size={32} />
                  <h2>How We Protect You</h2>
                </div>

                <div className="protection-grid">
                  <div className="protection-item">
                    <h3>Blockchain Security</h3>
                    <p>All transactions are secured by established blockchain networks with proven security records.</p>
                  </div>

                  <div className="protection-item">
                    <h3>No Data Breaches</h3>
                    <p>Since we don't store sensitive personal or financial data, there's nothing for hackers to steal.</p>
                  </div>

                  <div className="protection-item">
                    <h3>Instant Payments</h3>
                    <p>Payouts go directly to your wallet via x402. We never hold or control your earnings.</p>
                  </div>

                  <div className="protection-item">
                    <h3>Self-Custody</h3>
                    <p>You maintain full control of your wallet and funds. We never hold or control your cryptocurrency.</p>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="privacy-section">
                <div className="privacy-footer">
                  <h2>Questions About Privacy?</h2>
                  <p>If you have any questions about our privacy practices, please reach out:</p>
                  <a href="#" className="privacy-contact" onClick={(e) => { e.preventDefault(); setPage('contact'); }}>Visit Help Center</a>
                  <div className="last-updated">
                    <p>Last updated: December 6, 2025</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="page-terms" className={`page ${activePage === 'terms' ? 'active' : ''}`}>
          <div className="terms-page">
            <div className="container">
              {/* Hero Section */}
              <div className="terms-hero">
                <h1>Terms of Service</h1>
                <p className="hero-subtitle">
                  Clear, fair terms for our content promotion platform.
                </p>
              </div>

              {/* Key Terms Overview */}
              <section className="terms-section">
                <div className="section-header">
                  <Scale size={32} />
                  <h2>Key Terms Overview</h2>
                </div>

                <div className="terms-highlights">
                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <CheckCircle size={24} />
                    </div>
                    <h3>Wallet-Based Access</h3>
                    <p>Your wallet is your account. No usernames, passwords, or platform dependencies.</p>
                  </div>

                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <Shield size={24} />
                    </div>
                    <h3>Instant Payments</h3>
                    <p>Payments via x402 protocol go directly to your wallet upon approval. No delays.</p>
                  </div>

                  <div className="highlight-item">
                    <div className="highlight-icon">
                      <Users size={24} />
                    </div>
                    <h3>Fair Platform</h3>
                    <p>5% platform fee. $READ holders receive discounts. Creators keep 100% of posted payouts.</p>
                  </div>
                </div>
              </section>

              {/* Terms Cards */}
              <section className="terms-section">
                <div className="section-header">
                  <FileText size={32} />
                  <h2>Terms & Conditions</h2>
                </div>

                <div className="terms-cards">
                  {/* For Projects Card */}
                  <div className="terms-card">
                    <div className="card-header">
                      <div className="card-icon">
                        <Users size={28} />
                      </div>
                      <h3>For Projects</h3>
                      <p>Guidelines for creating and managing quests</p>
                    </div>

                    <div className="terms-content">
                      <h4>Quest Creation:</h4>
                      <ul className="terms-list">
                        <li>Fund quest budgets before launching campaigns</li>
                        <li>Funds are held in escrow until submissions are approved</li>
                        <li>Withdraw unused funds at any time</li>
                        <li>Define clear, achievable requirements for creators</li>
                      </ul>

                      <h4>Approval Process:</h4>
                      <ul className="terms-list">
                        <li>Review submissions fairly and promptly</li>
                        <li>Approve content that meets stated requirements</li>
                        <li>Provide clear feedback on rejections</li>
                      </ul>
                    </div>
                  </div>

                  {/* For Creators Card */}
                  <div className="terms-card">
                    <div className="card-header">
                      <div className="card-icon">
                        <Shield size={28} />
                      </div>
                      <h3>For Creators</h3>
                      <p>Guidelines for submitting content</p>
                    </div>

                    <div className="terms-content">
                      <h4>Content Submission:</h4>
                      <ul className="terms-list">
                        <li>Follow quest requirements exactly as specified</li>
                        <li>Submit only original content you created</li>
                        <li>Content must not violate any laws or third-party rights</li>
                        <li>Include all required keywords, links, and proof</li>
                      </ul>

                      <h4>Payments:</h4>
                      <ul className="terms-list">
                        <li>Receive instant payment upon approval via x402</li>
                        <li>Creators receive 100% of posted payout amounts</li>
                        <li>You are responsible for any applicable taxes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Content Policy */}
              <section className="terms-section">
                <div className="section-header">
                  <AlertTriangle size={32} />
                  <h2>Content Policy</h2>
                </div>

                <div className="policy-grid">
                  <div className="policy-item allowed">
                    <h3>✅ Allowed Content</h3>
                    <ul className="policy-list">
                      <li>Original promotional posts and threads</li>
                      <li>Educational content about projects</li>
                      <li>Honest reviews and opinions</li>
                      <li>Creative content that meets quest requirements</li>
                      <li>Properly disclosed sponsored content</li>
                    </ul>
                  </div>

                  <div className="policy-item prohibited">
                    <h3>❌ Prohibited Activities</h3>
                    <ul className="policy-list">
                      <li>Fake or misleading content</li>
                      <li>Multiple accounts to circumvent limits</li>
                      <li>Manipulating engagement metrics</li>
                      <li>Fraudulent submissions</li>
                      <li>Any form of deception</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Platform Disclaimer */}
              <section className="terms-section">
                <div className="section-header">
                  <Shield size={32} />
                  <h2>Platform Disclaimer</h2>
                </div>

                <div className="disclaimer-content">
                  <div className="disclaimer-item">
                    <h3>Service Provided "As Is"</h3>
                    <p>ShillQuest is provided without warranties of any kind. We are not responsible for any losses arising from platform use, including cryptocurrency losses, rejected submissions, or technical failures.</p>
                  </div>

                  <div className="disclaimer-item">
                    <h3>Blockchain Transactions</h3>
                    <p>All transactions are processed through blockchain networks and are final. Verify wallet addresses and transaction details before confirming. We are not responsible for losses due to user error.</p>
                  </div>

                  <div className="disclaimer-item">
                    <h3>Account Security</h3>
                    <p>Your wallet address is your unique identifier. You are responsible for maintaining wallet security and all activities conducted through it.</p>
                  </div>

                  <div className="disclaimer-item">
                    <h3>Enforcement</h3>
                    <p>Fraudulent submissions may result in account suspension and forfeiture of pending payments. We reserve the right to remove content that violates these terms.</p>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="terms-section">
                <div className="terms-footer">
                  <h2>Questions About Terms?</h2>
                  <p>If you have questions about these terms or need clarification, please contact us:</p>
                  <a href="mailto:support@readia.io" className="terms-contact">support@readia.io</a>
                  <div className="last-updated">
                    <p>Last updated: December 2025</p>
                    <p>These terms are effective immediately upon posting.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="page-how-it-works" className={`page ${activePage === 'how-it-works' ? 'active' : ''}`}>
          <div className="how-it-works-page">
            <div className="container">
              {/* Hero Section */}
              <div className="how-it-works-hero">
                <h1>How ShillQuest Works</h1>
                <p className="hero-subtitle">
                  Simple, transparent content promotion with instant payments.
                </p>
              </div>

              {/* For Creators Section */}
              <section className="how-section">
                <div className="section-header">
                  <Users size={32} />
                  <h2>For Creators</h2>
                </div>
                <p className="section-description">
                  Create content, submit proof, get paid instantly. No invoices or waiting.
                </p>

                <div className="steps-container">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Find a Quest</h3>
                      <p>Browse active quests from projects. Each quest shows payout, requirements, and remaining slots.</p>
                    </div>
                  </div>

                  <ArrowRight className="step-arrow" size={24} />

                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Create Content</h3>
                      <p>Post on X, create a thread, or make a video following the quest requirements.</p>
                    </div>
                  </div>

                  <ArrowRight className="step-arrow" size={24} />

                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Submit Proof</h3>
                      <p>Paste your post URL and upload a screenshot. We auto-verify keywords and requirements.</p>
                    </div>
                  </div>

                  <ArrowRight className="step-arrow" size={24} />

                  <div className="step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h3>Get Paid Instantly</h3>
                      <p>Payment hits your wallet the moment your submission is approved via x402.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* For Projects Section */}
              <section className="how-section">
                <div className="section-header">
                  <PenTool size={32} />
                  <h2>For Projects</h2>
                </div>
                <p className="section-description">
                  Launch campaigns, fund budget, pay only for approved content.
                </p>

                <div className="steps-container">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Create Quest</h3>
                      <p>Define your campaign: content type, requirements, keywords, and payout per post.</p>
                    </div>
                  </div>

                  <ArrowRight className="step-arrow" size={24} />

                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Fund Budget</h3>
                      <p>Deposit USDC, SOL, or ETH. Funds held in escrow until submissions approved.</p>
                    </div>
                  </div>

                  <ArrowRight className="step-arrow" size={24} />

                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Review & Approve</h3>
                      <p>Auto-verification handles basic checks. Approve or reject with one click.</p>
                    </div>
                  </div>

                  <ArrowRight className="step-arrow" size={24} />

                  <div className="step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h3>Pay for Results</h3>
                      <p>Only pay when you approve. Unused budget withdrawable anytime.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Technology Section */}
              <section className="how-section">
                <div className="section-header">
                  <CreditCard size={32} />
                  <h2>The Technology</h2>
                </div>
                <div className="tech-grid">
                  <div className="tech-card">
                    <h3>x402 Protocol</h3>
                    <p>Seamless micropayments for instant creator compensation without traditional payment rails.</p>
                  </div>
                  <div className="tech-card">
                    <h3>Escrow System</h3>
                    <p>Project funds held securely until submissions are verified and approved.</p>
                  </div>
                  <div className="tech-card">
                    <h3>Multi-Chain</h3>
                    <p>Support for Solana, Base, and other major networks for maximum accessibility.</p>
                  </div>
                  <div className="tech-card">
                    <h3>Auto-Verification</h3>
                    <p>Keyword detection, link validation, and content hash verification built-in.</p>
                  </div>
                </div>
              </section>

              {/* CTA Section */}
              <section className="how-cta">
                <h2>Ready to Get Started?</h2>
                <p>Join creators earning from promotional content and projects reaching new audiences.</p>
                <div className="cta-buttons">
                  <a href="#" className="cta-button primary" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>Browse Quests</a>
                  <a href="#" className="cta-button secondary" onClick={(e) => { e.preventDefault(); setPage('create'); }}>Create Quest</a>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="page-about" className={`page ${activePage === 'about' ? 'active' : ''}`}>
          <div className="about-page">
            <div className="container">
              {/* Hero Section */}
              <div className="about-hero">
                <h1>About ShillQuest</h1>
                <p className="hero-subtitle">
                  Part of the Readia ecosystem - revolutionizing creator payments
                </p>
              </div>

              {/* Mission Section */}
              <section className="about-section">
                <div className="section-header">
                  <Target size={32} />
                  <h2>Our Mission</h2>
                </div>
                <div className="mission-content">
                  <p>
                    ShillQuest bridges the gap between projects seeking authentic promotion and creators
                    looking to earn from their influence. We believe promotional content should be
                    transparent, fairly compensated, and instantly paid.
                  </p>
                  <p>
                    Built on Readia's x402 micropayment infrastructure, ShillQuest eliminates the
                    traditional friction of influencer marketing - no invoices, no payment delays,
                    no intermediaries.
                  </p>
                </div>
              </section>

              {/* Vision Section */}
              <section className="about-section">
                <div className="section-header">
                  <Globe size={32} />
                  <h2>Our Vision</h2>
                </div>
                <div className="vision-content">
                  <p>
                    We envision a world where promotional content is valued fairly, creators are
                    empowered to monetize their influence, and projects can reach authentic audiences
                    without middlemen taking massive cuts.
                  </p>
                  <div className="vision-points">
                    <div className="vision-point">
                      <Zap size={24} />
                      <div>
                        <h3>Instant Payments</h3>
                        <p>Get paid the moment your submission is approved. No waiting, no invoices.</p>
                      </div>
                    </div>
                    <div className="vision-point">
                      <Shield size={24} />
                      <div>
                        <h3>Transparent & Secure</h3>
                        <p>Escrow-backed campaigns ensure funds are always available for approved content.</p>
                      </div>
                    </div>
                    <div className="vision-point">
                      <Heart size={24} />
                      <div>
                        <h3>Creator-First</h3>
                        <p>Built for creators. Fair payouts, clear requirements, no hidden fees.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Values Section */}
              <section className="about-section">
                <div className="section-header">
                  <Users size={32} />
                  <h2>Our Values</h2>
                </div>
                <div className="values-grid">
                  <div className="value-card">
                    <h3>Fairness</h3>
                    <p>
                      Every creator deserves fair compensation for their work. Every project deserves
                      authentic promotion at fair prices.
                    </p>
                  </div>
                  <div className="value-card">
                    <h3>Transparency</h3>
                    <p>
                      Clear requirements, upfront payouts, and on-chain payments. No hidden fees
                      or surprise deductions.
                    </p>
                  </div>
                  <div className="value-card">
                    <h3>Speed</h3>
                    <p>
                      Instant payments via x402. No more waiting 30-90 days for influencer
                      marketing payouts.
                    </p>
                  </div>
                  <div className="value-card">
                    <h3>Accessibility</h3>
                    <p>
                      Anyone can participate. No minimum follower counts, no gatekeeping.
                      Quality content gets rewarded.
                    </p>
                  </div>
                </div>
              </section>

              {/* Founder Section */}
              <section className="about-section">
                <div className="section-header">
                  <Users size={32} />
                  <h2>Founder</h2>
                </div>
                <div className="team-content">
                  <p>
                    My name is Maxim. An enthusiast who believes in the power of blockchain &
                    decentralized creator monetization.
                  </p>
                  <div className="founder-info">
                    <a
                      href="https://x.com/Readia_io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="x-link"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Readia.io
                    </a>
                  </div>
                  <div className="team-stats">
                    <div className="stat">
                      <h3>Founded</h3>
                      <p>2025</p>
                    </div>
                    <div className="stat">
                      <h3>Focus</h3>
                      <p>Creator Economy</p>
                    </div>
                    <div className="stat">
                      <h3>Technology</h3>
                      <p>x402 Protocol</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ecosystem Section */}
              <section className="about-section">
                <div className="section-header">
                  <Layers size={32} />
                  <h2>The Readia Ecosystem</h2>
                </div>
                <div className="values-grid">
                  <div className="value-card">
                    <h3>Readia.io</h3>
                    <p>
                      The core platform. Writers set prices per article, readers pay micropayments
                      to unlock. No subscriptions, no ads.
                    </p>
                  </div>
                  <div className="value-card current">
                    <span className="badge">You are here</span>
                    <h3>ShillQuest</h3>
                    <p>
                      Content quests for promotional campaigns. Projects fund bounties, creators
                      make content, get paid instantly.
                    </p>
                  </div>
                  <div className="value-card coming">
                    <span className="badge">Coming Soon</span>
                    <h3>Readia Pro</h3>
                    <p>
                      Premium tools for creators - analytics, audience insights, and advanced
                      monetization options.
                    </p>
                  </div>
                </div>
              </section>

              {/* $READ Token Section */}
              <section className="about-section">
                <div className="section-header">
                  <Coins size={32} />
                  <h2>$READ Token</h2>
                </div>
                <div className="technology-content">
                  <p>The $READ token powers the entire Readia ecosystem:</p>
                  <ul>
                    <li><strong>Lower Fees:</strong> Hold $READ to reduce platform fees by up to 50%</li>
                    <li><strong>Priority Access:</strong> Early access to high-paying quests</li>
                    <li><strong>Governance:</strong> Vote on platform features and fee structures</li>
                    <li><strong>Verified Status:</strong> Earn verified badges for faster approvals</li>
                    <li><strong>Revenue Share:</strong> Earn from platform transaction volume</li>
                  </ul>
                </div>
              </section>

              {/* CTA Section */}
              <section className="about-cta">
                <h2>Join the Ecosystem</h2>
                <p>
                  Whether you're a creator looking to earn or a project seeking authentic promotion,
                  ShillQuest is built for you.
                </p>
                <div className="cta-buttons">
                  <a href="#" className="cta-button primary" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>Browse Quests</a>
                  <a href="#" className="cta-button secondary" onClick={(e) => { e.preventDefault(); setPage('create'); }}>Create Quest</a>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="page-ecosystem" className={`page ${activePage === 'ecosystem' ? 'active' : ''}`}>
          <div className="about-page">
            <div className="container">
              {/* Hero Section */}
              <div className="about-hero">
                <h1>The Readia Ecosystem</h1>
                <p className="hero-subtitle">
                  Multiple products, one token, unified creator economy
                </p>
              </div>

              {/* Products Grid */}
              <section className="about-section">
                <div className="section-header">
                  <Layers size={32} />
                  <h2>Our Products</h2>
                </div>
                <div className="values-grid ecosystem-grid">
                <div className="value-card">
                  <h3>Readia.io</h3>
                  <p>
                    The core platform. Writers set prices per article ($0.01-$1.00), readers pay
                    only for what they read. 100% of payments go directly to creators.
                  </p>
                  <a href="https://readia.io" target="_blank" rel="noopener noreferrer" className="card-link">
                    Visit Readia →
                  </a>
                </div>
                <div className="value-card current">
                  <span className="badge">You are here</span>
                  <h3>ShillQuest</h3>
                  <p>
                    Content quests for promotional campaigns. Projects post bounties, creators
                    submit content, get paid instantly on approval.
                  </p>
                </div>
                <div className="value-card coming">
                  <span className="badge">Coming Soon</span>
                  <h3>Readia Pro</h3>
                  <p>
                    Premium analytics, audience insights, subscription management, and advanced
                    monetization for professional creators.
                  </p>
                </div>
                </div>
              </section>

              {/* $READ Powers Everything */}
              <section className="about-section">
                <div className="section-header">
                  <Coins size={32} />
                  <h2>$READ Powers Everything</h2>
                </div>
                <div className="technology-content">
                  <p>The $READ token is the utility token across the entire Readia ecosystem:</p>
                  <ul>
                    <li><strong>Fee Discounts:</strong> Lower platform fees on Readia and ShillQuest</li>
                    <li><strong>Priority Access:</strong> Early access to high-paying quests and premium features</li>
                    <li><strong>Governance:</strong> Vote on platform features, fee structures, and roadmap priorities</li>
                    <li><strong>Revenue Share:</strong> Earn from ecosystem transaction volume</li>
                    <li><strong>Verified Status:</strong> Earn verified creator/project badges</li>
                  </ul>
                </div>
              </section>

              {/* Live Token Chart */}
              <section className="about-section">
                <div className="section-header">
                  <TrendingUp size={32} />
                  <h2>Live Token Chart</h2>
                </div>
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
              </section>

              {/* Community & Governance */}
              <section className="about-section">
                <div className="section-header">
                  <Users size={32} />
                  <h2>Community & Governance</h2>
                </div>
                <div className="values-grid">
                  <div className="value-card">
                    <MessageCircle size={24} style={{ marginBottom: '12px', color: 'var(--accent-blue)' }} />
                    <h3>Active Community</h3>
                    <p>
                      Join thousands of creators and projects in our Discord and X communities.
                      Share tips, find opportunities, and connect with like-minded people.
                    </p>
                  </div>
                  <div className="value-card">
                    <Vote size={24} style={{ marginBottom: '12px', color: 'var(--accent-blue)' }} />
                    <h3>Token Governance</h3>
                    <p>
                      $READ holders vote on platform decisions including fee structures,
                      new features, and ecosystem fund allocations.
                    </p>
                  </div>
                  <div className="value-card">
                    <TrendingUp size={24} style={{ marginBottom: '12px', color: 'var(--accent-blue)' }} />
                    <h3>Revenue Sharing</h3>
                    <p>
                      A portion of platform fees flows back to $READ stakers. The more the
                      ecosystem grows, the more token holders benefit.
                    </p>
                  </div>
                </div>
              </section>

              {/* Roadmap */}
              <section className="about-section">
                <div className="section-header">
                  <Calendar size={32} />
                  <h2>Roadmap</h2>
                </div>
                <div className="values-grid">
                  <div className="value-card">
                    <h3>Q1 2025</h3>
                    <p>
                      ShillQuest launch, initial quest categories, creator onboarding,
                      basic verification system.
                    </p>
                  </div>
                  <div className="value-card">
                    <h3>Q2 2025</h3>
                    <p>
                      Advanced analytics dashboard, reputation scoring, multi-chain support,
                      automated content verification.
                    </p>
                  </div>
                  <div className="value-card">
                    <h3>Q3 2025</h3>
                    <p>
                      Readia Pro beta, creator subscriptions, API access for projects,
                      mobile app development.
                    </p>
                  </div>
                  <div className="value-card">
                    <h3>Q4 2025</h3>
                    <p>
                      Full governance launch, ecosystem fund, cross-platform integrations,
                      enterprise solutions.
                    </p>
                  </div>
                </div>
              </section>

              {/* CTA Section */}
              <section className="about-cta">
                <h2>Be Part of the Future</h2>
                <p>
                  The Readia ecosystem is building the next generation of creator monetization.
                  Join us early and grow with the community.
                </p>
                <div className="cta-buttons">
                  <a href="https://pump.fun" target="_blank" rel="noopener noreferrer" className="cta-button primary">
                    Buy $READ
                  </a>
                  <a href="#" className="cta-button secondary" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>
                    Browse Quests
                  </a>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <a
              href="#"
              className="logo"
              data-page="home"
              onClick={(e) => {
                e.preventDefault();
                setPage('home');
              }}
            >
              <h1>ShillQuest</h1>
            </a>
            <p className="footer-tagline">Get paid to promote projects.</p>
            <div className="footer-social">
              <a href="https://x.com/Readia_io" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Readia.io
              </a>
              <a href="https://github.com/Max-the-dev/Readia.io" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <a href="#" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}><Compass size={16} />Explore Quests</a>
              <a href="#" data-page="create" onClick={(e) => { e.preventDefault(); setPage('create'); }}><Plus size={16} />Create Quest</a>
              <a href="#" data-page="creator-dashboard"><LayoutDashboard size={16} />Dashboard</a>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#" data-page="how-it-works" onClick={(e) => { e.preventDefault(); setPage('how-it-works'); }}><BookOpen size={16} />How It Works</a>
              <a href="#" data-page="about" onClick={(e) => { e.preventDefault(); setPage('about'); }}><Info size={16} />About</a>
              <a href="#" data-page="ecosystem" onClick={(e) => { e.preventDefault(); setPage('ecosystem'); }}><Globe size={16} />Ecosystem</a>
            </div>
            <div className="footer-column">
              <h4>Support</h4>
              <a href="#" data-page="contact" onClick={(e) => { e.preventDefault(); setPage('contact'); }}><HelpCircle size={16} />Help & Contact</a>
              <a href="#" data-page="terms" onClick={(e) => { e.preventDefault(); setPage('terms'); }}><FileText size={16} />Terms of Service</a>
              <a href="#" data-page="privacy" onClick={(e) => { e.preventDefault(); setPage('privacy'); }}><Shield size={16} />Privacy Policy</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 ShillQuest by Readia. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#" onClick={(e) => { e.preventDefault(); setPage('privacy'); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setPage('terms'); }}>Terms of Service</a>
            <span className="footer-powered-by">Powered by <a href="https://readia.io" target="_blank" rel="noopener noreferrer">Readia.io</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ShillQuestApp() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hostRef.current && !shadowRoot) {
      const existing = hostRef.current.shadowRoot;
      if (existing) {
        setShadowRoot(existing);
      } else {
        setShadowRoot(hostRef.current.attachShadow({ mode: 'open' }));
      }
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
      navigate(`/shill/${page}`);
    }
  };

  return (
    <div ref={hostRef}>
      {shadowRoot
        ? createPortal(
          <>
            <style>{themeCss + layoutCss + staticCss + miscCss + navigationCss + badgesCss + walletCss + mockupCss}</style>
            <ShillQuestContent onNavigate={handleNav} theme={theme} toggleTheme={toggleTheme} location={location.pathname} />
          </>,
          shadowRoot
        )
        : null}
    </div>
  );
}

export default ShillQuestApp;
