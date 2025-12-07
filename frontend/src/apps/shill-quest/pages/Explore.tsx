import { mockQuests } from '../data/mockQuests';

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
  );
}

export default Explore;
