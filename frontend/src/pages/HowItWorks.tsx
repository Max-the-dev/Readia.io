import { BookOpen, Wallet, PenTool, Eye, DollarSign, Users, ArrowRight, Check } from 'lucide-react';

function HowItWorks() {
  return (
    <div className="how-it-works-page">
      <div className="container">
        {/* Hero Section */}
        <div className="how-it-works-hero">
          <h1>How Penny.io Works</h1>
          <p className="hero-subtitle">
            Simple micropayments for quality content. <br></br> Pay only for what you read, earn from every reader.
          </p>
        </div>

        {/* For Readers Section */}
        <section className="how-section">
          <div className="section-header">
            <BookOpen size={32} />
            <h2>For Readers</h2>
          </div>
          <p className="section-description">
            Discover and access premium content without expensive subscriptions. 
            Pay small amounts only for articles you actually want to read.
          </p>
          
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Browse Articles</h3>
                <p>Explore our collection of articles. Read the preview of any article for free to see if it interests you.</p>
              </div>
            </div>
            
            <ArrowRight className="step-arrow" size={24} />
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Connect Wallet</h3>
                <p>Connect your crypto wallet (MetaMask, Coinbase Wallet, etc.) to enable payments. No account signup required.</p>
              </div>
            </div>
            
            <ArrowRight className="step-arrow" size={24} />
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Pay & Read</h3>
                <p>Pay a small amount ($0.01 - $1.00) to unlock the full article. Payment is instant and secure.</p>
              </div>
            </div>
            
            <ArrowRight className="step-arrow" size={24} />
            
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Tip Authors</h3>
                <p>Enjoyed the article? Send an optional tip to support the author and encourage more quality content.</p>
              </div>
            </div>
          </div>
        </section>

        {/* For Writers Section */}
        <section className="how-section">
          <div className="section-header">
            <PenTool size={32} />
            <h2>For Writers</h2>
          </div>
          <p className="section-description">
            Monetize your content directly without ads or subscription barriers. 
            Set your own prices and earn from every reader.
          </p>
          
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Connect Wallet</h3>
                <p>Connect your crypto wallet to start publishing. Your wallet address serves as your author identity.</p>
              </div>
            </div>
            
            <ArrowRight className="step-arrow" size={24} />
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Write Content</h3>
                <p>Create your article using our built-in editor with markdown support. Write quality content that provides value.</p>
              </div>
            </div>
            
            <ArrowRight className="step-arrow" size={24} />
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Set Price</h3>
                <p>Choose your article price between $0.01 and $1.00. Consider the value and length of your content.</p>
              </div>
            </div>
            
            <ArrowRight className="step-arrow" size={24} />
            
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Earn Instantly</h3>
                <p>Receive payments directly to your wallet as readers purchase your articles. Track performance in your dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="how-section">
          <div className="section-header">
            <Wallet size={32} />
            <h2>The Technology</h2>
          </div>
          <div className="tech-grid">
            <div className="tech-card">
              <h3>x402 Protocol</h3>
              <p>
                Built on the x402 micropayment standard, enabling seamless 
                small-value transactions for web content.
              </p>
            </div>
            <div className="tech-card">
              <h3>Blockchain Security</h3>
              <p>
                All payments are secured by blockchain technology, ensuring 
                transparent and immutable transactions.
              </p>
            </div>
            <div className="tech-card">
              <h3>Multi-Chain Support</h3>
              <p>
                Compatible with Ethereum, Polygon, Base, and other major 
                blockchain networks for maximum accessibility.
              </p>
            </div>
            <div className="tech-card">
              <h3>Instant Payments</h3>
              <p>
                Payments are processed immediately, allowing instant access 
                to content and real-time earnings for authors.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="how-section">
          <div className="section-header">
            <Users size={32} />
            <h2>Why Choose Penny.io</h2>
          </div>
          <div className="benefits-grid">
            <div className="benefit-item">
              <Check size={20} />
              <div>
                <h4>No Subscriptions</h4>
                <p>Pay only for content you actually read</p>
              </div>
            </div>
            <div className="benefit-item">
              <Check size={20} />
              <div>
                <h4>Direct Creator Support</h4>
                <p>100% of payments go directly to content creators</p>
              </div>
            </div>
            <div className="benefit-item">
              <Check size={20} />
              <div>
                <h4>Instant Payments</h4>
                <p>Immediate access for readers, instant earnings for writers</p>
              </div>
            </div>
            <div className="benefit-item">
              <Check size={20} />
              <div>
                <h4>No Account Required</h4>
                <p>Just connect your crypto wallet and start reading or writing</p>
              </div>
            </div>
            <div className="benefit-item">
              <Check size={20} />
              <div>
                <h4>Transparent Pricing</h4>
                <p>Clear upfront pricing with no hidden fees or surprises</p>
              </div>
            </div>
            <div className="benefit-item">
              <Check size={20} />
              <div>
                <h4>Quality Content</h4>
                <p>Micropayment model encourages high-quality, valuable content</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="how-cta">
          <h2>Ready to Get Started?</h2>
          <p>
            Join thousands of readers and writers who are already part of the 
            micropayment revolution.
          </p>
          <div className="cta-buttons">
            <a href="/" className="cta-button primary">Start Reading</a>
            <a href="/write" className="cta-button secondary">Start Writing</a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HowItWorks;