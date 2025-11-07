import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, BookOpen, PenTool, HelpCircle, Mail, Shield, FileText, LayoutDashboard, Library, Wrench, HeartHandshake, Copy, Check } from 'lucide-react';

function Footer() {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const donationOptions = [
    {
      name: 'Ethereum (Base)',
      symbol: 'ETH / USDC',
      address: '0x6945890b1c074414b813c7643ae10117dec1c8e7',
    },
    {
      name: 'Solana',
      symbol: 'SOL / USDC',
      address: 'cAXdcMFHK6y9yTP7AMETzXC7zvTeDBbQ5f4nvSWDx51',
    },
  ];

  const handleCopyAddress = async (address: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy wallet address', error);
    }
  };

  const closeDonateModal = () => {
    setIsDonateModalOpen(false);
    setCopiedAddress(null);
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Penny.io</h3>
            <p>Micropayments for quality content</p>

            {/* Action Buttons */}
            <div className="footer-actions">
              <Link to="/x402-test" className="x402-validation-button">
                <Wrench size={16} />
                <span>x402 Test</span>
              </Link>
              <button
                type="button"
                className="donate-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsDonateModalOpen(true);
                }}
              >
                <HeartHandshake size={16} />
                <span>Donate</span>
              </button>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><Link to="/about"><Info size={16} /> About</Link></li>
              <li><Link to="/how-it-works"><BookOpen size={16} /> How it works</Link></li>
              <li><Link to="/pricing"><FileText size={16} /> Pricing</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Creators</h4>
            <ul>
              <li><Link to="/write"><PenTool size ={16}/>Start writing</Link></li>
              <li><Link to="/dashboard"><LayoutDashboard size={16}/>Dashboard</Link></li>
              <li><Link to="/resources"><Library size={16} /> Resources</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><Link to="/help"><HelpCircle size={16}/>Help center</Link></li>
              <li><Link to="/contact"><Mail size={16}/>Contact</Link></li>
              <li><Link to="/privacy"><Shield size={16}/>Privacy</Link></li>
              <li><Link to="/terms"><FileText size={16}/>Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 Penny.io. All rights reserved.</p>
          <div className="footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>

      {isDonateModalOpen && (
        <div
          className="donation-modal-overlay"
          role="presentation"
          onClick={closeDonateModal}
        >
          <div
            className="donation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="donation-modal-header">
              <div className="donation-modal-title">
                <HeartHandshake size={18} />
                <h3 id="donation-modal-title">Support Penny.io</h3>
              </div>
              <button
                type="button"
                className="donation-modal-close"
                onClick={closeDonateModal}
                aria-label="Close donation modal"
              >
                ×
              </button>
            </div>
            <p className="donation-modal-description">
              Send your appreciation on your preffered chain.
            </p>
            <ul className="donation-list">
              {donationOptions.map(({ name, symbol, address }) => (
                <li key={address} className="donation-item">
                  <div className="donation-info">
                    <div className="donation-meta">
                      <span className="donation-name">{name}</span>
                      <span className="donation-symbol">{symbol}</span>
                    </div>
                    <div className="donation-address-row">
                      <code className="donation-address">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </code>
                      <button
                        type="button"
                        className="donation-copy-button"
                        onClick={() => handleCopyAddress(address)}
                      >
                        {copiedAddress === address ? (
                          <>
                            <Check size={14} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
