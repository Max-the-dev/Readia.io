import { Users, ArrowRight, PenTool, CreditCard } from 'lucide-react';

interface HowItWorksProps {
  setPage: (page: string) => void;
}

function HowItWorks({ setPage }: HowItWorksProps) {
  return (
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
  );
}

export default HowItWorks;
