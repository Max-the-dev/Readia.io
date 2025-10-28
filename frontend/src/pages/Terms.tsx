import { Shield, FileText, Users, AlertTriangle, CheckCircle, Scale } from 'lucide-react';

function Terms() {
  return (
    <div className="terms-page">
      <div className="container">
        {/* Hero Section */}
        <div className="terms-hero">
          <h1>Terms of Service</h1>
          <p className="hero-subtitle">
            Clear, fair terms for our decentralized content platform.
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
              <h3>No Account Lock-in</h3>
              <p>Your wallet is your account. No usernames, passwords, or platform dependencies.</p>
            </div>
            
            <div className="highlight-item">
              <div className="highlight-icon">
                <Shield size={24} />
              </div>
              <h3>Self-Custody</h3>
              <p>You maintain full control of your funds and content. We never hold your cryptocurrency.</p>
            </div>
            
            <div className="highlight-item">
              <div className="highlight-icon">
                <Users size={24} />
              </div>
              <h3>Community Guidelines</h3>
              <p>Simple rules to maintain a respectful environment for all users.</p>
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
            {/* Platform Use Card */}
            <div className="terms-card">
              <div className="card-header">
                <div className="card-icon">
                  <Users size={28} />
                </div>
                <h3>Platform Use</h3>
                <p>Guidelines for using Penny.io as a reader or writer</p>
              </div>
              
              <div className="terms-content">
                <h4>As a Reader:</h4>
                <ul className="terms-list">
                  <li>Connect a compatible crypto wallet to purchase content</li>
                  <li>Pay only for articles you want to read in full</li>
                  <li>Respect content creators' intellectual property</li>
                  <li>Use the platform for personal, non-commercial purposes</li>
                </ul>
                
                <h4>As a Writer:</h4>
                <ul className="terms-list">
                  <li>Publish only original content you own or have rights to</li>
                  <li>Set fair prices between $0.01-$1.00 per article</li>
                  <li>Maintain quality and provide value to readers</li>
                  <li>Respond to legitimate copyright claims promptly</li>
                </ul>
              </div>
            </div>

            {/* Payments & Transactions Card */}
            <div className="terms-card">
              <div className="card-header">
                <div className="card-icon">
                  <Shield size={28} />
                </div>
                <h3>Payments & Transactions</h3>
                <p>How payments work on our decentralized platform</p>
              </div>
              
              <div className="terms-content">
                <h4>Payment Processing:</h4>
                <ul className="terms-list">
                  <li>All payments are processed directly through blockchain networks</li>
                  <li>Transactions are final and cannot be reversed</li>
                  <li>Network fees are separate from article prices</li>
                  <li>We do not store or control your cryptocurrency</li>
                </ul>
                
                <h4>Earnings & Payouts:</h4>
                <ul className="terms-list">
                  <li>Writers receive 100% of article purchase prices</li>
                  <li>No platform fees or commission charges</li>
                  <li>Payments are instant and direct to your wallet</li>
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
                <li>Original articles and tutorials</li>
                <li>Educational and informational content</li>
                <li>Personal opinions and commentary</li>
                <li>Creative writing and storytelling</li>
                <li>Technical documentation and guides</li>
                <li>Industry analysis and insights</li>
              </ul>
            </div>
            
            <div className="policy-item prohibited">
              <h3>❌ Prohibited Content</h3>
              <ul className="policy-list">
                <li>Copyrighted material without permission</li>
                <li>Hate speech or discriminatory content</li>
                <li>Harassment or personal attacks</li>
                <li>Illegal activities or services</li>
                <li>Spam or misleading information</li>
                <li>Adult content or explicit material</li>
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
              <h3>Decentralized Nature</h3>
              <p>Penny.io operates as a decentralized platform. While we provide the interface and infrastructure, content transactions occur directly between users through blockchain networks. We do not act as an intermediary in financial transactions.</p>
            </div>

            <div className="disclaimer-item">
              <h3>Content Responsibility</h3>
              <p>Writers are solely responsible for their content. We provide automated content filtering but do not manually review all submissions. Users should report inappropriate content by contacting support at support@penny.io</p>
            </div>

            <div className="disclaimer-item">
              <h3>Technical Risks</h3>
              <p>Blockchain transactions are irreversible. Users should verify wallet addresses and transaction details before confirming payments. We are not responsible for losses due to user error or network issues.</p>
            </div>

            <div className="disclaimer-item">
              <h3>Service Availability</h3>
              <p>We strive for 99.9% uptime but cannot guarantee uninterrupted service. Blockchain network congestion or technical issues may occasionally affect platform performance.</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="terms-section">
          <div className="terms-footer">
            <h2>Questions About Terms?</h2>
            <p>If you have questions about these terms or need clarification, please contact us:</p>
            <a href="mailto:legal@penny.io" className="terms-contact">support@penny.io</a>
            <div className="last-updated">
              <p>Last updated: October 28, 2025</p>
              <p>These terms are effective immediately upon posting.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Terms;