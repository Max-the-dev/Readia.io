import {
  ArrowDown,
  ArrowRightCircle,
  FileText,
  MousePointerClick,
  PlusCircle,
} from 'lucide-react';
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';

// Data used to drive the “typing” animation in the faux editor header
const INTRO_LINES = [
  { type: 'title', text: 'Penny.io Whitepaper' },
  { type: 'subtitle', text: 'A new way to monetize written content' },
  { type: 'meta', text: 'Last edited • November 17, 2025' },
] as const;

// Each section defines its heading, copy, and the “Paste” button label
const FLOW_LANES = [
  {
    key: 'legacy',
    title: 'Legacy Paywalls',
    emoji: '🧱',
    tagline: 'Friction stacked at every step',
    steps: [
      { icon: '🔁', label: 'Redirect', detail: 'Paywall hijacks the reading surface to a subscription portal.' },
      { icon: '📝', label: 'Form Fill', detail: 'Name, email, password, and card info collected all at once.' },
      { icon: '⏳', label: 'Processor Wait', detail: 'Card network and fraud checks add 15–60s of dead air.' },
      { icon: '🏦', label: 'Platform Hold', detail: 'Publisher pays platform fees & waits weeks for a payout.' },
      { icon: '🚫', label: 'Access Lost', detail: 'Miss a renewal and the article re-locks instantly.' },
    ],
  },
  {
    key: 'penny',
    title: 'Penny + x402',
    emoji: '⚡️',
    tagline: 'Secure and fast',
    steps: [
      { icon: '🖱️', label: 'Stay In Place', detail: 'Reader taps "Pay" and never leaves the article view.' },
      { icon: '✍️', label: 'Sign Once', detail: 'Wallet shows one signature request — no accounts, no cards.' },
      { icon: '🛰️', label: 'Instant Verify', detail: 'x402 facilitator validates payload in ~3 seconds.' },
      { icon: '💸', label: 'Direct Payout', detail: 'USDC settles straight to the author’s wallet on Base/Solana.' },
      { icon: '📚', label: 'Own Forever', detail: 'Access is recorded on-chain, so access never expires.' },
    ],
  },
] as const;

const SECTION_DEFINITIONS = [
  {
    key: 'problem',
    insertLabel: 'Next block: 1. The Problem',
    title: '1. The Problem',
    body: (
      <>
        <p>
          Every writer and reader knows the pain: essential answers trapped behind monthly paywalls,
          opaque revenue splits, and a maze of logins. Writers wait weeks to get paid, readers juggle
          subscriptions for content they rarely use, and platforms keep a disproportionate share
          despite providing limited value.
        </p>
        <p>
          The result is abandoned tabs, struggling authors, and a pervasive belief that quality
          content has to hide behind yet another checkout form.
        </p>
      </>
    ),
  },
  {
    key: 'thesis',
    insertLabel: 'Next block: 2. Our Thesis',
    title: '2. The Thesis',
    body: (
      <>
        <p>
          In 2025, publishing and accessing content should feel as fluid as sending a message. We believe you should only pay 
          for what you read, own your access forever, and reward the creator directly. Penny.io puts creators 
          at the center, and economics stay transparent because the user is always in control.
        </p>
        <ul>
          <li>No custodial accounts, no dark pools of revenue-share math.</li>
          <li>Blockchain-based economy means writers can audit, access, and move their earnings instantly.</li>
          <li>
            Readers choose what they pay for. Click buy; everything else is x402 magic.  
          </li>
        </ul>
      </>
    ),
  },
  {
    key: 'how',
    insertLabel: 'Next block: 3. How Penny Works',
    title: '3. How Penny Works',
    body: (
      <ul>
        <li>
          <strong>Per-article pricing:</strong> writers choose a price between $0.01 and $1.00.
        </li>
        <li>
          <strong>Wallet-based purchase:</strong> readers sign the tx via wallet of choice
          and gain permanent access.
        </li>
        <li>
          <strong>Dual chain support:</strong> Base and Solana USDC wallets fully supported. 
        </li>
        <li>
          <strong>x402 protocol:</strong> Secure, free, and fast transactions. 
        </li>
      </ul>
    ),
  },
  {
    key: 'flow',
    insertLabel: 'Next block: Payment Flow Comparison',
    title: '4. Payment Flow Comparison',
    body: <FlowComparisonDiagram />,
  },
  {
    key: 'value',
    insertLabel: 'Next block: 5. Why It Matters',
    title: '5. Why It Matters',
    body: <ValueSpotlight />,
  },
  {
    key: 'features',
    insertLabel: 'Next block: 6. Key Features',
    title: '6. Key Features at Launch',
    body: (
      <ol>
        <li>
          <strong>Modern publishing stack:</strong> rich text editor with autosave drafts, image uploads,
          and code formatting. 
        </li>
        <li>
          <strong>Realtime dashboard:</strong> lifetime earnings, conversion rates, weekly stats, and
          wallet management in one view.
        </li>
        <li>
          <strong>Discovery engine:</strong> category filters, popularity scores, likes, and trending
          signals to surface emerging writers.
        </li>
        <li>
          <strong>Wallet management:</strong> link a complementary network wallet, replace it safely,
          and stay synced across chains.
        </li>
        <li>
          <strong>Tipping:</strong> optimized flows for supporters to send extra USDC on
          Base and Solana.
        </li>
        <li>
          <strong>Security-by-design:</strong> DOMPurify-protected content, Solana ATA verification,
          rate limiting, and Cloudflare WAF.
        </li>
      </ol>
    ),
  },
  {
    key: 'standards',
    insertLabel: 'Next block: 7. Open Standards',
    title: '7. Built on Open Standards',
    body: (
      <ul>
        <li>
          <strong>x402</strong> for payments.
        </li>
        <li>
          <strong>USDC</strong> on Base and Solana supported.
        </li>
        <li>
          <strong>Coinbase CDP</strong> for gasless settlement.
        </li>
        <li>
          <strong>Supabase</strong> for data storage.
        </li>
        <li>
          <strong>WalletConnect / AppKit</strong> so users feel safe.
        </li>
      </ul>
    ),
  },
  {
    key: 'roadmap',
    insertLabel: 'Next block: What’s Next',
    title: '8. What’s Next',
    body: (
      <ul>
        <li>Author profiles, newsletters, and topic subscriptions.</li>
        <li>AI-assisted drafting, proofreading, and formatting suggestions.</li>
        <li>API marketplace where knowledge can be licensed via existing rails.</li>
        <li>Deeper analytics for authors (funnel analysis, category performance).</li>
        <li>Dark mode, accessibility upgrades, and public roadmap voting.</li>
        <li>Q&A marketplace to get answers from verified SMEs enabled by the same payment model.</li>
      </ul>
    ),
  },
] as const;

type SectionKey = (typeof SECTION_DEFINITIONS)[number]['key'];

const ABSTRACT_CONTENT = (
  <>
    <p>
      Penny.io reimagines how we monetize written content online. Enabled by the latest advancements in crypto, 
      we created a payment flow that deletes all middlemen from the equations. It's writers, readers, and 
      nothing in between.
      
      Creators set a price between $0.01 and $1.00, readers unlock individual articles in a single click, and payouts settle
      in seconds on-chain. This means no subscriptions, no ads, no account setup, and no payment information required. 
      To start earning on Penny, all you need is a wallet, a cup of coffee, and a keyboard. 
      
      Under the hood we rely on the x402 protocol—HTTP’s long-reserved “Payment Required” status which has been developed 
      into a full-fledged payment system. Due to the absence of fees, microtransactions become viable for the first time ever. 
      Zero-cost transactions allow the consumer to send $0.01 and be sure the writer receives exactly one cent.  

    </p>
    <p>
      The result is a fair and open-source content economy without subscriptions, ads, middlemen, or delayed payouts. 
    </p>
  </>
);

// Motion hook so typing animation respects user preferences
function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefers(mediaQuery.matches);
    setPrefers(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefers;
}

// Small helper to only fire the typing animation once the block is visible
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      });
    }, options ?? { threshold: 0.4 });

    observer.observe(target);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isVisible] as const;
}

// Typing animation for the intro meta text at the top of the editor
function TypedIntro() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [ref, isVisible] = useInView();
  const [renderedLines, setRenderedLines] = useState(() => INTRO_LINES.map(() => ''));
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!isVisible || prefersReducedMotion || completed) return;

    const currentLine = INTRO_LINES[lineIndex];
    if (!currentLine) {
      setCompleted(true);
      return;
    }

    const targetText = currentLine.text;
    const timeout = setTimeout(() => {
      setRenderedLines((prev) => {
        const next = [...prev];
        next[lineIndex] = targetText.slice(0, charIndex + 1);
        return next;
      });

      if (charIndex + 1 === targetText.length) {
        if (lineIndex + 1 === INTRO_LINES.length) {
          setCompleted(true);
        } else {
          setLineIndex((prev) => prev + 1);
          setCharIndex(0);
        }
      } else {
        setCharIndex((prev) => prev + 1);
      }
    }, 25);

    return () => clearTimeout(timeout);
  }, [charIndex, completed, isVisible, lineIndex, prefersReducedMotion]);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    setRenderedLines(INTRO_LINES.map((line) => line.text));
    setCompleted(true);
  }, [prefersReducedMotion]);

  return (
    <div className="typed-panel" ref={ref}>
      {INTRO_LINES.map((line, index) => {
        const isActive = !completed && index === lineIndex;
        return (
          <p key={line.text} className={`typed-line typed-line--${line.type}`}>
            <span>{renderedLines[index]}</span>
            {isActive && <span className="typed-caret" aria-hidden="true" />}
          </p>
        );
      })}
    </div>
  );
}

function RevealGroup({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div className="editor-section-body">
      {items.map((child, index) => {
        const delay = `${index * 240}ms`;
        if (!isValidElement(child)) {
          return (
            <p key={index} className="text-reveal" style={{ '--reveal-delay': delay } as CSSProperties}>
              {child}
            </p>
          );
        }
        const revealStyle = { ...(child.props.style ?? {}), '--reveal-delay': delay } as CSSProperties;
        const existingClass = child.props.className ?? '';
        return cloneElement(child, {
          key: child.key ?? index,
          className: `${existingClass} text-reveal`.trim(),
          style: revealStyle,
        });
      })}
    </div>
  );
}

function FlowComparisonDiagram() {
  return (
    <div className="flow-map">
      {FLOW_LANES.map((lane) => (
        <div className={`flow-map-lane flow-map-lane--${lane.key}`} key={lane.key}>
          <div className="flow-map-lane-header">
            <span className="flow-map-emoji" aria-hidden="true">
              {lane.emoji}
            </span>
            <div>
              <p className="flow-map-title">{lane.title}</p>
              <p className="flow-map-tagline">{lane.tagline}</p>
            </div>
          </div>
          <div className="flow-map-track">
            {lane.steps.map((step, index) => (
              <div className="flow-map-node" key={step.label}>
                <div className="flow-map-node-top">
                  <div className="flow-map-node-marker" aria-hidden="true">
                    {step.icon}
                  </div>
                  {index < lane.steps.length - 1 && (
                    <div className="flow-map-arrow" aria-hidden="true">
                      →
                    </div>
                  )}
                </div>
                <div className="flow-map-node-body">
                  <p className="flow-map-node-label">{step.label}</p>
                  <p className="flow-map-node-detail">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValueSpotlight() {
  const highlights = [
    {
      emoji: '📖',
      title: 'Readers',
      detail: 'No subscriptions or hidden fees. Pay the exact amount for the exact article and keep it forever.',
    },
    {
      emoji: '✍️',
      title: 'Writers',
      detail: 'Instant, transparent earnings with a modern editor, metrics, and a professional monetization layer.',
    },
    {
      emoji: '🌐',
      title: 'Platforms',
      detail: 'Introduce a new monetization primitive without wrecking the user experience or custodying user funds.',
    },
  ];

  return (
    <div className="value-spotlight">
      {highlights.map((item) => (
        <article className="value-spotlight-card" key={item.title}>
          <div className="value-spotlight-emoji" aria-hidden="true">
            {item.emoji}
          </div>
          <h4>{item.title}</h4>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

function Whitepaper() {
  const lineNumbers = useMemo(() => Array.from({ length: 120 }, (_, index) => index + 1), []);
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({} as Record<SectionKey, HTMLElement | null>);
  const revealTimeouts = useRef<Record<SectionKey, number>>({} as Record<SectionKey, number>);
  const [autoRevealEnabled, setAutoRevealEnabled] = useState(false);
  // Tracks which sections have been “pasted” into the faux editor
  const [revealedSections, setRevealedSections] = useState<Record<SectionKey | 'abstract', boolean>>(() => {
    const initial: Record<SectionKey | 'abstract', boolean> = { abstract: true };
    SECTION_DEFINITIONS.forEach((section) => {
      initial[section.key] = false;
    });
    return initial;
  });

  // Auto-insert blocks once they scroll into view
  useEffect(() => {
    if (!autoRevealEnabled) {
      return;
    }

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setRevealedSections((prev) => {
        const next = { ...prev };
        SECTION_DEFINITIONS.forEach((section) => {
          next[section.key] = true;
        });
        return next;
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute('data-section-key') as SectionKey | null;
            if (key && !revealTimeouts.current[key]) {
              revealTimeouts.current[key] = window.setTimeout(() => {
                setRevealedSections((prev) => {
                  if (prev[key]) return prev;
                  return { ...prev, [key]: true };
                });
                delete revealTimeouts.current[key];
              }, 350);
            }
          } else {
            const key = entry.target.getAttribute('data-section-key') as SectionKey | null;
          }
        });
      },
      { threshold: 1, rootMargin: '0px 0px -100px 0px' },
    );

    SECTION_DEFINITIONS.forEach((section) => {
      if (!revealedSections[section.key]) {
        const node = sectionRefs.current[section.key];
        if (node) observer.observe(node);
      }
    });

    return () => {
      observer.disconnect();
      Object.values(revealTimeouts.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      revealTimeouts.current = {} as Record<SectionKey, number>;
    };
  }, [autoRevealEnabled, revealedSections]);

  const registerSectionRef = (key: SectionKey) => (node: HTMLElement | null) => {
    sectionRefs.current[key] = node;
  };

  const handleKeepReading = () => {
    setAutoRevealEnabled(true);
  };

  return (
    <div className="whitepaper-page">
      <div className="whitepaper-editor">
        <div className="editor-window">
          {/* Faux editor chrome and toolbar */}
          <header className="editor-chrome" aria-label="Faux editor chrome">
            <div className="editor-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="editor-filename">
              <FileText size={16} aria-hidden="true" />
              <span>whitepaper.md</span>
            </div>
            <div className="editor-status">Auto-save on · Wallet connected</div>
          </header>

          <div className="editor-toolbar" role="toolbar">
            <div className="editor-toolbar-left">
              <button type="button">File</button>
              <button type="button">Edit</button>
              <button type="button">View</button>
              <button type="button">Insert</button>
            </div>
            <div className="editor-toolbar-center">
              <button type="button" className="is-active">
                H1
              </button>
              <button type="button">H2</button>
              <button type="button">B</button>
              <button type="button">I</button>
              <button type="button">• List</button>
              <button type="button"># List</button>
            </div>
            <div className="editor-toolbar-right">
              <span className="editor-toolbar-shortcut">0xEc11...6bF1</span>
            </div>
          </div>

          <div className="editor-body">
            <div className="editor-gutter" aria-hidden="true">
              {/* Line-number column for the editor */}
              {lineNumbers.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <div className="editor-content">
              {/* Intro typing animation + contextual hint */}
              <TypedIntro />
              <div className="editor-hint">
                <MousePointerClick size={16} aria-hidden="true" />
                <p>
                  Tap <strong>Keep Reading</strong> to continue.
                </p>
              </div>

              <section className="editor-block revealed" id="section-abstract">
                <p className="editor-section-label">Abstract</p>
                <RevealGroup>{ABSTRACT_CONTENT}</RevealGroup>
              </section>

              {!autoRevealEnabled && (
                <div className="keep-reading-wrapper">
                  <button type="button" className="keep-reading-button" onClick={handleKeepReading}>
                    <span>Keep reading</span>
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Render each section either as a “Paste block” button or the card content */}
              {SECTION_DEFINITIONS.map((section) => {
                const isRevealed = revealedSections[section.key];
                return (
                  <section
                    key={section.key}
                    id={`section-${section.key}`}
                    className={`editor-block ${isRevealed ? 'revealed' : 'pending'}`}
                    ref={registerSectionRef(section.key)}
                    data-section-key={section.key}
                  >
                    {isRevealed ? (
                      <>
                        <p className="editor-section-label">{section.title}</p>
                        <RevealGroup>{section.body}</RevealGroup>
                      </>
                    ) : (
                      <div className="editor-placeholder">
                        <PlusCircle size={18} aria-hidden="true" />
                        <span>{section.insertLabel}</span>
                      </div>
                    )}
                  </section>
                );
              })}

              <section className="editor-block revealed">
                <p className="editor-section-label">9. We'd love to have you</p>
                <RevealGroup>
                  <p>
                    Penny.io is the home for people who believe knowledge should travel at the speed of a light. If
                    you’re a writer frustrated with legacy platforms or a reader tired of expensive & intrusive paywalls, we
                    built this for you.
                  </p>
                  <ul>
                    <li>Connect your wallet and publish in minutes.</li>
                    <li>Read with one click, no account required.</li>
                    <li>Fork the repo or open an issue—everything is open source.</li>
                  </ul>
                </RevealGroup>
              </section>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="whitepaper-cta-region">
          <section className="about-cta">
            <h2>Join the Revolution</h2>
            <p>
              Whether you're a creator looking to monetize your content or a reader seeking 
              quality content without subscription commitments, Penny.io is built for you.
            </p>
            <div className="cta-buttons">
              <a href="/explore" className="cta-button primary">Browse Articles</a>
              <a href="/write" className="cta-button secondary">Start Writing</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Whitepaper;
