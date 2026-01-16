import { Layers, Coins, TrendingUp, Users, MessageCircle, Vote, Calendar } from 'lucide-react';

interface EcosystemProps {
  setPage: (page: string) => void;
}

function Ecosystem({ setPage }: EcosystemProps) {
  return (
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
            <h3>Logos</h3>
            <p>
              The core platform. Writers set prices per article ($0.01-$1.00), readers pay
              only for what they read. 100% of payments go directly to creators.
            </p>
            <a href="https://logos.readia.io" target="_blank" rel="noopener noreferrer" className="card-link">
              Visit Logos →
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
  );
}

export default Ecosystem;
