import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useWalletClient } from 'wagmi';
import { Info, BookOpen, PenTool, HelpCircle, Mail, Shield, FileText, LayoutDashboard, Library, Laptop, HeartHandshake, Copy, Check, Coins } from 'lucide-react';
import { useAppKitProvider } from '@reown/appkit/react';
import { x402PaymentService, type SupportedNetwork } from '../services/x402PaymentService';
import { createSolanaTransactionSigner } from '../utils/solanaSigner';
import { useAppKitNetwork } from '@reown/appkit/react';
import { useNetworkIconByCaipId } from '../hooks/useNetworkAssets';
import { NETWORK_FALLBACK_ICONS, NETWORK_FAMILY_DEFAULTS } from '../constants/networks';


function Footer() {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedNetworkFamily, setSelectedNetworkFamily] = useState<'base' | 'solana'>('base');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationResult, setDonationResult] = useState<{ success: boolean; message: string; txHash?: string; networkFamily?: 'base' | 'solana'; network?: SupportedNetwork } | null>(null);
  const [isWalletStateReady, setIsWalletStateReady] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { walletProvider: solanaWalletProvider } = useAppKitProvider('solana');
  const solanaSigner = useMemo(
    () => createSolanaTransactionSigner(solanaWalletProvider),
    [solanaWalletProvider]
  );
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Dynamic network selection
  const {caipNetworkId} = useAppKitNetwork();
    const detectSolanaNetwork = (caip?: string): SupportedNetwork => {
    if (!caip) return 'solana-devnet';
    if (caip.startsWith('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')) return 'solana';
    if (caip.startsWith('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')) return 'solana-devnet';
    return 'solana-devnet';
  };
  const resolvedSolanaNetwork = detectSolanaNetwork(caipNetworkId);
  const donationShareUrl = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/donate` : ''),
    []
  );

  const thankYouMessages = [
    "Thank you for your support!",
    "Every donation helps!",
    "You're making a difference!",
    "We appreciate you!",
    "Thanks for believing in us!"
  ];

  const solanaAddress = 'cAXdcMFHK6y9yTP7AMETzXC7zvTeDBbQ5f4nvSWDx51';
  const baseAddress = '0xEc115640B09416a59fE77e4e7b852fE700Fa6bF1';
  const predefinedAmounts = [1, 5, 25, 50];
  const DONATION_STORAGE_KEY = 'penny:lastDonation';
  const DONATION_NETWORK_META: Record<'base' | 'solana', { title: string; caipNetworkId: string }> = {
    base: {
      title: 'Base USDC',
      caipNetworkId: NETWORK_FAMILY_DEFAULTS.base,
    },
    solana: {
      title: 'Solana USDC',
      caipNetworkId: NETWORK_FAMILY_DEFAULTS.solana,
    },
  };
  const donationNetworkIcons = {
    base: useNetworkIconByCaipId(
      DONATION_NETWORK_META.base.caipNetworkId,
      NETWORK_FALLBACK_ICONS[DONATION_NETWORK_META.base.caipNetworkId]
    ),
    solana: useNetworkIconByCaipId(
      DONATION_NETWORK_META.solana.caipNetworkId,
      NETWORK_FALLBACK_ICONS[DONATION_NETWORK_META.solana.caipNetworkId]
    ),
  };
  const isSolanaSelected = selectedNetworkFamily === 'solana';
  const isSelectedNetworkReady = isSolanaSelected
    ? Boolean(solanaSigner)
    : Boolean(isConnected && walletClient);
  const donationNetworkLabel = isSolanaSelected ? 'Solana USDC (x402)' : 'Base USDC (x402)';
  const getNetworkStatus = (family: 'base' | 'solana') => {
    if (family === 'solana') {
      const isReady = Boolean(solanaSigner);
      return {
        isReady,
        badgeText: isReady ? 'Wallet connected' : 'Connect Solana wallet',
        badgeVariant: isReady ? 'success' : 'warning',
        tooltip: isReady ? undefined : 'Connect a Solana wallet in AppKit to donate in Solana USDC.',
      };
    }
    const isReady = Boolean(isConnected && walletClient);
    return {
      isReady,
      badgeText: isReady ? 'Wallet connected' : 'Connect Base wallet',
      badgeVariant: isReady ? 'success' : 'warning',
      tooltip: isReady ? undefined : 'Connect an EVM wallet to donate with Base USDC.',
    };
  };
  const donationNetworkOptions = useMemo(() => {
    return (['base', 'solana'] as const).map((family) => {
      const meta = DONATION_NETWORK_META[family];
      const status = getNetworkStatus(family);
      return {
        family,
        title: meta.title,
        helperText: '',
        icon: donationNetworkIcons[family] || NETWORK_FALLBACK_ICONS[meta.caipNetworkId],
        ...status,
      };
    });
  }, [isConnected, walletClient, solanaSigner, donationNetworkIcons.base, donationNetworkIcons.solana]);
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

  const handleCopyShareLink = async () => {
    if (!donationShareUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(donationShareUrl);
        setShareLinkCopied(true);
        setTimeout(() => setShareLinkCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy donation share link', error);
    }
  };

  const closeDonateModal = useCallback(() => {
    setIsDonateModalOpen(false);
    setCopiedAddress(null);
    setSelectedAmount(null);
    setCustomAmount('');
    setIsProcessing(false);
    setDonationResult(null);
    setSelectedNetworkFamily('base');
    setShareLinkCopied(false);
    setIsWalletStateReady(false);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!isDonateModalOpen) {
      document.body.style.overflow = '';
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setIsWalletStateReady(false);
    let readinessTimer: number | undefined;

    if (typeof window !== 'undefined') {
      readinessTimer = window.setTimeout(() => setIsWalletStateReady(true), 250);
      try {
        const stored = window.localStorage.getItem(DONATION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.networkFamily === 'solana' || parsed.networkFamily === 'base') {
            setSelectedNetworkFamily(parsed.networkFamily);
          }
          if (typeof parsed.amount === 'number') {
            setSelectedAmount(parsed.amount);
          }
          if (typeof parsed.customAmount === 'string') {
            setCustomAmount(parsed.customAmount);
          }
        }
      } catch (error) {
        console.error('Unable to load donation preferences', error);
      }
    } else {
      setIsWalletStateReady(true);
    }

    const modalEl = modalRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirstElement = () => {
      if (!modalEl) return;
      const focusables = modalEl.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    };

    focusFirstElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDonateModal();
        return;
      }
      if (event.key !== 'Tab' || !modalEl) return;
      const focusables = modalEl.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      if (typeof window !== 'undefined' && readinessTimer) {
        window.clearTimeout(readinessTimer);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDonateModalOpen, closeDonateModal]);

  // Typing animation effect
  useEffect(() => {
    if (!isDonateModalOpen) return;

    const currentText = thankYouMessages[currentMessageIndex];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, 80);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (displayText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 40);
        return () => clearTimeout(timeout);
      } else {
        setCurrentMessageIndex((prev) => (prev + 1) % thankYouMessages.length);
        setIsTyping(true);
      }
    }
  }, [displayText, isTyping, currentMessageIndex, thankYouMessages, isDonateModalOpen]);

  const persistDonationPreferences = (preferences: Partial<{ amount: number | null; customAmount: string; networkFamily: 'base' | 'solana' }>) => {
    if (typeof window === 'undefined') return;
    try {
      const existing = window.localStorage.getItem(DONATION_STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      const next = { ...parsed, ...preferences };
      window.localStorage.setItem(DONATION_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist donation preferences', error);
    }
  };

  const parsedCustomAmount = parseFloat(customAmount || '');
  const normalizedCustomAmount = Number.isNaN(parsedCustomAmount) ? null : parsedCustomAmount;
  const activeAmountValue = selectedAmount ?? normalizedCustomAmount ?? null;

  const clampAmount = (value: number) => {
    return Math.min(100, Math.max(0.01, parseFloat(value.toFixed(2))));
  };

  const setAmountSelection = (amount: number | null, customValue: string) => {
    setSelectedAmount(amount);
    setCustomAmount(customValue);
    persistDonationPreferences({ amount, customAmount: customValue });
  };

  const getExplorerUrl = (hash?: string, network?: SupportedNetwork) => {
    if (!hash || !network) return null;
    if (network.includes('solana')) {
      const clusterParam = network === 'solana' ? '' : '?cluster=devnet';
      return `https://solscan.io/tx/${hash}${clusterParam}`;
    }
    const isMainnet = network === 'base';
    const baseUrl = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
    return `${baseUrl}/tx/${hash}`;
  };

  const donationExplorerUrl = useMemo(() => {
    if (!donationResult?.txHash) return null;
    return getExplorerUrl(donationResult.txHash, donationResult.network || undefined);
  }, [donationResult]);

  // Dynamic chain detection to build correct payload
  const getNetworkFromChain = (chainId?: number): SupportedNetwork => {
    if (chainId === 8453) return 'base';          // Base mainnet
    if (chainId === 84532) return 'base-sepolia'; // Base Sepolia
    return 'base-sepolia'; // Default to testnet for safety
  };

  // Donation using x402 payment flow with Base + Solana support
  const handleDonate = async () => {
    const amount = activeAmountValue ?? parseFloat(customAmount);
    if (!amount || amount < 0.01 || amount > 100) {
      setDonationResult({
        success: false,
        message: 'Please enter a valid donation amount ($0.01-$100.00)',
        networkFamily: selectedNetworkFamily,
      });
      return;
    }

    setIsProcessing(true);
    setDonationResult(null);

    const network: SupportedNetwork = isSolanaSelected
      ? resolvedSolanaNetwork
      : getNetworkFromChain(chain?.id);

    try {
      const result = await x402PaymentService.donate(
        amount,
        {
          network,
          evmWalletClient: isSolanaSelected ? undefined : walletClient ?? undefined,
          solanaSigner: isSolanaSelected ? solanaSigner : undefined,
        }
      );

      if (result.success) {
        setDonationResult({
          success: true,
          message: `Thank you for your $${amount.toFixed(2)} donation via ${isSolanaSelected ? 'Solana' : 'Base'}!`,
          txHash: result.rawResponse?.data?.transactionHash,
          networkFamily: selectedNetworkFamily,
          network,
        });
      } else {
        setDonationResult({
          success: false,
          message: result.error || 'Donation failed. Please try again.',
          networkFamily: selectedNetworkFamily,
          network,
        });
      }
    } catch (error: any) {
      console.error('Donation error:', error);
      setDonationResult({
        success: false,
        message: error.message || 'Failed to process donation',
        networkFamily: selectedNetworkFamily,
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Penny.io</h3>
            <p>Content Monetization Reimagined</p>
            {/* Action Buttons */}
            <div className="footer-actions">
              <Link to="/x402-test" className="x402-validation-button">
                <span className="top-key"></span>
                <span className="button-text">
                  <Laptop size={18} />
                  Live Demo
                </span>
                <span className="bottom-key-1"></span>
                <span className="bottom-key-2"></span>
              </Link>
              <button
                type="button"
                className="donate-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsDonateModalOpen(true);
                }}
              >
                <span className="top-key"></span>
                <span className="button-text">
                  <HeartHandshake size={18} />
                  Donate
                </span>
                <span className="bottom-key-1"></span>
                <span className="bottom-key-2"></span>
              </button>
            </div>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><Link to="/whitepaper"><FileText size={16} /> Whitepaper</Link></li>
              <li><Link to="/about"><Info size={16} /> About</Link></li>
              <li><Link to="/how-it-works"><BookOpen size={16} /> How it works</Link></li>
              <li><Link to="/pricing"><FileText size={16} /> Pricing</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Creators</h4>
            <ul>
              <li><Link to="/write"><PenTool size={16}/>Start writing</Link></li>
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
            ref={modalRef}
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
            <div className="donation-modal-grid">
              <section className="donation-summary-column">
                <div className="donation-impact-card">
                  <h4>Thank you for using Penny.io</h4>
                  <p>Donations cover hosting fees, improvements, and new features.</p>
                </div>

                <div className="donation-typing-section">
                  <div className="donation-typing-text">
                    {displayText}
                    <span className="cursor">|</span>
                  </div>
                </div>

                <div className="donation-manual-section">
                  <h5>Prefer the old-school way?</h5>
                  <div className="donation-manual-grid">
                    <div className="donation-manual-card">
                      <div className="donation-manual-card__header">
                        <span className="donation-manual-network">Solana</span>
                      </div>
                      <div className="donation-address-row">
                        <code className="donation-address-truncated">
                          {solanaAddress.slice(0, 6)}...{solanaAddress.slice(-4)}
                        </code>
                        <button
                          type="button"
                          className="donation-copy-button"
                          onClick={() => handleCopyAddress(solanaAddress)}
                        >
                          {copiedAddress === solanaAddress ? (
                            <>
                              <Check size={14} aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                          <span className="sr-only">Copy Solana donation address</span>
                        </button>
                      </div>
                      <p className="donation-full-address"></p>
                    </div>
                    <div className="donation-manual-card">
                      <div className="donation-manual-card__header">
                        <span className="donation-manual-network">Base</span>
                      </div>
                      <div className="donation-address-row">
                        <code className="donation-address-truncated">
                          {baseAddress.slice(0, 6)}...{baseAddress.slice(-4)}
                        </code>
                        <button
                          type="button"
                          className="donation-copy-button"
                          onClick={() => handleCopyAddress(baseAddress)}
                        >
                          {copiedAddress === baseAddress ? (
                            <>
                              <Check size={14} aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                          <span className="sr-only">Copy Base donation address</span>
                        </button>
                      </div>
                      <p className="donation-full-address"></p>
                    </div>
                  </div>
                </div>

                <div className="donation-social-links">
                  <a
                    href="https://x.com/devvinggold"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="donation-social-link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                    @devinggold
                  </a>
                  <a
                    href="https://github.com/Max-the-dev/Penny.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="donation-social-link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Max-the-dev
                  </a>
                </div>
              </section>
              <section className="donation-action-column">
                {!isWalletStateReady ? (
                  <div className="donation-action-skeleton" aria-hidden="true">
                    <span className="donation-skeleton-line"></span>
                    <span className="donation-skeleton-pill"></span>
                    <span className="donation-skeleton-pill wide"></span>
                    <span className="donation-skeleton-line"></span>
                  </div>
                ) : (
                  <>
                    <section
                      className="donation-methods"
                      role="radiogroup"
                      aria-label="Select donation network"
                    >
                      <div className="method-header">
                        <div>
                          <p>Select Chain</p>
                          <span>More networks coming soon</span>
                        </div>
                      </div>
                      <div className="method-grid">
                        {donationNetworkOptions.map(option => {
                          const isActive = selectedNetworkFamily === option.family;
                          return (
                            <button
                              key={option.family}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              aria-label={option.title}
                              className={`method-card${isActive ? ' is-active' : ''}`}
                              onClick={() => {
                                setSelectedNetworkFamily(option.family);
                                persistDonationPreferences({ networkFamily: option.family });
                              }}
                            >
                          {option.icon && (
                            <span className="method-card__icon" aria-hidden="true">
                              <img src={option.icon} alt="" />
                            </span>
                          )}
                              <span className="method-card__body">
                                <span className="method-card__title">{option.title}</span>
                                <span className="method-card__helper">{option.helperText}</span>
                              </span>
                              {isActive && (
                                <span className="method-card__badge">
                                  Selected
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    <section className="donation-amount-module">
                      <p className="donation-modal-description">
                        Select an amount to donate:
                      </p>
                      <div
                        className="donation-amount-scroller"
                        role="group"
                        aria-label="Choose donation amount"
                      >
                        {predefinedAmounts.map(amount => (
                          <button
                            key={amount}
                            type="button"
                            className={`donation-amount-chip ${selectedAmount === amount ? 'is-active' : ''}`}
                            onClick={() => {
                              setAmountSelection(amount, '');
                            }}
                            disabled={isProcessing}
                          >
                            <span>${amount}</span>
                          </button>
                        ))}
                      </div>
                      <div className="custom-amount-input donation-custom-input">
                        <label htmlFor="custom-amount" className="donation-modal-description">Custom amount:</label>
                        <div className="donation-custom-field">
                          <span aria-hidden="true">$</span>
                          <input
                            id="custom-amount"
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                            value={customAmount}
                            onChange={(e) => {
                              setAmountSelection(null, e.target.value);
                            }}
                            disabled={isProcessing}
                            inputMode="decimal"
                          />
                        </div>
                        <small>Min $0.01 · Max $100.00</small>
                      </div>
                    </section>
                    <button
                      type="button"
                      className="pay-button donation-submit-button"
                      onClick={handleDonate}
                      disabled={isProcessing || !activeAmountValue}
                    >
                      <span className="pay-button__label">
                        {isProcessing ? 'Processing...' : activeAmountValue ? `Donate $${activeAmountValue.toFixed(2)}` : 'Donate'}
                      </span>
                      <Coins size={18} aria-hidden="true" className="pay-button__icon" />
                    </button>
                    <div className="donation-status-region" aria-live="polite" aria-atomic="true">
                      {donationResult && (
                        <div className={`donation-alert donation-alert--${donationResult.success ? 'success' : 'error'}`} role="alert">
                          <p>{donationResult.message}</p>
                          {donationResult.txHash && (
                            <p className="donation-tx-hash">
                              Transaction:{' '}
                              <code>{donationResult.txHash.slice(0, 10)}...{donationResult.txHash.slice(-8)}</code>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {donationResult?.success && (
                      <div className="donation-share-actions">
                        <button
                          type="button"
                          className="donation-share-link"
                          onClick={handleCopyShareLink}
                        >
                          {shareLinkCopied ? 'Link copied' : 'Copy shareable donation link'}
                        </button>
                        {donationExplorerUrl && (
                          <a
                            href={donationExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="donation-share-link view-transaction"
                          >
                            View transaction
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
export default Footer;
