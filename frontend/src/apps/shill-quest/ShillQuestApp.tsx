import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Wallet, Moon, Sun, Home as HomeIcon, Search, Plus, WalletMinimal, HelpCircle, Compass, LayoutDashboard, BookOpen, Info, Globe, FileText, Shield } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useShillWallet } from './contexts/ShillWalletContext';
import mockupCss from './mockupStyles.css?raw';
import layoutCss from '../../styles/layout.css?raw';
import themeCss from '../../styles/theme.css?raw';
import staticCss from '../../styles/pages/static.css?raw';
import walletCss from '../../styles/components/wallet.css?raw';
import miscCss from '../../styles/components/misc.css?raw';
import navigationCss from '../../styles/components/navigation.css?raw';
import badgesCss from '../../styles/components/badges.css?raw';

// Import page components
import {
  Home,
  Explore,
  Create,
  Help,
  Privacy,
  Terms,
  HowItWorks,
  About,
  Ecosystem,
} from './pages';

type PageKey = 'home' | 'explore' | 'create' | 'contact' | 'privacy' | 'terms' | 'how-it-works' | 'about' | 'ecosystem';

function ShillQuestContent({
  onNavigate,
  theme,
  toggleTheme,
  location,
  walletAddress,
  isWalletConnected,
  walletIcon,
  walletName,
  networkIcon,
  usdcBalance,
  onConnectWallet,
}: {
  onNavigate: (page: PageKey) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  location: string;
  walletAddress: string | undefined;
  isWalletConnected: boolean;
  walletIcon: string | undefined;
  walletName: string | undefined;
  networkIcon: string | null;
  usdcBalance: string | null;
  onConnectWallet: () => void;
}) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const showUsdcBalance = isWalletConnected && usdcBalance !== null;
  // Derive activePage from URL - makes URL the source of truth
  const activePage: PageKey = (() => {
    const path = location.replace('/shill', '').replace('/', '');
    if (path === '' || path === 'home') return 'home';
    if (['explore', 'create', 'contact', 'privacy', 'terms', 'how-it-works', 'about', 'ecosystem'].includes(path)) {
      return path as PageKey;
    }
    return 'home';
  })();

  const setPage = (page: PageKey | string) => {
    onNavigate(page as PageKey);
  };

  return (
    <div className="App" data-theme={theme}>
      <header className="header">
        <div className="container">
          <div className="header-left">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <a href="#" className="logo" data-page="home" onClick={(e) => { e.preventDefault(); setPage('home'); }}>
              <h1>ShillQuest</h1>
            </a>
          </div>

          <nav className="nav-links-center">
            <a href="#" className="link" data-page="home" onClick={(e) => { e.preventDefault(); setPage('home'); }}>
              <span className="link-icon"><HomeIcon size={20} /></span>
              <span className="link-title">Home</span>
            </a>
            <a href="#" className="link" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}>
              <span className="link-icon"><Search size={20} /></span>
              <span className="link-title">Quests</span>
            </a>
            <a href="#" className="link" data-page="create" onClick={(e) => { e.preventDefault(); setPage('create'); }}>
              <span className="link-icon"><Plus size={20} /></span>
              <span className="link-title">Create</span>
            </a>
          </nav>

          <div className="auth-container">
            {isWalletConnected && walletAddress ? (
              <button className="wallet-connect-button" type="button" onClick={onConnectWallet}>
                <div className="wallet-info">
                  {walletIcon && (
                    <img
                      src={walletIcon}
                      alt={walletName || 'Wallet'}
                      className="wallet-icon"
                    />
                  )}
                  {networkIcon && (
                    <img
                      src={networkIcon}
                      alt="Network"
                      className="network-icon"
                    />
                  )}
                  <span className="wallet-address">{formatAddress(walletAddress)}</span>
                </div>
                {showUsdcBalance && (
                  <>
                    <div className="wallet-divider" aria-hidden="true" />
                    <div className="wallet-balance-inline" aria-live="polite">
                      <span className="wallet-balance__value">{usdcBalance}</span>
                      <span className="wallet-balance__ticker">USDC</span>
                    </div>
                  </>
                )}
              </button>
            ) : (
              <button className="wallet-connect-button wallet-connect-button--disconnected" type="button" onClick={onConnectWallet}>
                <WalletMinimal
                  aria-hidden="true"
                  className="wallet-connect-button--disconnected__icon"
                  strokeWidth={2.4}
                  size={18}
                />
                <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">Connect Wallet</span>
              </button>
            )}
            <div className="auth-status-badges">
              <div className={`auth-badge ${isWalletConnected ? 'auth-badge--active' : 'auth-badge--inactive'}`} title={isWalletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}>
                <Wallet size={16} />
              </div>
              <div className="auth-badge auth-badge--inactive" title="Not Authenticated">
                <Lock size={16} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="page-home" className={`page ${activePage === 'home' ? 'active' : ''}`}>
          <Home setPage={setPage} />
        </section>

        <section id="page-explore" className={`page ${activePage === 'explore' ? 'active' : ''}`}>
          <Explore />
        </section>

        <section id="page-create" className={`page ${activePage === 'create' ? 'active' : ''}`}>
          <Create />
        </section>

        <section id="page-contact" className={`page ${activePage === 'contact' ? 'active' : ''}`}>
          <Help setPage={setPage} />
        </section>

        <section id="page-privacy" className={`page ${activePage === 'privacy' ? 'active' : ''}`}>
          <Privacy setPage={setPage} />
        </section>

        <section id="page-terms" className={`page ${activePage === 'terms' ? 'active' : ''}`}>
          <Terms />
        </section>

        <section id="page-how-it-works" className={`page ${activePage === 'how-it-works' ? 'active' : ''}`}>
          <HowItWorks setPage={setPage} />
        </section>

        <section id="page-about" className={`page ${activePage === 'about' ? 'active' : ''}`}>
          <About setPage={setPage} />
        </section>

        <section id="page-ecosystem" className={`page ${activePage === 'ecosystem' ? 'active' : ''}`}>
          <Ecosystem setPage={setPage} />
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <a
              href="#"
              className="logo"
              data-page="home"
              onClick={(e) => {
                e.preventDefault();
                setPage('home');
              }}
            >
              <h1>ShillQuest</h1>
            </a>
            <p className="footer-tagline">Get paid to promote projects.</p>
            <div className="footer-social">
              <a href="https://x.com/Readia_io" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Readia.io
              </a>
              <a href="https://github.com/Max-the-dev/Readia.io" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <a href="#" data-page="explore" onClick={(e) => { e.preventDefault(); setPage('explore'); }}><Compass size={16} />Explore Quests</a>
              <a href="#" data-page="create" onClick={(e) => { e.preventDefault(); setPage('create'); }}><Plus size={16} />Create Quest</a>
              <a href="#" data-page="creator-dashboard"><LayoutDashboard size={16} />Dashboard</a>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#" data-page="how-it-works" onClick={(e) => { e.preventDefault(); setPage('how-it-works'); }}><BookOpen size={16} />How It Works</a>
              <a href="#" data-page="about" onClick={(e) => { e.preventDefault(); setPage('about'); }}><Info size={16} />About</a>
              <a href="#" data-page="ecosystem" onClick={(e) => { e.preventDefault(); setPage('ecosystem'); }}><Globe size={16} />Ecosystem</a>
            </div>
            <div className="footer-column">
              <h4>Support</h4>
              <a href="#" data-page="contact" onClick={(e) => { e.preventDefault(); setPage('contact'); }}><HelpCircle size={16} />Help & Contact</a>
              <a href="#" data-page="terms" onClick={(e) => { e.preventDefault(); setPage('terms'); }}><FileText size={16} />Terms of Service</a>
              <a href="#" data-page="privacy" onClick={(e) => { e.preventDefault(); setPage('privacy'); }}><Shield size={16} />Privacy Policy</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 ShillQuest by Readia. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#" onClick={(e) => { e.preventDefault(); setPage('privacy'); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setPage('terms'); }}>Terms of Service</a>
            <span className="footer-powered-by">Powered by <a href="https://readia.io" target="_blank" rel="noopener noreferrer">Readia.io</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ShillQuestApp() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { address, isConnected, walletIcon, walletName, networkIcon, usdcBalance, connect } = useShillWallet();

  useEffect(() => {
    if (hostRef.current && !shadowRoot) {
      const existing = hostRef.current.shadowRoot;
      if (existing) {
        setShadowRoot(existing);
      } else {
        setShadowRoot(hostRef.current.attachShadow({ mode: 'open' }));
      }
    }
  }, [shadowRoot]);

  useEffect(() => {
    if (shadowRoot) {
      (shadowRoot.host as HTMLElement).setAttribute('data-theme', theme);
    }
  }, [theme, shadowRoot]);

  const handleNav = (page: PageKey) => {
    if (page === 'home') {
      navigate('/shill');
    } else {
      navigate(`/shill/${page}`);
    }
  };

  return (
    <div ref={hostRef}>
      {shadowRoot
        ? createPortal(
          <>
            <style>{themeCss + layoutCss + staticCss + miscCss + navigationCss + badgesCss + walletCss + mockupCss}</style>
            <ShillQuestContent
              onNavigate={handleNav}
              theme={theme}
              toggleTheme={toggleTheme}
              location={location.pathname}
              walletAddress={address}
              isWalletConnected={isConnected}
              walletIcon={walletIcon}
              walletName={walletName}
              networkIcon={networkIcon}
              usdcBalance={usdcBalance}
              onConnectWallet={connect}
            />
          </>,
          shadowRoot
        )
        : null}
    </div>
  );
}

export default ShillQuestApp;
