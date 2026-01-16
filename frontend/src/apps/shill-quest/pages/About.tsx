import { Target, Globe, Zap, Shield, Heart, Users, Layers, Coins } from 'lucide-react';

interface AboutProps {
  setPage: (page: string) => void;
}

function About({ setPage }: AboutProps) {
  return (
    <div className="about-page">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero">
          <h1>About ShillQuest</h1>
          <p className="hero-subtitle">
            Part of the Readia ecosystem - revolutionizing creator payments
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
              ShillQuest bridges the gap between projects seeking authentic promotion and creators
              looking to earn from their influence. We believe promotional content should be
              transparent, fairly compensated, and instantly paid.
            </p>
            <p>
              Built on Readia's x402 micropayment infrastructure, ShillQuest eliminates the
              traditional friction of influencer marketing - no invoices, no payment delays,
              no intermediaries.
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
              We envision a world where promotional content is valued fairly, creators are
              empowered to monetize their influence, and projects can reach authentic audiences
              without middlemen taking massive cuts.
            </p>
            <div className="vision-points">
              <div className="vision-point">
                <Zap size={24} />
                <div>
                  <h3>Instant Payments</h3>
                  <p>Get paid the moment your submission is approved. No waiting, no invoices.</p>
                </div>
              </div>
              <div className="vision-point">
                <Shield size={24} />
                <div>
                  <h3>Transparent & Secure</h3>
                  <p>Escrow-backed campaigns ensure funds are always available for approved content.</p>
                </div>
              </div>
              <div className="vision-point">
                <Heart size={24} />
                <div>
                  <h3>Creator-First</h3>
                  <p>Built for creators. Fair payouts, clear requirements, no hidden fees.</p>
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
                Every creator deserves fair compensation for their work. Every project deserves
                authentic promotion at fair prices.
              </p>
            </div>
            <div className="value-card">
              <h3>Transparency</h3>
              <p>
                Clear requirements, upfront payouts, and on-chain payments. No hidden fees
                or surprise deductions.
              </p>
            </div>
            <div className="value-card">
              <h3>Speed</h3>
              <p>
                Instant payments via x402. No more waiting 30-90 days for influencer
                marketing payouts.
              </p>
            </div>
            <div className="value-card">
              <h3>Accessibility</h3>
              <p>
                Anyone can participate. No minimum follower counts, no gatekeeping.
                Quality content gets rewarded.
              </p>
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="about-section">
          <div className="section-header">
            <Users size={32} />
            <h2>Founder</h2>
          </div>
          <div className="team-content">
            <p>
              My name is Maxim. An enthusiast who believes in the power of blockchain &
              decentralized creator monetization.
            </p>
            <div className="founder-info">
              <a
                href="https://x.com/Readia_io"
                target="_blank"
                rel="noopener noreferrer"
                className="x-link"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Readia.io
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

        {/* Ecosystem Section */}
        <section className="about-section">
          <div className="section-header">
            <Layers size={32} />
            <h2>The Readia Ecosystem</h2>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <h3>Logos</h3>
              <p>
                The core platform. Writers set prices per article, readers pay micropayments
                to unlock. No subscriptions, no ads.
              </p>
            </div>
            <div className="value-card current">
              <span className="badge">You are here</span>
              <h3>ShillQuest</h3>
              <p>
                Content quests for promotional campaigns. Projects fund bounties, creators
                make content, get paid instantly.
              </p>
            </div>
            <div className="value-card coming">
              <span className="badge">Coming Soon</span>
              <h3>Readia Pro</h3>
              <p>
                Premium tools for creators - analytics, audience insights, and advanced
                monetization options.
              </p>
            </div>
          </div>
        </section>

        {/* $READ Token Section */}
        <section className="about-section">
          <div className="section-header">
            <Coins size={32} />
            <h2>$READ Token</h2>
          </div>
          <div className="technology-content">
            <p>The $READ token powers the entire Readia ecosystem:</p>
            <ul>
              <li><strong>Lower Fees:</strong> Hold $READ to reduce platform fees by up to 50%</li>
              <li><strong>Priority Access:</strong> Early access to high-paying quests</li>
              <li><strong>Governance:</strong> Vote on platform features and fee structures</li>
              <li><strong>Verified Status:</strong> Earn verified badges for faster approvals</li>
              <li><strong>Revenue Share:</strong> Earn from platform transaction volume</li>
            </ul>
          </div>
        </section>

        {/* CTA Section */}
        <section className="about-cta">
          <h2>Join the Ecosystem</h2>
          <p>
            Whether you're a creator looking to earn or a project seeking authentic promotion,
            ShillQuest is built for you.
          </p>
          <div className="cta-buttons">
            <a href="#" className="cta-button primary" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>Browse Quests</a>
            <a href="#" className="cta-button secondary" onClick={(e) => { e.preventDefault(); setPage('create'); }}>Create Quest</a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
