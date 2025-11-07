import { DollarSign, Users, PenTool, Zap, Check, X, Calculator, Shield } from 'lucide-react';

function Pricing() {
  return (
    <div className="pricing-page">
      <div className="container">
        {/* Hero Section */}
        <div className="pricing-hero">
          <h1>Simple, Transparent Pricing</h1>
          <p className="hero-subtitle">
            No hidden fees, no surprises. <br />
          </p>
        </div>

        {/* For Readers Section */}
        <section className="pricing-section">
          <div className="section-header">
            <Users size={32} />
            <h2>For Readers</h2>
          </div>
          <p className="section-description">
            Access premium content without expensive subscriptions. <br></br> Pay small amounts only for articles you want to read.
          </p>
          
          <div className="pricing-card reader-card">
            <div className="card-header">
              <h3>Pay Per Article</h3>
              <div className="price-display">
                <span className="price-range">$0.01 - $1.00</span>
                <span className="price-label">per article</span>
              </div>
            </div>
            
            <div className="features-list">
              <div className="feature-item">
                <Check size={16} />
                <span>Set by individual authors</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Instant access after payment</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>No monthly commitments</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Preview before purchasing</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Optional tipping for great content</span>
              </div>
            </div>
            
            <div className="card-footer">
              <p className="fee-note">
                <Shield size={14} />
                100% of your payment goes directly to the author
              </p>
            </div>
          </div>
        </section>

        {/* For Writers Section */}
        <section className="pricing-section">
          <div className="section-header">
            <PenTool size={32} />
            <h2>For Writers</h2>
          </div>
          <p className="section-description">
            Monetize your content directly. <br></br> Set your own prices and keep 100% of earnings from your articles.
          </p>
          
          <div className="pricing-card writer-card">
            <div className="card-header">
              <h3>Keep What You Earn</h3>
              <div className="price-display">
                <span className="price-range">100%</span>
                <span className="price-label">of article revenue</span>
              </div>
            </div>
            
            <div className="features-list">
              <div className="feature-item">
                <Check size={16} />
                <span>Set your own article prices ($0.01 - $1.00)</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Instant payments to your wallet</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>No platform fees or commissions</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Unlimited article publishing</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Detailed analytics dashboard</span>
              </div>
              <div className="feature-item">
                <Check size={16} />
                <span>Receive tips from readers</span>
              </div>
            </div>
            
            <div className="card-footer">
              <p className="fee-note">
                <Zap size={14} />
                All network transaction fees are paid by Coinbase
              </p>
            </div>
          </div>
        </section>

        {/* Fee Breakdown Section */}
        <section className="pricing-section">
          <div className="section-header">
            <Calculator size={32} />
            <h2>Fees Breakdown</h2>
          </div>
          
          <div className="fee-comparison">
            <div className="comparison-card">
              <h3>Traditional Platforms</h3>
              <div className="fee-list">
                <div className="fee-item negative">
                  <X size={16} />
                  <span>Platform fees (10-30%)</span>
                </div>
                <div className="fee-item negative">
                  <X size={16} />
                  <span>Payment processing (2-3%)</span>
                </div>
                <div className="fee-item negative">
                  <X size={16} />
                  <span>Subscription barriers</span>
                </div>
                <div className="fee-item negative">
                  <X size={16} />
                  <span>Complex payout delays</span>
                </div>
              </div>
              <div className="total-fee negative-total">
                <span>Total fees: 12-35%</span>
              </div>
            </div>
            
            <div className="vs-divider">VS</div>
            
            <div className="comparison-card penny-card">
              <h3>Penny.io</h3>
              <div className="fee-list">
                <div className="fee-item positive">
                  <Check size={16} />
                  <span>Platform fees: $0.00</span>
                </div>
                <div className="fee-item positive">
                  <Check size={16} />
                  <span>Commission: 0%</span>
                </div>
                <div className="fee-item positive">
                  <Check size={16} />
                  <span>Instant payments</span>
                </div>
                <div className="fee-item neutral">
                </div>
              </div>
              <div className="total-fee positive-total">
                <span>Total fees: ~0.1-1%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Network Fees Explanation */}
        <section className="pricing-section">
          <div className="network-fees-explanation">
            <h3>Understanding Network Fees</h3>
            <p>
              Network fees (also called "gas fees") are small charges required by blockchain networks 
              to process transactions. <br></br> These fees don't go to Penny.io - they go to the blockchain validators.
            </p>
            
            <div className="network-examples">
              <div className="network-example">
                <h4>Polygon Network</h4>
                <p>~$0.001 - $0.003 per transaction</p>
              </div>
              <div className="network-example">
                <h4>Base Network</h4>
                <p>~$0.005 - $0.02 per transaction</p>
              </div>
              <div className="network-example">
                <h4>Ethereum Mainnet</h4>
                <p>~$1 - $10 per transaction (not recommended for micropayments)</p>
              </div>
            </div>
            
            <p className="network-note">
              Penny.io uses the Coinbase native x402 Facilitator.
              Coinbase pays all netwok fees on Base. 
            </p>
          </div>
        </section>

        {/* Example Calculation */}
        <section className="pricing-section">
          <div className="example-calculation">
            <h3>Example: $0.10 Article Purchase</h3>
            <div className="calculation-breakdown">
              <div className="calc-item">
                <span className="calc-label">Article price</span>
                <span className="calc-value">$0.10</span>
              </div>
              <div className="calc-item">
                <span className="calc-label">Platform fee</span>
                <span className="calc-value free">$0.00</span>
              </div>
              <div className="calc-item">
                <span className="calc-label">Network fee (Base)</span>
                <span className="calc-value">~$0.00</span>
              </div>
              <div className="calc-divider"></div>
              <div className="calc-item total">
                <span className="calc-label">Author receives</span>
                <span className="calc-value">$0.10</span>
              </div>
              <div className="calc-item total">
                <span className="calc-label">Reader pays</span>
                <span className="calc-value">~$0.10</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="pricing-cta">
          <h2>Start Today</h2>
          <p>
            Join the micropayment revolution. No setup fees, no monthly costs, no hidden charges.
          </p>
          <div className="cta-buttons">
            <a href="/" className="cta-button primary">Browse Articles</a>
            <a href="/write" className="cta-button secondary">Start Writing</a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Pricing;