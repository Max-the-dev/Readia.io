import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { Clock, User, Lock, HeartHandshake, Tag } from 'lucide-react';
import { apiService, Article as ArticleType, SupportedAuthorNetwork } from '../services/api';
import { x402PaymentService, type SupportedNetwork } from '../services/x402PaymentService';
import { useAccount, useWalletClient } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import LikeButton from '../components/LikeButton';
import { sanitizeHTML } from '../utils/sanitize';
import AppKitConnectButton from '../components/AppKitConnectButton';
import { createSolanaTransactionSigner } from '../utils/solanaSigner';
import { useAppKitNetwork } from '@reown/appkit/react';





// Article page now uses real API data instead of mock data

function Article() {
  const { id } = useParams();
  const { isConnected, address } = useWallet();
  const { data: walletClient } = useWalletClient();
  const { walletProvider: solanaWalletProvider } = useAppKitProvider('solana');
  const solanaSigner = useMemo(
    () => createSolanaTransactionSigner(solanaWalletProvider),
    [solanaWalletProvider]
  );
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [hasPaid, setHasPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentToast, setShowPaymentToast] = useState(false);

  // Tipping state
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(0.05);
  const [isProcessingTip, setIsProcessingTip] = useState(false);
  const [hasTipped, setHasTipped] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [tipResult, setTipResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
  const [authorNetworks, setAuthorNetworks] = useState<SupportedAuthorNetwork[]>(['base']);
  const [selectedNetworkFamily, setSelectedNetworkFamily] = useState<'base' | 'solana'>('base');

  // Dynamic chain detection to build correct payload
  const { chain } = useAccount();
  const {caipNetworkId} = useAppKitNetwork();
  const detectSolanaNetwork = (caip?: string): SupportedNetwork => {
  if (!caip) return 'solana-devnet';
  if (caip.startsWith('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')) return 'solana';
  if (caip.startsWith('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')) return 'solana-devnet';
  return 'solana-devnet';
};
  const resolvedSolanaNetwork = detectSolanaNetwork(caipNetworkId);
  


  // Handle like count changes
  const handleLikeChange = (articleId: number, newLikeCount: number) => {
    if (article && article.id === articleId) {
      setArticle(prev => prev ? { ...prev, likes: newLikeCount } : null);
    }
  };

  const getNetworkFamily = (network?: SupportedAuthorNetwork | SupportedNetwork): 'base' | 'solana' => {
    if (!network) return 'base';
    return network.includes('solana') ? 'solana' : 'base';
  };

  const availableNetworkFamilies = useMemo(() => {
    const families = new Set<'base' | 'solana'>();
    authorNetworks.forEach((net) => families.add(getNetworkFamily(net)));
    return Array.from(families);
  }, [authorNetworks]);

  useEffect(() => {
    if (!availableNetworkFamilies.length) {
      setSelectedNetworkFamily('base');
      return;
    }
    if (!availableNetworkFamilies.includes(selectedNetworkFamily)) {
      setSelectedNetworkFamily(
        availableNetworkFamilies.includes('base') ? 'base' : availableNetworkFamilies[0]
      );
    }
  }, [availableNetworkFamilies, selectedNetworkFamily]);

  const formatSupportedNetworks = (networks: SupportedAuthorNetwork[]): string => {
    const families = new Set(networks.map(net => getNetworkFamily(net)));
    if (!families.size) return 'Base USDC';
    return Array.from(families)
      .map(family => (family === 'solana' ? 'Solana USDC' : 'Base USDC'))
      .join(' + ');
  };

  // Fetch article on component mount and check payment status
  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      
      setLoading(true);
      setLoadError('');

      try {
        const response = await apiService.getArticleById(parseInt(id));
        if (response.success && response.data) {
          setArticle(response.data);

          const authorInfo = await apiService.getAuthor(response.data.authorAddress);
          if (authorInfo.success && authorInfo.data?.supportedNetworks?.length) {
            setAuthorNetworks(
              Array.from(new Set(authorInfo.data.supportedNetworks))
            );
          }

          // Check if user has already paid for this article (Base or Solana address)
          const potentialPayers = [
            address,
            solanaSigner?.address
          ].filter((value): value is string => Boolean(value));

          for (const payer of potentialPayers) {
            const hasPaidBefore = await x402PaymentService.checkPaymentStatus(
              response.data.id,
              payer
            );
            if (hasPaidBefore) {
              setHasPaid(true);
              break;
            }
          }
        } else {
          setLoadError(response.error || 'Article not found');
        }
      } catch (err) {
        setLoadError('Failed to load article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, address, solanaSigner?.address]);

  // Check if current user is the author of this article
  const isAuthor = Boolean(address && article && address === article.authorAddress);

  // Increment view count when article loads (only once per session)
  useEffect(() => {
    if (article && !isAuthor) {
      // Only increment views for non-authors (views are FREE)
      const incrementViews = async () => {
        try {
          await x402PaymentService.payForView(article.id);
        } catch (error) {
          console.error('Failed to increment views', error);
          // Don't show error to users - this is background functionality
        }
      };
      incrementViews();
    }
  }, [article, isAuthor]); // Only run when article or isAuthor changes

  if (loading) {
    return (
      <div className="article-page">
        <div className="container">
          <div className="article-loading">
            <h1>Loading article...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !article) {
    return (
      <div className="article-page">
        <div className="container">
          <div className="article-not-found">
            <h1>Article not found</h1>
            <p>{loadError || "The article you're looking for doesn't exist."}</p>
          </div>
        </div>
      </div>
    );
  }

  const getNetworkFromChain = (chainId?: number): SupportedNetwork => {
    if (chainId === 8453) return 'base';
    if (chainId === 84532) return 'base-sepolia';
    return 'base-sepolia';
  };
  const authorNetworkLabel = formatSupportedNetworks(authorNetworks);

  const handlePayment = async () => {
    if (!address) {
      console.error('Wallet not connected');
      return;
    }

    const isSolanaSelected = selectedNetworkFamily === 'solana';
    const selectedNetwork: SupportedNetwork = isSolanaSelected ? resolvedSolanaNetwork : getNetworkFromChain(chain?.id);

    setIsProcessingPayment(true);
    setPaymentError('');

    if (isSolanaSelected && !solanaSigner) {
      setPaymentError('Please connect a Solana wallet before paying.');
      setIsProcessingPayment(false);
      return;
    }

    if (!isSolanaSelected && !walletClient) {
      setPaymentError('Unable to access connected wallet. Please reconnect and try again.');
      setIsProcessingPayment(false);
      return;
    }

    try {
      const paymentResult = await x402PaymentService.purchaseArticle(
        article.id,
        {
          network: selectedNetwork,
          evmWalletClient: !isSolanaSelected ? walletClient ?? undefined : undefined,
          solanaSigner: isSolanaSelected ? solanaSigner : undefined,
        }
      );

      if (paymentResult.success) {
        setHasPaid(true);
        setPaymentError('');
        setShowPaymentToast(true);
        setTimeout(() => setShowPaymentToast(false), 3000);
      } else {
        const errorMessage = paymentResult.error || 'Payment verification failed';
        console.error('x402 payment failed:', errorMessage, paymentResult.rawResponse);
        setPaymentError(errorMessage);
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // x402 tip 
  const handleTip = async () => {
    const amount = selectedTipAmount || parseFloat(customTipAmount);

    if (!amount || amount < 0.01 || amount > 100) {
      setTipResult({ success: false, message: 'Please enter a valid tip amount ($0.01-$100.00)' });
      return;
    }

    const isSolanaSelected = selectedNetworkFamily === 'solana';
    const selectedNetwork: SupportedNetwork = isSolanaSelected ? resolvedSolanaNetwork : getNetworkFromChain(chain?.id);

    if (isSolanaSelected && !solanaSigner) {
      setTipResult({ success: false, message: 'Please connect a Solana wallet to tip' });
      return;
    }

    if (!isSolanaSelected && (!isConnected || !walletClient)) {
      setTipResult({ success: false, message: 'Please connect a wallet to tip' });
      return;
    }

    setIsProcessingTip(true);
    setTipResult(null);

    try {
      const result = await x402PaymentService.tip(
        article.id,
        amount,
        {
          network: selectedNetwork,
          evmWalletClient: !isSolanaSelected ? walletClient ?? undefined : undefined,
          solanaSigner: isSolanaSelected ? solanaSigner : undefined,
        }
      );

      if (result.success) {
        setHasTipped(true);
        setTipResult({
          success: true,
          message: `Thank you for tipping $${amount.toFixed(2)}!`,
          txHash: result.rawResponse?.data?.transactionHash
        });
      } else {
        setTipResult({
          success: false,
          message: result.error || 'Tip failed. Please try again.'
        });
      }
    } catch (error: any) {
      console.error('Tip error:', error);
      setTipResult({
        success: false,
        message: error.message || 'Failed to process tip'
      });
    } finally {
      setIsProcessingTip(false);
    }
  };

  // Set default tip options
  const tipOptions = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];

  // Format text with basic markdown support
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
  };

  return (
    <div className="article-page">
      <div className="container">
        <article className="article-content">
          <header className="article-header">
            <h1>{article.title}</h1>
            <div className="article-meta">
              <div className="author-info">
                <User size={16} />
                <span>@{article.authorAddress.slice(0, 6)}...{article.authorAddress.slice(-4)}</span>
              </div>
              <div className="read-info">
                <Clock size={16} />
                <span>{article.readTime}</span>
              </div>
              <div className="publish-date">
                <span>{new Date(article.publishDate).toLocaleDateString()}</span>
              </div>
              <LikeButton 
                articleId={article.id} 
                userAddress={address} 
                initialLikes={article.likes}
                className="article-header-like-button"
                onLikeChange={handleLikeChange}
              />
            </div>
            {article.categories && article.categories.length > 0 && (
              <div className="article-categories">
                <Tag size={16} />
                <div className="category-list">
                  {article.categories.map((category, index) => (
                    <span key={index} className="category-tag">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </header>

          <div className="article-body">
            {!isAuthor && !hasPaid && (
              <div className="article-preview">
                {article.preview.split('\n\n').map((paragraph, index) => (
                  <p key={index} dangerouslySetInnerHTML={{__html: sanitizeHTML(paragraph)}} />
                ))}
              </div>
            )}

            {!hasPaid && !isAuthor && (
              <div className="payment-gate">
                <div className="payment-overlay">
                  <Lock size={48} />
                  <h3>Continue Reading</h3>
                  <p>Unlock the full article with a one-time payment of <strong>${article.price.toFixed(2)}</strong></p>

                  {!isConnected ? (
                    <div className="connect-wallet">
                      <p>Connect your wallet to continue</p>
                      <AppKitConnectButton />
                    </div>
                  ) : (
                    <>
                      <div className="network-selector">
                        {availableNetworkFamilies.includes('base') && (
                          <button
                            type="button"
                            className={`network-option ${selectedNetworkFamily === 'base' ? 'active' : ''}`}
                            onClick={() => setSelectedNetworkFamily('base')}
                          >
                            Base USDC
                          </button>
                        )}
                        {availableNetworkFamilies.includes('solana') && (
                          <button
                            type="button"
                            className={`network-option ${selectedNetworkFamily === 'solana' ? 'active' : ''}`}
                            onClick={() => setSelectedNetworkFamily('solana')}
                          >
                            Solana USDC
                          </button>
                        )}
                      </div>
                      {selectedNetworkFamily === 'solana' && !solanaSigner && (
                        <p className="payment-warning">Connect a Solana wallet to use Solana USDC.</p>
                      )}
                      <button
                        className="pay-button"
                        onClick={handlePayment}
                        disabled={
                          isProcessingPayment ||
                          (selectedNetworkFamily === 'solana' && !solanaSigner)
                        }
                      >
                        {isProcessingPayment ? 'Processing...' : `Pay $${article.price.toFixed(2)}`}
                      </button>

                      <div className="network-support-compact">
                        <span className="network-label">Author Accepts</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {availableNetworkFamilies.includes('base') && (
                            <img
                              src="/icons/base.png"
                              alt="Base"
                              style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                            />
                          )}
                          {availableNetworkFamilies.includes('solana') && (
                            <img
                              src="/icons/solana.png"
                              alt="Solana"
                              style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                            />
                          )}
                        </div>
                      </div>

                      {paymentError && (
                        <div className="payment-error">
                          <p>{paymentError}</p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="payment-benefits">
                    <p>✓ Instant access to full article</p>
                    <p>✓ Support the author directly</p>
                    <p>✓ No subscription required</p>
                  </div>
                </div>
              </div>
            )}

            {isAuthor && (
              <div className="author-notice">
                <p>✍️ You're viewing your own article!</p>
              </div>
            )}

            {(hasPaid || isAuthor) && (
              <div className="full-content">
                {article.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={index}>{paragraph.replace('## ', '')}</h2>;
                  }
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={index}>{paragraph.replace('### ', '')}</h3>;
                  }
                  if (paragraph.startsWith('```')) {
                    const code = paragraph.replace(/```\w*\n?/, '').replace(/```$/, '');
                    return <pre key={index}><code>{code}</code></pre>;
                  }
                  if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter(item => item.startsWith('- '));
                    return (
                      <ul key={index}>
                        {items.map((item, i) => {
                          const text = item.replace('- ', '');
                          return <li key={i} dangerouslySetInnerHTML={{__html: sanitizeHTML(formatText(text))}} />;
                        })}
                      </ul>
                    );
                  }
                  if (paragraph.match(/^\d+\./)) {
                    const items = paragraph.split('\n').filter(item => item.match(/^\d+\./));
                    return (
                      <ol key={index}>
                        {items.map((item, i) => {
                          const text = item.replace(/^\d+\.\s*/, '');
                          return <li key={i} dangerouslySetInnerHTML={{__html: sanitizeHTML(formatText(text))}} />;
                        })}
                      </ol>
                    );
                  }
                  return <p key={index} dangerouslySetInnerHTML={{__html: sanitizeHTML(formatText(paragraph))}} />;
                })}
              </div>
            )}
          </div>
        </article>

        {/* Floating Tip Button - only show for readers after payment */}
        {(hasPaid && !isAuthor) && (
          <div className="floating-tip-container">
            <button 
              className="floating-tip-button"
              onClick={() => {
                setShowTipModal(true);
                setHasTipped(false); // Reset tip success state when opening modal
              }}
              title="Tip the author"
            >
              <HeartHandshake size={15}/> Tip Author
            </button>
          </div>
        )}

        {/* Tip Modal */}
        {showTipModal && (
          <div className="tip-modal-overlay" onClick={() => setShowTipModal(false)}>
            <div className="tip-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tip-modal-header">
                <h3><HeartHandshake size={16}/> Tip the Author</h3>
                <button 
                  className="tip-modal-close"
                  onClick={() => setShowTipModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="tip-modal-content">
                <p>Show your appreciation for this great content!</p>
                
                <div className="tip-amount-selector">
                  <label>Select tip amount:</label>
                  <div className="tip-options">
                    {tipOptions.map((amount) => (
                      <button
                        key={amount}
                        className={`tip-option ${selectedTipAmount === amount ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedTipAmount(amount);
                          setCustomTipAmount(''); // Clear custom input when preset is clicked
                        }}
                      >
                        ${amount.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="tip-custom-amount">
                  <label>Or enter custom amount:</label>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={customTipAmount}
                    onChange={(e) => {
                      setCustomTipAmount(e.target.value);
                      setSelectedTipAmount(null); // Clear preset selection when typing
                    }}
                    className="tip-amount-input"
                  />
                </div>
                
                <div className="tip-modal-actions">
                  <button
                    className="tip-submit-button"
                    onClick={handleTip}
                    disabled={isProcessingTip || !isConnected || (!selectedTipAmount && !customTipAmount)}
                  >
                    {isProcessingTip ? 'Processing...' : `Send Tip $${(selectedTipAmount || parseFloat(customTipAmount) || 0).toFixed(2)}`}
                  </button>
                </div>
                
                      {tipResult && (
                  <div className={`donation-result ${tipResult.success ? 'success' : 'error'}`}>
                    <p>{tipResult.message}</p>
                    {tipResult.txHash && (
                      <p className="donation-tx-hash">
                        Transaction: <code>{tipResult.txHash.slice(0, 10)}...{tipResult.txHash.slice(-8)}</code>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Success Toast */}
        {showPaymentToast && (
          <div className="payment-toast">
            <p>✓ Payment successful!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Article;
