import { mockQuests } from '../data/mockQuests';
import { extractXHandle, calcProgress } from '../types';

function Explore() {
  return (
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
              <button className="category-item">Token Launch</button>
              <button className="category-item">Product Launch</button>
              <button className="category-item">New Feature</button>
              <button className="category-item">Partnership</button>
              <button className="category-item">Airdrop</button>
              <button className="category-item">Event</button>
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
                {mockQuests.map((quest) => {
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Explore;
