import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Github, Vote, Coins, Sparkles, FileText, Shield, DollarSign, Heart, Copy, Check } from 'lucide-react';
import XLogo from '../components/XLogo';
import {
  TokenBenefitCard,
  FeatureCard,
  RoadmapItem,
  TeamMemberCard,
  PartnershipCard,
} from '../components/ecosystem';

const CONTRACT_ADDRESS = 'C8wvVNuRPm237bQqqcfRxas77GTK3RzzoBCkWgrGpump';

function ReadToken() {
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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
    { icon: <Vote size={24} />, title: 'Governance', description: 'Vote on platform decisions, feature priorities, and treasury allocations' },
    { icon: <Coins size={24} />, title: 'Revenue Share', description: 'Earn a portion of platform revenue distributed to token holders' },
    { icon: <Sparkles size={24} />, title: 'Early Access', description: 'Get exclusive access to new features and beta programs before launch' },
  ];

  const platformFeatures = [
    { icon: <FileText size={24} />, title: 'Micropayment Content', description: 'Writers set prices from $0.01-$1.00 per article using the x402 protocol', stats: 'Live on Base' },
    { icon: <Shield size={24} />, title: 'Web3 Authentication', description: 'Wallet-based auth with RainbowKit. No passwords, full ownership', stats: 'MetaMask & WalletConnect' },
    { icon: <DollarSign size={24} />, title: 'USDC Payments', description: 'Instant settlements using USDC on Base for low fees and fast transactions', stats: 'Average fee: <$0.01' },
    { icon: <Heart size={24} />, title: 'Social Features', description: 'Like articles, follow authors, and engage with the community', stats: 'Real-time interactions' },
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
      bio: 'Building the future of decentralized content monetization.',
      social: {
        twitter: 'https://x.com/Readia_io',
        github: 'https://github.com/Max-the-dev/Readia.io',
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
            <span className="hero-powered-label">The</span>
            <span className="hero-powered-brand">$READ Ecosystem</span>
          </div>
          <h1>Powering Decentralized Content</h1>
          <p className="ecosystem-subtitle">
            Governance, revenue sharing, and exclusive access for token holders.
            Join the community shaping the future of micropayments.
          </p>
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

      {/* 2. Token Stats Section */}
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
              <span className="stat-label">Contract</span>
              <div className="stat-contract">
                <code>{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</code>
                <button onClick={handleCopyAddress} className="copy-btn">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Chart Section */}
      <section className="ecosystem-section chart-section">
        <div className="section-inner">
          <h2>Live Chart</h2>
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
      </section>

      {/* 4. Token Benefits Section */}
      <section className="ecosystem-section benefits-section">
        <div className="section-inner">
          <h2>Holder Benefits</h2>
          <p className="section-subtitle">$READ holders unlock multiple benefits across the ecosystem</p>
          <div className="benefits-grid">
            {tokenBenefits.map((benefit, index) => (
              <TokenBenefitCard key={index} {...benefit} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Platform Features Section */}
      <section className="ecosystem-section features-section">
        <div className="section-inner">
          <h2>Platform Features</h2>
          <p className="section-subtitle">What makes Readia.io unique</p>
          <div className="features-grid">
            {platformFeatures.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
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

      {/* 7. Team Section */}
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

      {/* 8. Partnerships Section */}
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

      {/* 9. Footer CTA Section */}
      <section className="ecosystem-section footer-cta-section">
        <div className="section-inner">
          <h2>Ready to Join the $READ Ecosystem?</h2>
          <p>Start earning, governing, and creating today.</p>
          <div className="footer-cta-buttons">
            <a
              href={`https://pump.fun/coin/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-primary-btn"
            >
              Buy $READ
            </a>
            <Link to="/explore" className="cta-secondary-btn">
              Explore Articles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ReadToken;
