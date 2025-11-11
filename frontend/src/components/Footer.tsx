import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useWalletClient } from 'wagmi';
import { Info, BookOpen, PenTool, HelpCircle, Mail, Shield, FileText, LayoutDashboard, Library, Wrench, HeartHandshake, Copy, Check } from 'lucide-react';
import { useAppKitProvider } from '@reown/appkit/react';
import AppKitConnectButton from './AppKitConnectButton';
import { x402PaymentService, type SupportedNetwork } from '../services/x402PaymentService';
import { createSolanaTransactionSigner } from '../utils/solanaSigner';
import { useAppKitNetwork } from '@reown/appkit/react';


function Footer() {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedNetworkFamily, setSelectedNetworkFamily] = useState<'base' | 'solana'>('base');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationResult, setDonationResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { walletProvider: solanaWalletProvider } = useAppKitProvider('solana');
  const solanaSigner = useMemo(
    () => createSolanaTransactionSigner(solanaWalletProvider),
    [solanaWalletProvider]
  );

  // Dynamic network selection
  const {caipNetworkId} = useAppKitNetwork();
    const detectSolanaNetwork = (caip?: string): SupportedNetwork => {
    if (!caip) return 'solana-devnet';
    if (caip.startsWith('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')) return 'solana';
    if (caip.startsWith('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')) return 'solana-devnet';
    return 'solana-devnet';
  };
  const resolvedSolanaNetwork = detectSolanaNetwork(caipNetworkId);

  const solanaAddress = 'cAXdcMFHK6y9yTP7AMETzXC7zvTeDBbQ5f4nvSWDx51';
  const predefinedAmounts = [1, 5, 25, 50];
  const isSolanaSelected = selectedNetworkFamily === 'solana';
  const isNetworkReady = isSolanaSelected
    ? Boolean(solanaSigner)
    : Boolean(isConnected && walletClient);
  const donationNetworkLabel = isSolanaSelected ? 'Solana USDC (x402)' : 'Base USDC (x402)';
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
    setSelectedAmount(null);
    setCustomAmount('');
    setIsProcessing(false);
    setDonationResult(null);
    setSelectedNetworkFamily('base');
  };

  // Dynamic chain detection to build correct payload
  const getNetworkFromChain = (chainId?: number): SupportedNetwork => {
    if (chainId === 8453) return 'base';          // Base mainnet
    if (chainId === 84532) return 'base-sepolia'; // Base Sepolia
    return 'base-sepolia'; // Default to testnet for safety
  };

  // Donation using x402 payment flow with Base + Solana support
  const handleDonate = async () => {
    const amount = selectedAmount ?? parseFloat(customAmount);
    if (!amount || amount < 0.01 || amount > 100) {
      setDonationResult({
        success: false,
        message: 'Please enter a valid donation amount ($0.01-$100.00)',
      });
      return;
    }

    if (isSolanaSelected && !solanaSigner) {
      setDonationResult({
        success: false,
        message: 'Connect a Solana wallet to donate with USDC on Solana.',
      });
      return;
    }

    if (!isSolanaSelected && (!isConnected || !walletClient)) {
      setDonationResult({
        success: false,
        message: 'Connect a Base-compatible wallet to donate.',
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
        });
      } else {
        setDonationResult({
          success: false,
          message: result.error || 'Donation failed. Please try again.',
        });
      }
    } catch (error: any) {
      console.error('Donation error:', error);
      setDonationResult({
        success: false,
        message: error.message || 'Failed to process donation',
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
            {/* Network Selector */}
            <div className="donation-network-selector">
              <button
                type="button"
                className={`network-option ${!isSolanaSelected ? 'active' : ''}`}
                onClick={() => setSelectedNetworkFamily('base')}
              >
                Base USDC
              </button>
              <button
                type="button"
                className={`network-option ${isSolanaSelected ? 'active' : ''}`}
                onClick={() => setSelectedNetworkFamily('solana')}
              >
                Solana USDC
              </button>
            </div>
            <>
              <p className="donation-modal-description">
                Select an amount to donate via {donationNetworkLabel}.
              </p>
              {/* Predefined Amount Buttons */}
              <div className="donation-amounts">
                {predefinedAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`amount-button ${selectedAmount === amount ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    disabled={isProcessing}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              {/* Custom Amount Input */}
              <div className="custom-amount-input">
                <label htmlFor="custom-amount">Or enter custom amount:</label>
                <input
                  id="custom-amount"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  placeholder="Enter amount ($0.01-$100.00)"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  disabled={isProcessing}
                />
              </div>
              {/* Wallet Connection Check */}
              {!isNetworkReady && (
                <div className="donation-warning">
                  <p>Connect a {isSolanaSelected ? 'Solana' : 'Base'} wallet to donate.</p>
                  <AppKitConnectButton />
                </div>
              )}
              {/* Donate Button */}
              <button
                type="button"
                className="donation-submit-button"
                onClick={handleDonate}
                disabled={isProcessing || !isNetworkReady || (!selectedAmount && !customAmount)}
              >
                {isProcessing ? 'Processing...' : `Donate with ${isSolanaSelected ? 'Solana' : 'Base'} USDC`}
              </button>
              {/* Donation Result */}
              {donationResult && (
                <div className={`donation-result ${donationResult.success ? 'success' : 'error'}`}>
                  <p>{donationResult.message}</p>
                  {donationResult.txHash && (
                    <p className="donation-tx-hash">
                      Transaction: <code>{donationResult.txHash.slice(0, 10)}...{donationResult.txHash.slice(-8)}</code>
                    </p>
                  )}
                </div>
              )}
              {isSolanaSelected && (
                <div className="donation-manual-transfer">
                  <p className="donation-coming-soon-message">
                    Prefer a manual Solana transfer? Send USDC to:
                  </p>
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
                  <p className="donation-full-address">
                    <small>Full address: <code>{solanaAddress}</code></small>
                  </p>
                </div>
              )}
            </>
          </div>
        </div>
      )}
    </footer>
  );
}
export default Footer;
