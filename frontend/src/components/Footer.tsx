import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useWalletClient } from 'wagmi';
import { Info, BookOpen, PenTool, HelpCircle, Mail, Shield, FileText, LayoutDashboard, Library, Wrench, HeartHandshake, Copy, Check } from 'lucide-react';
import { x402PaymentService } from '../services/x402PaymentService';


function Footer() {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'usdc' | 'solana'>('usdc');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationResult, setDonationResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Platform donation address
  const platformAddress = '0x6945890b1c074414b813c7643ae10117dec1c8e7';
  const solanaAddress = 'AYL9ipxu2fEbNqWHujynNhdBzSVaeXmfimkWkVqEwPEv'; // Placeholder
  const predefinedAmounts = [1, 5, 25, 50];
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
    setSelectedNetwork('usdc');
  };

  // Dynamic chain detection to build correct payload
  const { chain } = useAccount();

  const getNetworkFromChain = (chainId?: number): 'base' | 'base-sepolia' => {
  if (chainId === 8453) return 'base';          // Base mainnet
  if (chainId === 84532) return 'base-sepolia'; // Base Sepolia
  return 'base-sepolia'; // Default to testnet for safety
  };

  // Donation using existing x402paymentservice functions
  const handleDonate = async () => {
    if (!isConnected || !walletClient) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount < .01 || amount > 100) {
      alert('Please select or enter a valid donation amount ($0.10-$1.00)');
      return;
    }

    setIsProcessing(true);
    setDonationResult(null);

    try {
      const network = getNetworkFromChain(chain?.id);
      const result = await x402PaymentService.donate(amount, walletClient, network);

      if (result.success) {
        setDonationResult({
          success: true,
          message: `Thank you for your $${amount} donation!`,
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
                className={`network-option ${selectedNetwork === 'usdc' ? 'active' : ''}`}
                onClick={() => setSelectedNetwork('usdc')}
              >
                USDC (x402)
              </button>
              <button
                type="button"
                className={`network-option ${selectedNetwork === 'solana' ? 'active' : ''}`}
                onClick={() => setSelectedNetwork('solana')}
              >
                Solana
              </button>
            </div>
            {/* USDC x402 Payment Flow */}
            {selectedNetwork === 'usdc' && (
              <>
                <p className="donation-modal-description">
                  Select an amount to donate via x402 protocol.
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
                    min="1"
                    max="1000"
                    step="1"
                    placeholder="Enter amount ($0.10-$1.00)"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    disabled={isProcessing}
                  />
                </div>
                {/* Wallet Connection Check */}
                {!isConnected && (
                  <p className="donation-warning">
                    ⚠️ Please connect your wallet to donate
                  </p>
                )}
                {/* Donate Button */}
                <button
                  type="button"
                  className="donation-submit-button"
                  onClick={handleDonate}
                  disabled={isProcessing || !isConnected || (!selectedAmount && !customAmount)}
                >
                  {isProcessing ? 'Processing...' : 'Donate with x402'}
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
              </>
            )}
            {/* Solana Coming Soon */}
            {selectedNetwork === 'solana' && (
              <>
                <p className="donation-modal-description">
                  <strong>SOL USDC Support Coming Soon</strong>
                </p>
                <p className="donation-coming-soon-message">
                  We're working on integrating Solana USDC donations via x402 protocol.
                  For now, you can manually send SOL or USDC to our Solana address:
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
              </>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
export default Footer;