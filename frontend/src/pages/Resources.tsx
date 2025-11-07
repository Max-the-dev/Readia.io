import React, { useState } from 'react';
import { BookOpen, Code, FileText, Video, Download, ExternalLink, Lightbulb, Zap, Shield, Users, X } from 'lucide-react';

type GuideKey = 'reading' | 'publishing' | 'wallet' | 'x402';

function Resources() {
  const [selectedGuide, setSelectedGuide] = useState<GuideKey | null>(null);

  const guides: Record<GuideKey, {
    title: string;
    icon: React.ReactElement;
    description: string;
    steps: string[];
    detailedSteps: Array<{ step: string; details: string }>;
  }> = {
    reading: {
      title: "Reading Your First Article",
      icon: <BookOpen size={24} />,
      description: "Learn how to browse, preview, and purchase articles on Penny.io",
      steps: [
        "Browse available articles",
        "Connect your wallet", 
        "Purchase and read"
      ],
      detailedSteps: [
        {
          step: "Browse available articles",
          details: "Visit the homepage to see featured articles. Use the search and filter options to find content that interests you. Read the preview (first 3 paragraphs) to decide if you want to purchase the full article."
        },
        {
          step: "Connect your wallet",
          details: "Click 'Connect Wallet' in the top right corner. Choose from MetaMask, Coinbase Wallet, or WalletConnect. Make sure you're on a supported network like Polygon or Base for lower fees."
        },
        {
          step: "Purchase and read",
          details: "Click on any article to view the full page. If you want to read beyond the preview, click 'Purchase Article' and confirm the transaction in your wallet. Once confirmed, you'll have instant access to the full content."
        }
      ]
    },
    publishing: {
      title: "Publishing Your First Article",
      icon: <FileText size={24} />,
      description: "Complete guide to writing, pricing, and publishing your content.",
      steps: [
        "Connect your wallet",
        "Write your content", 
        "Set price and publish"
      ],
      detailedSteps: [
        {
          step: "Connect your wallet",
          details: "Before you can publish, connect your crypto wallet. This wallet address will receive payments when readers purchase your articles. Make sure to use a wallet you control and keep secure."
        },
        {
          step: "Write your content",
          details: "Click 'Write' in the navigation menu. Use our markdown editor to format your article. Write a compelling preview (first 3 paragraphs) as this is what readers see for free. Aim for 500-1500 words for optimal engagement."
        },
        {
          step: "Set price and publish",
          details: "Choose a price between $0.01-$1.00. Start lower ($0.01-$0.05) to build readership. Add tags and a compelling title. Click 'Publish' and your article will be live immediately for readers to discover and purchase."
        }
      ]
    },
    wallet: {
      title: "Wallet Setup Guide",
      icon: <Shield size={24} />,
      description: "Step-by-step guide for setting up and connecting your crypto wallet.",
      steps: [
        "Choose a wallet",
        "Install and setup", 
        "Connect to Penny.io"
      ],
      detailedSteps: [
        {
          step: "Choose a wallet",
          details: "We recommend MetaMask for beginners, Coinbase Wallet for easy onramp, or any WalletConnect-compatible wallet. Consider hardware wallets like Ledger for storing larger amounts securely."
        },
        {
          step: "Install and setup",
          details: "Download the wallet app or browser extension from the official website. Create a new wallet and securely store your seed phrase (12-24 words) offline. Never share your seed phrase with anyone."
        },
        {
          step: "Connect to Penny.io",
          details: "On Penny.io, click 'Connect Wallet' and select your wallet type. Approve the connection in your wallet app. Switch to a supported network (Polygon, Base, Optimism, or Arbitrum) for lower transaction fees."
        }
      ]
    },
    x402: {
      title: "x402 Protocol Integration",
      icon: <Code size={24} />,
      description: "Learn how Penny.io implements the x402 micropayment protocol for seamless content monetization.",
      steps: [
        "Understanding x402",
        "Payment flow setup",
        "Implementation guide"
      ],
      detailedSteps: [
        {
          step: "Understanding x402",
          details: "x402 is a web standard that enables micropayments for content. It allows websites to request payments from visitors in exchange for access to content or services. The protocol uses HTTP status codes and headers to communicate payment requirements."
        },
        {
          step: "Payment flow setup",
          details: "When a reader visits a paywalled article, our system checks if they've already paid. If not, we return an x402 status with payment details including the amount, recipient address, and payment pointer. The reader's wallet handles the payment automatically."
        },
        {
          step: "Implementation guide (coming soon)",
          details: "For developers: Share your custom API, technical documnetation, or code snippets on the platform to instantly monetize it. "
        }
      ]
    }
  };

  const closeModal = () => setSelectedGuide(null);
  return (
    <div className="resources-page">
      <div className="container">
        {/* Hero Section */}
        <div className="resources-hero">
          <h1>Resources & Documentation</h1>
          <p className="hero-subtitle">
            Everything you need to get started with Penny.io <br />
          </p>
        </div>

        {/* Quick Start Section */}
        <section className="resources-section">
          <div className="section-header">
            <Zap size={32} />
            <h2>Quick Start Guides</h2>
          </div>
          <p className="section-description">
            
          </p>
          
          <div className="guides-grid">
            <div className="guide-card" onClick={() => setSelectedGuide('reading')}>
              <div className="guide-icon">
                {guides.reading.icon}
              </div>
              <h3>{guides.reading.title}</h3>
              <p>{guides.reading.description}</p>
              <div className="guide-steps">
                {guides.reading.steps.map((step, index) => (
                  <div key={index} className="guide-step">{index + 1}. {step}</div>
                ))}
              </div>
              <div className="guide-cta">
                <span>Click for detailed guide →</span>
              </div>
            </div>
            
            <div className="guide-card" onClick={() => setSelectedGuide('publishing')}>
              <div className="guide-icon">
                {guides.publishing.icon}
              </div>
              <h3>{guides.publishing.title}</h3>
              <p>{guides.publishing.description}</p>
              <div className="guide-steps">
                {guides.publishing.steps.map((step, index) => (
                  <div key={index} className="guide-step">{index + 1}. {step}</div>
                ))}
              </div>
              <div className="guide-cta">
                <span>Click for detailed guide →</span>
              </div>
            </div>
            
            <div className="guide-card" onClick={() => setSelectedGuide('wallet')}>
              <div className="guide-icon">
                {guides.wallet.icon}
              </div>
              <h3>{guides.wallet.title}</h3>
              <p>{guides.wallet.description}</p>
              <div className="guide-steps">
                {guides.wallet.steps.map((step, index) => (
                  <div key={index} className="guide-step">{index + 1}. {step}</div>
                ))}
              </div>
              <div className="guide-cta">
                <span>Click for detailed guide →</span>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Section */}
        <section className="resources-section">
          <div className="section-header">
            <Code size={32} />
            <h2>Technical Documentation</h2>
          </div>
          <p className="section-description">
          </p>
          
          <div className="docs-grid">
            <div className="doc-item clickable" onClick={() => setSelectedGuide('x402')}>
              <h3>x402 Protocol Integration</h3>
              <p>Learn how Penny.io implements the x402 micropayment protocol for seamless content monetization.</p>
              <div className="doc-tags">
                <span className="doc-tag">Protocol</span>
                <span className="doc-tag">Technical</span>
              </div>
              <div className="doc-cta">
                <span>Click for detailed guide →</span>
              </div>
            </div>
            
            <div className="doc-item coming-soon">
              <h3>API Documentation</h3>
              <p>Learn how to monetize your custom API by integrating with Penny.io</p>
              <div className="doc-tags">
                <span className="doc-tag">API</span>
                <span className="doc-tag">Development</span>
              </div>
              <div className="coming-soon-badge">
                <span>Coming Soon</span>
              </div>
            </div>
          </div>
        </section>

        {/* Best Practices Section */}
        <section className="resources-section">
          <div className="section-header">
            <Lightbulb size={32} />
            <h2>Best Practices</h2>
          </div>
          
          <div className="practices-container">
            <div className="practice-category">
              <p><br></br></p>
              <h3>For Writers</h3>
              <div className="practice-list">
                <div className="practice-item">
                  <strong>Pricing Strategy:</strong> Start with lower prices ($0.01-$0.05) to build readership, then adjust based on engagement.
                </div>
                <div className="practice-item">
                  <strong>Content Quality:</strong> Focus on providing clear value. Well-researched, actionable content performs best.
                </div>
                <div className="practice-item">
                  <strong>Article Length:</strong> 500-1500 words typically work well for micropayments. Match length to price.
                </div>
                <div className="practice-item">
                  <strong>Preview Optimization:</strong> Write compelling previews that give readers a taste without giving away everything.
                </div>
              </div>
            </div>
            
            <div className="practice-category">
              <p><br></br></p>
              <h3>For Readers</h3>
              <div className="practice-list">
                <div className="practice-item">
                  <strong>Wallet Security:</strong> Never share your private keys. Use hardware wallets for larger amounts.
                </div>
                <div className="practice-item">
                  <strong>Network Choice:</strong> Use Polygon or Base networks to minimize transaction fees.
                </div>
                <div className="practice-item">
                  <strong>Preview Reading:</strong> Always read the preview carefully to ensure the content matches your interests.
                </div>
                <div className="practice-item">
                  <strong>Supporting Authors:</strong> Consider tipping authors whose content you find particularly valuable.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Downloads Section */}
        <section className="resources-section">
          <div className="section-header">
            <Download size={32} />
            <h2>Downloads & Tools</h2>
          </div>
          
          <div className="downloads-grid">
            <div className="download-item">
              <div className="download-icon">
                <FileText size={24} />
              </div>
              <div className="download-content">
                <div className="download-text">
                  <h3>Writer's Toolkit</h3>
                  <p>Templates and guidelines for creating successful content.</p>
                </div>
                <button className="download-button">
                  <Download size={16} />
                  Download PDF
                </button>
              </div>
            </div>
            
            <div className="download-item coming-soon">
              <div className="download-icon">
                <Code size={24} />
              </div>
              <div className="download-content">
                <div className="download-text">
                  <h3>Developer SDK</h3>
                  <p>SDK for integrating Penny.io into your applications.</p>
                </div>
                <div className="coming-soon-badge">
                  <span>Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="resources-section">
          <div className="section-header">
            <Users size={32} />
            <h2>Community & Support</h2>
          </div>
          
          <div className="community-links">
            <div className="community-item">
              <div className="community-text">
                <h3>X Community</h3>
                <p>Join our X community to connect with other users, get help, and share feedback.</p>
              </div>
              <a href="#" className="community-link">
                <ExternalLink size={16} />
                X Community
              </a>
            </div>
            
            <div className="community-item">
              <div className="community-text">
                <h3>GitHub Repository</h3>
                <p>Contribute to the project, report bugs, and view our open-source code.</p>
              </div>
              <a href="https://github.com/mbeliogl/Penny.io" className="community-link" target='_blank' rel='noopener noreferrer'>
                <ExternalLink size={16} />
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Video Tutorials Section */}
        <section className="resources-section">
          <div className="section-header">
            <Video size={32} />
            <h2>Video Tutorials</h2>
          </div>
          
          <div className="videos-grid">
            <div className="video-card coming-soon">
              <div className="video-placeholder">
                <Video size={48} />
                <span>Coming Soon</span>
              </div>
              <h3>Getting Started with Penny.io</h3>
              <p>5-minute walkthrough of the platform for new users.</p>
              <div className="coming-soon-badge">
                <span>Coming Soon</span>
              </div>
            </div>
            
            <div className="video-card coming-soon">
              <div className="video-placeholder">
                <Video size={48} />
                <span>Coming Soon</span>
              </div>
              <h3>Setting Up MetaMask</h3>
              <p>Complete guide to installing and configuring MetaMask.</p>
              <div className="coming-soon-badge">
                <span>Coming Soon</span>
              </div>
            </div>
            
            <div className="video-card coming-soon">
              <div className="video-placeholder">
                <Video size={48} />
                <span>Coming Soon</span>
              </div>
              <h3>Maximizing Your Earnings</h3>
              <p>Advanced strategies for content creators on the platform.</p>
              <div className="coming-soon-badge">
                <span>Coming Soon</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="resources-section">
          <div className="faq-preview">
            <h2>Frequently Asked Questions</h2>
            <p>Quick answers to common questions. <br></br> For more detailed help, visit our Help Center.</p>
            
            <div className="faq-items">
              <div className="faq-item">
                <h4>What wallets are supported?</h4>
                <p>MetaMask, Coinbase Wallet, WalletConnect, and most Ethereum-compatible wallets.</p>
              </div>
              
              <div className="faq-item">
                <h4>How much do transactions cost?</h4>
                <p>Network fees range from $0.001 on Polygon to $0.02 on Base. No platform fees.</p>
              </div>
              
              <div className="faq-item">
                <h4>Can I publish content for free?</h4>
                <p>Yes, publishing is completely free.</p>
              </div>
            </div>
            
            <div className="faq-cta">
              <a href="/help" className="cta-button primary">Visit Help Center</a>
            </div>
          </div>
        </section>
      </div>

      {/* Guide Modal */}
      {selectedGuide && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <div className="modal-icon">
                  {guides[selectedGuide].icon}
                </div>
                <h2>{guides[selectedGuide].title}</h2>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">{guides[selectedGuide].description}</p>
              
              <div className="detailed-steps">
                {guides[selectedGuide].detailedSteps.map((stepData, index) => (
                  <div key={index} className="detailed-step">
                    <div className="step-number">{index + 1}</div>
                    <div className="step-content">
                      <h4>{stepData.step}</h4>
                      <p>{stepData.details}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="modal-footer">
                <button className="cta-button primary" onClick={closeModal}>
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Resources;