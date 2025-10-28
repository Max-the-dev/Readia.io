import { Users, Target, Zap, Shield, Globe, Heart, Twitter } from 'lucide-react';
import XLogo from '../components/XLogo';

function About() {
  return (
    <div className="about-page">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero">
          <h1>About Penny.io</h1>
          <p className="hero-subtitle">
            Revolutionizing digital content with micropayments using the x402 protocol
          </p>
        </div>

        {/* Mission Section */}
        <section className="about-section">
          <div className="section-header">
            <Target size={32} />
            <h2>Our Mission</h2>
          </div>
          <div className="mission-content">
            <p>
              At Penny.io, we believe that quality content deserves fair compensation, and readers 
              should only pay for what they truly value. We're building the future of digital 
              publishing where creators can earn sustainably and readers can access premium content 
              without the burden of expensive subscriptions.
            </p>
            <p>
              Our platform leverages the power of micropayments and the x402 protocol to create 
              a seamless, transparent, and efficient content economy that benefits everyone.
            </p>
          </div>
        </section>

        {/* Vision Section */}
        <section className="about-section">
          <div className="section-header">
            <Globe size={32} />
            <h2>Our Vision</h2>
          </div>
          <div className="vision-content">
            <p>
              We envision a world where digital content is valued fairly, creators are empowered 
              to focus on quality over quantity, and readers have unlimited access to diverse, 
              high-quality content at prices that make sense.
            </p>
            <div className="vision-points">
              <div className="vision-point">
                <Zap size={24} />
                <div>
                  <h3>Instant Value Exchange</h3>
                  <p>Immediate payments for immediate access, no waiting, no subscriptions.</p>
                </div>
              </div>
              <div className="vision-point">
                <Shield size={24} />
                <div>
                  <h3>Transparent & Secure</h3>
                  <p>Blockchain-based payments ensure transparency and security for all transactions.</p>
                </div>
              </div>
              <div className="vision-point">
                <Heart size={24} />
                <div>
                  <h3>Creator-First</h3>
                  <p>Built by creators, for creators. We understand the challenges of content monetization.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="about-section">
          <div className="section-header">
            <Users size={32} />
            <h2>Our Values</h2>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <h3>Fairness</h3>
              <p>
                Every creator deserves fair compensation for their work. Every reader deserves 
                fair pricing for quality content.
              </p>
            </div>
            <div className="value-card">
              <h3>Innovation</h3>
              <p>
                We're pioneering new ways to monetize content using cutting-edge blockchain 
                technology and payment protocols.
              </p>
            </div>
            <div className="value-card">
              <h3>Transparency</h3>
              <p>
                Open-source principles, clear pricing, and transparent revenue sharing. 
                No hidden fees or surprise charges.
              </p>
            </div>
            <div className="value-card">
              <h3>Accessibility</h3>
              <p>
                Making quality content accessible to everyone, regardless of their ability 
                to commit to expensive subscriptions.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="about-section">
          <div className="section-header">
            <Users size={32} />
            <h2>Founder</h2>
          </div>
          <div className="team-content">
            <p>
              My name is Maxim. An enthusiast who believe in the power of blockchain & decentralized content monetization.
            </p>

            
              <div className='founder-info'>
                <a
                  href='https://x.com/devvinggold'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='x-link'
                >
                  <XLogo size={20} />
                  follow @devinggold
                </a>
              </div>
            
      
            <div className="team-stats">
              <div className="stat">
                <h3>Founded</h3>
                <p>2025</p>
              </div>
              <div className="stat">
                <h3>Focus</h3>
                <p>Creator Economy</p>
              </div>
              <div className="stat">
                <h3>Technology</h3>
                <p>x402 Protocol</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="about-section">
          <div className="section-header">
            <Zap size={32} />
            <h2>The Technology</h2>
          </div>
          <div className="technology-content">
            <h3>Built on x402 Protocol</h3>
            <p>
              The x402 protocol enables seamless micropayments for web content. Unlike traditional 
              payment systems that require expensive processing fees, x402 makes it economical to 
              charge small amounts (as low as $0.01) for individual pieces of content.
            </p>
            
            <h3>Key Features</h3>
            <ul>
              <li><strong>Instant Payments:</strong> Payments are processed immediately upon article unlock</li>
              <li><strong>Low Fees:</strong> Minimal transaction costs make micropayments viable</li>
              <li><strong>Multi-Chain Support:</strong> Compatible with Ethereum, Polygon, Base, and more</li>
              <li><strong>Secure:</strong> All transactions are secured by blockchain technology</li>
              <li><strong>Transparent:</strong> All payment flows are auditable and transparent</li>
            </ul>
          </div>
        </section>

        {/* Call to Action */}
        <section className="about-cta">
          <h2>Join the Revolution</h2>
          <p>
            Whether you're a creator looking to monetize your content or a reader seeking 
            quality content without subscription commitments, Penny.io is built for you.
          </p>
          <div className="cta-buttons">
            <a href="/write" className="cta-button primary">Start Writing</a>
            <a href="/" className="cta-button secondary">Explore Articles</a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;