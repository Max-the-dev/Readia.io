import {
  ArrowRightCircle,
  BookOpen,
  FileText,
  PlayCircle,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function Whitepaper() {
  const heroStats = [
    {
      label: 'Wallet-native access',
      value: 'No accounts, just signatures',
      icon: <Wallet size={18} aria-hidden="true" />,
    },
    {
      label: 'Base + Solana',
      value: 'Dual-network payouts in seconds',
      icon: <ShieldCheck size={18} aria-hidden="true" />,
    },
    {
      label: 'x402 protocol',
      value: 'HTTP 402 revived for money',
      icon: <FileText size={18} aria-hidden="true" />,
    },
  ];

  const narrativeCards = [
    {
      title: 'Legacy choke points',
      description:
        'Opaque revenue splits, 30-day payout cycles, accounts for every site, and checkout flows that leak attention and trust.',
      stat: '72% of writers say payouts are “too slow”',
    },
    {
      title: 'Penny’s thesis',
      description:
        'Publishing should feel like messaging—sign once, pay exactly for what you unlock, and route funds straight to the author wallet.',
      stat: 'Pay 1–100 cents per post; own access forever',
    },
    {
      title: 'Immediate impact',
      description:
        'Readers unlock answers instantly, writers see revenue hit their Base or Solana wallet in seconds, and platforms keep UX pristine.',
      stat: '3-second verification, zero subscriptions',
    },
  ];

  const heroFlow = useMemo(
    () => [
      {
        title: 'Authorize',
        detail: 'Reader signs the typed data payload in their wallet.',
        duration: '~2s',
      },
      {
        title: 'Verify',
        detail: 'Penny validates x402 requirement & signature off-chain.',
        duration: '<1s',
      },
      {
        title: 'Settle',
        detail: 'USDC routes to the author wallet across Base or Solana.',
        duration: 'Immediate',
      },
      {
        title: 'Unlock',
        detail: 'Reader keeps permanent access, no subscription needed.',
        duration: 'Forever',
      },
    ],
    [],
  );

  const narrativeImpact = [
    { label: 'Unlock speed', value: '~3 seconds' },
    { label: 'Revenue share', value: '100% to the writer' },
    { label: 'Account creation', value: '0 required logins' },
  ];

  const [activeNarrative, setActiveNarrative] = useState(0);
  const [activeFlow, setActiveFlow] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % heroFlow.length);
    }, 3600);

    return () => clearInterval(interval);
  }, [heroFlow.length]);

  return (
    <div className="whitepaper-page">
      <div className="container">
        {/* Hero Section */}
        <div className="whitepaper-hero">
          <div className="hero-background-grid" aria-hidden="true" />
          <div className="hero-canvas">
            {heroStats.map((stat, index) => (
              <div className={`hero-orbit hero-orbit--${index}`} key={stat.label}>
                <div className="hero-stat-card">
                  <div className="hero-stat-icon">{stat.icon}</div>
                  <div>
                    <p className="hero-stat-label">{stat.label}</p>
                    <p className="hero-stat-value">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="hero-core">
              <div className="hero-core-text whitepaper-hero-content">
                <p className="eyebrow hero-pill">Wallet-native publishing</p>
                <h1>
                  Penny.io Whitepaper
                  <span>Pay-per-article access for the real web.</span>
                </h1>
                <p className="hero-subtitle">
                  Pay for exactly what you read, route USDC directly to the author, and unlock
                  content in one signature. Penny turns HTTP 402 into a live payment rail that feels
                  instant for readers and dependable for writers.
                </p>
                <div className="whitepaper-meta">
                  <span>Version 1.0</span>
                  <span aria-hidden="true">•</span>
                  <span>March 2025</span>
                </div>
              </div>
              <div className="hero-core-body">
                <div className="hero-flow-ribbon" role="list" aria-label="Instant payment process">
                  {heroFlow.map((step, index) => (
                    <button
                      type="button"
                      className={`hero-flow-step ${activeFlow === index ? 'active' : ''}`}
                      key={step.title}
                      onMouseEnter={() => setActiveFlow(index)}
                      onFocus={() => setActiveFlow(index)}
                      aria-pressed={activeFlow === index}
                    >
                      <div>
                        <span className="hero-flow-index" aria-hidden="true">
                          {index + 1}
                        </span>
                        <div>
                          <p className="hero-flow-title">{step.title}</p>
                          <span>{step.detail}</span>
                        </div>
                      </div>
                      <span className="hero-flow-time">{step.duration}</span>
                    </button>
                  ))}
                </div>
                <div className="whitepaper-video-card hero-video-shell hero-core-video" role="group" aria-label="Video walkthrough slot">
                  <div className="video-card-glow" aria-hidden="true" />
                  <p>Founder walkthrough</p>
                  <h3>Drop the Penny intro video here</h3>
                  <div className="video-card-actions">
                    <button type="button" className="video-card-button" disabled aria-disabled="true">
                      <PlayCircle aria-hidden="true" />
                      <span>Preview coming soon</span>
                    </button>
                    <span className="video-card-note">
                      Reserve this slot for your marketing video. Supports embeds from any provider.
                    </span>
                  </div>
                </div>
              </div>
              <div className="hero-mobile-stats" aria-label="Wallet-native callouts">
                {heroStats.map((stat) => (
                  <div className="hero-stat-card" key={`mobile-${stat.label}`}>
                    <div className="hero-stat-icon">{stat.icon}</div>
                    <div>
                      <p className="hero-stat-label">{stat.label}</p>
                      <p className="hero-stat-value">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hero-trust-rainbow" aria-label="Supported networks and standards">
                <span>Base</span>
                <span>Solana</span>
                <span>USDC</span>
                <span>x402</span>
                <span>AppKit</span>
                <span>Phantom</span>
              </div>
            </div>
          </div>
          <div className="hero-scroll-cue">
            <span>Scroll to see why Penny rewrites paywalls</span>
          </div>
        </div>

        {/* Storyline Section */}
        <section className="whitepaper-section narrative-section" aria-labelledby="narrative-title">
          <div className="whitepaper-content narrative-stack">
            <div className="narrative-intro">
              <p className="eyebrow">Why this matters</p>
              <h2 id="narrative-title">Legacy paywalls break trust. Penny rebuilds it.</h2>
              <p>
                Publishing has been throttled by accounts, monthly paywalls, and payout schedules
                that put platforms first. Penny swaps that for wallet-native ownership: know what
                you’re paying, see where it settles, and unlock answers in seconds.
              </p>
              <ul>
                <li>Readers own every unlock forever—no subscriptions or login walls.</li>
                <li>Writers get per-article pricing with instant payouts to Base or Solana.</li>
                <li>Platforms deliver better UX without touching user funds.</li>
              </ul>
              <div className="narrative-impact" aria-label="Proof points">
                {narrativeImpact.map((item) => (
                  <div className="narrative-impact-card" key={item.label}>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="narrative-marquee" aria-label="Storyline cards">
              <div className="narrative-marquee-track">
                {narrativeCards.map((card, index) => (
                  <button
                    type="button"
                    className={`narrative-card ${activeNarrative === index ? 'active' : ''}`}
                    key={card.title}
                    onMouseEnter={() => setActiveNarrative(index)}
                    onFocus={() => setActiveNarrative(index)}
                  >
                    <span className="narrative-index">{`0${index + 1}`}</span>
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                      <span className="narrative-stat">{card.stat}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="narrative-diagram narrative-diagram--full">
              <div className="narrative-diagram-node">
                <p>Reader</p>
                <span>Wallet signature</span>
              </div>
              <div className="narrative-diagram-connector" />
              <div className="narrative-diagram-node">
                <p>Penny</p>
                <span>x402 verification</span>
              </div>
              <div className="narrative-diagram-connector" />
              <div className="narrative-diagram-node">
                <p>Author</p>
                <span>Instant payout</span>
              </div>
              <div className="narrative-diagram-note">
                <p>{narrativeCards[activeNarrative].title}</p>
                <span>{narrativeCards[activeNarrative].stat}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="whitepaper-section toc-section">
          <h2>Table of Contents</h2>
          <div className="toc-grid">
            <a href="#problem">1. The Problem</a>
            <a href="#thesis">2. Our Thesis</a>
            <a href="#how-it-works">3. How Penny Works</a>
            <a href="#flow-comparison">4. Payment Flow Comparison</a>
            <a href="#value-prop">5. Why It Matters</a>
            <a href="#features">6. Key Features</a>
            <a href="#standards">7. Built on Open Standards</a>
            <a href="#roadmap">8. What’s Next</a>
            <a href="#cta">9. Join the Network</a>
          </div>
        </section>

        {/* Abstract */}
        <section className="whitepaper-section">
          <div className="whitepaper-content">
            <h2>Abstract</h2>
            <p>
              Penny.io reimagines publishing around wallets, not walled gardens. Writers set a
              price between $0.01 and $1.00, readers unlock individual articles in a single wallet
              popup, and payouts settle in seconds across Base and Solana. Under the hood we rely on
              the x402 protocol—HTTP’s long-reserved “Payment Required” status—so authorization
              happens off-chain while settlement remains verifiable on-chain. The result is a content
              economy without subscriptions, ads, or delayed payouts.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="whitepaper-section">
          <div className="whitepaper-content">
            <h2 id="problem">1. The Problem</h2>
            <p>
              Every writer and reader knows the pain: essential answers trapped behind monthly
              paywalls, opaque revenue splits, and a maze of logins. Writers wait weeks to get paid,
              readers juggle subscriptions for content they rarely use, and platforms keep a
              disproportionate share despite providing limited value.
            </p>

            <h2 id="thesis">2. Our Thesis</h2>
            <p>
              Content should feel as fluid as sending a message. Pay for exactly what you read, own
              your access forever, and route funds directly to the author in seconds. Penny.io puts
              wallets back at the core of publishing so economics stay transparent and creators stay
              in control.
            </p>

            <h2 id="how-it-works">3. How Penny Works</h2>
            <ul>
              <li>
                <strong>Per-article pricing:</strong> writers choose a price between $0.01 and $1.00.
              </li>
              <li>
                <strong>Wallet-native unlocks:</strong> readers sign once via Phantom, MetaMask, or
                AppKit and gain permanent access.
              </li>
              <li>
                <strong>Dual-network payouts:</strong> Base and Solana wallets receive funds
                immediately—no custodial account required.
              </li>
              <li>
                <strong>x402 protocol:</strong> the missing HTTP “Payment Required” code finally
                comes to life, separating authorization (off-chain) from settlement (on-chain) so
                fees stay negligible and speed stays high.
              </li>
            </ul>

            <h2 id="flow-comparison">4. Payment Flow Comparison</h2>
            <div className="flow-comparison">
              <div className="flow-card">
                <h3>Legacy Paywalls</h3>
                <ol>
                  <li>Redirect to sign-up / subscription page.</li>
                  <li>Enter card + personal info.</li>
                  <li>Wait for processor approval (15–60s).</li>
                  <li>Platform settles with author weeks later.</li>
                  <li>Reader loses access if subscription lapses.</li>
                </ol>
              </div>
              <div className="flow-card">
                <h3>Penny + x402</h3>
                <ol>
                  <li>Click “Unlock Article”.</li>
                  <li>Sign one authorization in your wallet.</li>
                  <li>Backend verifies instantly (≈3s).</li>
                  <li>Payout routes directly to the author wallet.</li>
                  <li>Access is permanent and wallet-native.</li>
                </ol>
              </div>
            </div>

            <h2 id="value-prop">5. Why It Matters</h2>
            <div className="value-grid">
              <div className="value-card">
                <h3>Readers</h3>
                <p>No subscriptions, no invasive signups, and one wallet popup. Pay only for the
                  content you actually consume and keep it forever.</p>
              </div>
              <div className="value-card">
                <h3>Writers</h3>
                <p>Instant, transparent earnings with a professional editor, analytics dashboard,
                  tipping, and full wallet control. No more net-30 payouts.</p>
              </div>
              <div className="value-card">
                <h3>Platforms</h3>
                <p>A new monetization primitive that doesn’t compromise UX or security—open,
                  composable, and iconically web3.</p>
              </div>
            </div>

            <h2 id="features">6. Key Features at Launch</h2>
            <ol>
              <li>
                <strong>Modern publishing stack:</strong> TinyMCE editor with autosave drafts, image
                hosting, and paywall preview.
              </li>
              <li>
                <strong>Realtime dashboard:</strong> lifetime earnings, conversion rates, weekly
                purchase stats, and wallet health in one view.
              </li>
              <li>
                <strong>Discovery engine:</strong> category filters, popularity scores, likes, and
                trending signals to surface emerging authors.
              </li>
              <li>
                <strong>Wallet management:</strong> link a secondary wallet on the complementary
                network, swap it safely, and stay synced across chains.
              </li>
              <li>
                <strong>Tip & donate modals:</strong> optimized flows for supporters to send extra
                USDC on Base or Solana.
              </li>
              <li>
                <strong>Security-by-design:</strong> DOMPurify-protected content, Solana ATA
                verification, rate limiting, and Cloudflare WAF at the edge.
              </li>
            </ol>

            <h2 id="standards">7. Built on Open Standards</h2>
            <p>We didn’t invent new cryptography—we adopted the best parts of the ecosystem:</p>
            <ul>
              <li><strong>x402</strong> for payments.</li>
              <li><strong>USDC</strong> on Base + Solana for stability.</li>
              <li><strong>Coinbase CDP</strong> for optional gasless settlement.</li>
              <li><strong>Supabase</strong> for transparent data storage.</li>
              <li><strong>WalletConnect / AppKit</strong> so users never hand us their keys.</li>
            </ul>

            <h2 id="roadmap">8. What’s Next</h2>
            <ul>
              <li>Author profiles and newsletter opt-ins.</li>
              <li>AI-assisted drafting and proofreading.</li>
              <li>API marketplace where knowledge can be licensed via the same x402 rails.</li>
              <li>Deeper analytics for authors (category performance, funnel analysis).</li>
              <li>Dark mode, accessibility upgrades, and public roadmap voting.</li>
            </ul>

            <h2 id="cta">9. Join the Network</h2>
            <p>
              Penny.io is the home for people who believe knowledge should travel at the speed of a
              signature. If you’re a writer frustrated with legacy platforms or a reader tired of
              hundred-dollar paywalls, we built this for you.
            </p>
            <ul>
              <li>Connect your wallet and publish in minutes.</li>
              <li>Read with one click, no account required.</li>
              <li>Fork the repo or open an issue—everything is open source.</li>
            </ul>
            <div className="cta-alert">
              <ArrowRightCircle size={20} />
              <span>Pay for brilliance, not subscriptions. Own your work, own your access. Welcome to Penny.io.</span>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section className="whitepaper-section download-section">
          <div className="download-card">
            <BookOpen size={32} />
            <h3>Download PDF Version</h3>
            <p>Get the complete whitepaper in PDF format for offline reading.</p>
            <button className="download-button" disabled>
              <FileText size={16} />
              Download PDF (Coming Soon)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Whitepaper;
