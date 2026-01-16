import { Shield, CheckCircle, Lock, Users, Globe, Eye, EyeOff } from 'lucide-react';

function Privacy() {
  return (
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
            <h2>Privacy First</h2>
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
                <li><strong>Content Data:</strong> Articles you publish and their metadata (titles, prices, publish dates)</li>
                <li><strong>Transaction Records:</strong> Public on-chain activity</li>
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
              <h3>Open Source</h3>
              <p>Our code and core functionality are open source and auditable by the community.</p>
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
            <p>If you have any questions about our privacy practices, please contact us at:</p>
            <a href="/contact" className="privacy-contact">Contact Us</a>
            <div className="last-updated">
              <p>Last updated: October 28, 2025</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Privacy;