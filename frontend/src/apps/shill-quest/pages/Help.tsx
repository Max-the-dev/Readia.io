import { HelpCircle, Mail } from 'lucide-react';

interface HelpProps {
  setPage: (page: string) => void;
}

function Help({ setPage }: HelpProps) {
  return (
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
  );
}

export default Help;
