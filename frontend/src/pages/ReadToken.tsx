import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Github, Vote, Coins, Sparkles, FileText, Shield, DollarSign, Heart, Copy, Check, Lock, ChevronDown, Percent, Award, Zap, Gift, TrendingUp, Headphones, Rocket, Users, UserPlus, Flag, ArrowLeftRight, Wallet, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import XLogo from '../components/XLogo';
import {
  TokenBenefitCard,
  RoadmapItem,
  TeamMemberCard,
  PartnershipCard,
} from '../components/ecosystem';

const CONTRACT_ADDRESS = 'C8wvVNuRPm237bQqqcfRxas77GTK3RzzoBCkWgrGpump';

function ReadToken() {
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);

  // Format market cap for display
  const formatMarketCap = (value: number): string => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch token price from DexScreener
  useEffect(() => {
    const fetchTokenPrice = async () => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`
        );
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          setMarketCap(pair.fdv || pair.marketCap || 0);
          setPriceChange(pair.priceChange?.h24 || 0);
        }
      } catch (error) {
        console.error('Error fetching token price:', error);
      }
    };

    fetchTokenPrice();
    const interval = setInterval(fetchTokenPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Data for sections
  const tokenBenefits = [
    { icon: <Vote size={24} />, title: 'Governance', description: 'Vote on key decisions, resource allocation, and revenue distribution' },
    { icon: <Coins size={24} />, title: 'Revenue Share', description: 'Earn a portion of platform revenue distributed to holders' },
    { icon: <Sparkles size={24} />, title: 'Early Access', description: 'Be first to try new features and beta programs' },
    { icon: <Percent size={24} />, title: 'Reduced Fees', description: 'Enjoy discounted platform fees as a token holder' },
    { icon: <Award size={24} />, title: 'Holder Badges', description: 'Stand out with exclusive badges as an early supporter' },
    { icon: <Zap size={24} />, title: 'Pay with $READ', description: 'Use $READ to pay for services and products in the ecosystem' },
    { icon: <Gift size={24} />, title: 'Exclusive Airdrops', description: 'Receive token airdrops and rewards for loyal holders' },
    { icon: <TrendingUp size={24} />, title: 'Creator Rewards', description: 'Earn $READ for creating content in the ecosystem' },
    { icon: <Headphones size={24} />, title: 'Priority Support', description: 'Get faster response times from the team' },
    { icon: <Rocket size={24} />, title: 'Creator Boosts', description: 'Amplify your content with enhanced visibility' },
    { icon: <Users size={24} />, title: 'Private Community', description: 'Access holder-only channels and discussions' },
    { icon: <UserPlus size={24} />, title: 'Referral Rewards', description: 'Earn bonus tokens when you bring new users' },
  ];

  const highlights: { title: string; description: string; bgIcon: LucideIcon }[] = [
    { title: 'First on x402', description: 'Readia is the first content marketplace built on Coinbase\'s x402 payment protocol—a new standard for internet commerce. We\'re not building on existing rails; we\'re helping define what comes next.', bgIcon: Flag },
    { title: 'No Middlemen', description: 'No ads interrupting your reading. No personal data harvested and sold. No payment processors skimming fees. Just direct, transparent transactions between consumers and creators.', bgIcon: ArrowLeftRight },
    { title: 'Instant Full Payouts', description: 'Creators receive 100% of every payment the moment it happens. No waiting for monthly payouts. No platform fees eating into your earnings. Transaction costs are near-zero, so more money stays in your pocket.', bgIcon: Wallet },
    { title: 'Secure by Design', description: 'Every transaction is cryptographically secured and publicly verifiable on the blockchain. No centralized database to breach, no credentials to steal. Security isn\'t a feature—it\'s the foundation.', bgIcon: Shield },
    { title: 'Private by Default', description: 'No sign-up forms asking for your life story and credit card information. No personal data required. Stay anonymous or build a reputation publically — your choice.', bgIcon: EyeOff },
    { title: 'For Everyone', description: 'Whether you\'re crypto-native or have never touched a wallet, Readia meets you where you are. Sign up and pay with familiar methods like X OAuth and Apple Pay. Start earning instantly - zero learning curve.', bgIcon: Users },
  ];

  const roadmapData = [
    {
      quarter: 'Q4',
      year: '2024',
      status: 'completed' as const,
      title: 'Platform Launch',
      milestones: [
        'x402 payment protocol integration',
        'Supabase database setup',
        'Basic content creation and monetization',
        '$READ token launch',
      ],
    },
    {
      quarter: 'Q1',
      year: '2025',
      status: 'in-progress' as const,
      title: 'Ecosystem Expansion',
      milestones: [
        'Enhanced analytics dashboard',
        'Author verification system',
        'Mobile-responsive improvements',
        'CoinGecko & Jupiter listings',
      ],
    },
    {
      quarter: 'Q2',
      year: '2025',
      status: 'planned' as const,
      title: 'Governance & Staking',
      milestones: [
        'DAO governance implementation',
        'Token staking rewards program',
        'Revenue sharing mechanism',
        'Premium content tiers',
      ],
    },
    {
      quarter: 'Q3',
      year: '2025',
      status: 'planned' as const,
      title: 'Platform Maturity',
      milestones: [
        'Multi-chain support',
        'Creator NFTs and collectibles',
        'Advanced recommendation engine',
        'Mobile apps (iOS/Android)',
      ],
    },
  ];

  const teamMembers = [
    {
      name: 'Founder',
      role: 'Founder & Developer',
      bio: 'Building the future of decentralized content economy.',
      social: {
        twitter: 'https://x.com/devvinggold',
        github: 'https://github.com/Max-the-dev/Readia.io',
      },
    },
    {
      name: 'The Intern',
      role: 'Here for the vibes',
      bio: 'Forced to shill Readia and make mediocre memes.',
      social: {
        twitter: 'https://x.com/Readia_io',
        community: 'https://x.com/i/communities/1986841883000156422',
      },
    },
  ];

  const partnerships = [
    { name: 'Base', category: 'Layer 2', description: "Built on Coinbase's secure and scalable L2 network", link: 'https://base.org' },
    { name: 'Supabase', category: 'Infrastructure', description: 'PostgreSQL database and storage backend', link: 'https://supabase.com' },
    { name: 'RainbowKit', category: 'Wallet', description: 'Best-in-class wallet connection experience', link: 'https://rainbowkit.com' },
    { name: 'CoinGecko', category: 'Listing', description: 'Token price tracking and market data', link: 'https://www.coingecko.com/en/coins/readia-io' },
    { name: 'Jupiter', category: 'DEX', description: 'Decentralized exchange for token swaps', link: `https://jup.ag/tokens/${CONTRACT_ADDRESS}` },
  ];

  return (
    <div className="read-token-page">
      {/* 1. Hero Section */}
      <section className="ecosystem-hero">
        <div className="hero-content">
          <div className="hero-meta">
            <span className="hero-powered-label">Powered by</span>
            <span className="hero-powered-brand">Coinbase x402</span>
          </div>
          <h1>The Readia Ecosystem</h1>
          <div className="ecosystem-showcase">
            <div className="ecosystem-grid">
              {/* Readia.io - Live */}
              <Link to="/" className="ecosystem-card ecosystem-card--live" style={{ '--card-index': 0 } as React.CSSProperties}>
                <div className="ecosystem-card__icon"><FileText size={24} /></div>
                <div className="ecosystem-card__content">
                  <h3 className="ecosystem-card__name">Readia.io</h3>
                  <span className="ecosystem-card__type">Content Marketplace</span>
                </div>
                <span className="ecosystem-badge ecosystem-badge--live">
                  <span className="ecosystem-badge__dot"></span>Live
                </span>
              </Link>

              {/* ShillQuest - Upcoming */}
              <div className="ecosystem-card ecosystem-card--upcoming" style={{ '--card-index': 1 } as React.CSSProperties}>
                <div className="ecosystem-card__icon"><Sparkles size={24} /></div>
                <div className="ecosystem-card__content">
                  <h3 className="ecosystem-card__name">ShillQuest</h3>
                  <span className="ecosystem-card__type">Marketing Platform</span>
                </div>
                <span className="ecosystem-badge ecosystem-badge--upcoming">Coming Soon</span>
              </div>

              {/* TBA - Newsletter */}
              <div className="ecosystem-card ecosystem-card--tba" style={{ '--card-index': 2 } as React.CSSProperties}>
                <div className="ecosystem-card__shimmer"></div>
                <div className="ecosystem-card__icon ecosystem-card__icon--locked"><Lock size={24} /></div>
                <div className="ecosystem-card__content">
                  <h3 className="ecosystem-card__name ecosystem-card__name--mystery">???</h3>
                  <span className="ecosystem-card__type">Newsletter Service</span>
                </div>
                <span className="ecosystem-badge ecosystem-badge--tba">TBA</span>
              </div>

              {/* TBA - Live Feed */}
              <div className="ecosystem-card ecosystem-card--tba" style={{ '--card-index': 3 } as React.CSSProperties}>
                <div className="ecosystem-card__shimmer"></div>
                <div className="ecosystem-card__icon ecosystem-card__icon--locked"><Lock size={24} /></div>
                <div className="ecosystem-card__content">
                  <h3 className="ecosystem-card__name ecosystem-card__name--mystery">???</h3>
                  <span className="ecosystem-card__type">Live Feed</span>
                </div>
                <span className="ecosystem-badge ecosystem-badge--tba">TBA</span>
              </div>
            </div>
          </div>
          <div className="ecosystem-tagline">Join us in shaping the future of content monetization.</div>
          <div className="hero-cta-buttons">
            <a
              href="https://x.com/Readia_io"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-simple-button"
            >
              <XLogo size={18} />
              Follow Us
            </a>
            <a
              href="https://github.com/Max-the-dev/Readia.io"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-simple-button"
            >
              <Github size={18} />
              GitHub
            </a>
            <a
              href={`https://pump.fun/coin/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-simple-button cta-primary"
            >
              Buy $READ
            </a>
          </div>
        </div>
      </section>

      {/* 2. Token Stats Section (with Chart Accordion) */}
      <section className="ecosystem-section token-stats-section">
        <div className="section-inner">
          <h2>$READ Token</h2>
          <div className="token-stats-grid">
            <div className="token-stat-card">
              <span className="stat-label">Market Cap</span>
              <span className="stat-value">
                {marketCap !== null ? formatMarketCap(marketCap) : 'Loading...'}
              </span>
            </div>
            <div className="token-stat-card">
              <span className="stat-label">24h Change</span>
              <span className={`stat-value ${priceChange !== null ? (priceChange >= 0 ? 'positive' : 'negative') : ''}`}>
                {priceChange !== null ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%` : 'Loading...'}
              </span>
            </div>
            <div className="token-stat-card">
              <span className="stat-label">Contract Address</span>
              <div className="stat-contract">
                <code>{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</code>
                <button onClick={handleCopyAddress} className="copy-btn">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Chart Accordion */}
          <div className="chart-accordion">
            <button
              className={`chart-accordion__trigger ${chartExpanded ? 'expanded' : ''}`}
              onClick={() => setChartExpanded(!chartExpanded)}
            >
              <span>{chartExpanded ? 'Hide Chart' : 'View Live Chart'}</span>
              <ChevronDown size={20} />
            </button>

            <div className={`chart-accordion__content ${chartExpanded ? 'expanded' : ''}`}>
              <div className="dexscreener-embed">
                <iframe
                  src="https://dexscreener.com/solana/7hkhyz4picrcom1tupp898tc2shjd7yqtqkfrw4pptdr?embed=1&theme=dark&trades=0&info=0"
                  title="DexScreener Chart"
                />
              </div>
              <div className="chart-links">
                <a
                  href="https://dexscreener.com/solana/7hkhyz4picrcom1tupp898tc2shjd7yqtqkfrw4pptdr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chart-link"
                >
                  View on DexScreener
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Token Benefits Section */}
      <section className="ecosystem-section benefits-section">
        <div className="section-inner">
          <h2>Holder Benefits</h2>
          <p className="section-subtitle">$READ holders unlock multiple benefits across the ecosystem</p>
        </div>
        <div className="benefits-carousel">
          <div className="benefits-track">
            {[...tokenBenefits, ...tokenBenefits].map((benefit, index) => (
              <TokenBenefitCard key={index} {...benefit} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. A New Standard Section */}
      <section className="ecosystem-section highlights-section">
        <div className="section-inner">
          <h2>A New Standard</h2>
          <p className="section-subtitle">What the content economy was always meant to be</p>
        </div>
        <div className="highlights-container">
          {highlights.map((item, index) => {
            const BgIcon = item.bgIcon;
            return (
              <div
                key={index}
                className={`highlight-card ${index % 2 === 0 ? 'highlight-card--left' : 'highlight-card--right'}`}
              >
                <BgIcon className="highlight-card__bg-icon" size={120} strokeWidth={1} />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Roadmap Section */}
      <section className="ecosystem-section roadmap-section">
        <div className="section-inner">
          <h2>Roadmap</h2>
          <p className="section-subtitle">Our journey to building the future of decentralized content</p>
          <div className="roadmap-timeline">
            {roadmapData.map((item, index) => (
              <RoadmapItem key={index} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. Partnerships Section */}
      <section className="ecosystem-section partnerships-section">
        <div className="section-inner">
          <h2>Partners & Integrations</h2>
          <div className="partnerships-grid">
            {partnerships.map((partner, index) => (
              <PartnershipCard key={index} {...partner} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Team Section */}
      <section className="ecosystem-section team-section">
        <div className="section-inner">
          <h2>Team</h2>
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <TeamMemberCard key={index} {...member} />
            ))}
          </div>
        </div>
      </section>

      {/* 9. Footer CTA Section */}
      <section className="ecosystem-section footer-cta-section">
        <div className="section-inner">
          <h2>Ready to Join the Readia?</h2>
          <p>Start creating and earning today.</p>
          <div className="footer-cta-buttons">
            <a
              href={`https://pump.fun/coin/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-primary-btn"
            >
              Buy $READ
            </a>
            <Link to="/write" className="cta-secondary-btn">
              Start Writing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ReadToken;
