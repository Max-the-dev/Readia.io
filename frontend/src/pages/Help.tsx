
import { HelpCircle, BookOpen, Users, Mail } from 'lucide-react';

function Help() {
  return (
    <div className="help-page">
      <div className="container">
        {/* Hero Section */}
        <div className="help-hero">
          <h1>Help Center</h1>
          <p className="hero-subtitle">
            Find the help you need.
          </p>
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
                  <summary>What is Penny.io?</summary>
                  <p>Penny.io is a micropayment platform that allows writers to monetize their content through small payments ($0.01-$1.00) from readers. Writers set prices per article, and readers pay only for what they want to read.</p>
                </details>
                <details className="faq-question">
                  <summary>How do I get started as a reader?</summary>
                  <p>Simply connect your crypto wallet (MetaMask, Coinbase Wallet, etc.), browse articles, and click "Purchase Article" to unlock content. Payments are instant and secure.</p>
                </details>
                <details className="faq-question">
                  <summary>How do I start publishing content?</summary>
                  <p>Connect your wallet, click "Write" in the navigation, create your article, set a price between $0.01-$1.00, and publish. You'll receive payments instantly when readers purchase your content.</p>
                </details>
              </div>
            </div>

            <div className="faq-item">
              <h3>Payments & Wallets</h3>
              <div className="faq-questions">
                <details className="faq-question">
                  <summary>What wallets are supported?</summary>
                  <p>We support MetaMask, Coinbase Wallet, WalletConnect, Phantom, and most Ethereum-compatible wallets. Make sure your wallet is connected to a supported network.</p>
                </details>
                <details className="faq-question">
                  <summary>What are the transaction fees?</summary>
                  <p>Network fees range from $0.05 on Solana to $0.01 on Base. Penny.io charges no platform fees - you keep 100% of your earnings.</p>
                </details>
                <details className="faq-question">
                  <summary>Which networks are supported?</summary>
                  <p>We support Base USDC, Sepolia Base (TestNet), and Solana USDC (coming soon). We recommend using Base USDC.</p>
                </details>
              </div>
            </div>

            <div className="faq-item">
              <h3>Content & Publishing</h3>
              <div className="faq-questions">
                <details className="faq-question">
                  <summary>How much should I charge for my articles?</summary>
                  <p>Start with lower prices ($0.01-$0.05) to build readership, then adjust based on engagement. Consider your content length and value when pricing.</p>
                </details>
                <details className="faq-question">
                  <summary>Can I edit or delete articles after publishing?</summary>
                  <p>Yes. You can find edit and delete buttons next to each of your articles in the dashboard view.</p>
                </details>
                <details className="faq-question">
                  <summary>Is there a content review process?</summary>
                  <p>We have automated content filters, but no manual review process. Please ensure your content follows our community guidelines.</p>
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
                  <BookOpen size={24} />
                </div>
                <h3>Documentation</h3>
                <p>Check our comprehensive guides and technical documentation.</p>
              </div>
              <a href="/resources" className="contact-link">View Resources</a>
            </div>
            
            <div className="contact-item">
              <div className="contact-text">
                <div className="contact-icon">
                  <Users size={24} />
                </div>
                <h3>Community</h3>
                <p>Join our community for help from other users and updates.</p>
              </div>
              <a href="https://x.com/i/communities/1986841883000156422" className="contact-link" target='_blank' rel='noopener noreferrer'>Join Community</a>
            </div>
            
            <div className="contact-item">
              <div className="contact-text">
                <div className="contact-icon">
                  <Mail size={24} />
                </div>
                <h3>Email Support</h3>
                <p>Contact our support team for personalized assistance.</p>
              </div>
              <a href="/Contact" className="contact-link">Send Message</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Help;