import { Scale, CheckCircle, Shield, Users, FileText, AlertTriangle } from 'lucide-react';

function Terms() {
  return (
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
  );
}

export default Terms;
