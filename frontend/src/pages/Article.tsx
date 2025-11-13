import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { Clock, User, Lock, HeartHandshake, Tag, Coins } from 'lucide-react';
import { apiService, Article as ArticleType, type AuthorWallet, type SupportedAuthorNetwork } from '../services/api';
import { x402PaymentService, type SupportedNetwork } from '../services/x402PaymentService';
import { useAccount, useWalletClient } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import LikeButton from '../components/LikeButton';
import { sanitizeHTML } from '../utils/sanitize';
import AppKitConnectButton from '../components/AppKitConnectButton';
import { createSolanaTransactionSigner } from '../utils/solanaSigner';
import { useAppKitNetwork } from '@reown/appkit/react';

type NetworkFamily = 'base' | 'solana';

const NETWORK_META: Record<NetworkFamily, { title: string; helperText: string; icon: string }> = {
  base: {
    title: 'Base · USDC',
    helperText: '',
    icon: '/icons/base.png',
  },
  solana: {
    title: 'Solana · USDC',
    helperText: '',
    icon: '/icons/solana.png',
  },
};





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
  const [selectedNetworkFamily, setSelectedNetworkFamily] = useState<NetworkFamily>('base');
  const [selectedTipNetworkFamily, setSelectedTipNetworkFamily] = useState<NetworkFamily>('base');
  const [authorWallets, setAuthorWallets] = useState<AuthorWallet[]>([]);
  const [isPaymentStatusLoaded, setIsPaymentStatusLoaded] = useState(false);

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
    const families = new Set<NetworkFamily>();
    authorNetworks.forEach((net) => families.add(getNetworkFamily(net)));
    return Array.from(families);
  }, [authorNetworks]);

  const paymentMethodOptions = useMemo(() => {
    return availableNetworkFamilies.map(family => {
      const meta = NETWORK_META[family];
      return {
        family,
        title: meta.title,
        helperText: meta.helperText,
        icon: meta.icon,
      };
    });
  }, [availableNetworkFamilies]);

  const selectedNetworkLabel = selectedNetworkFamily === 'solana' ? 'Solana USDC' : 'Base USDC';

  const isTipNetworkReady = selectedTipNetworkFamily === 'solana'
    ? Boolean(solanaSigner)
    : Boolean(isConnected && walletClient);

  useEffect(() => {
    if (!availableNetworkFamilies.length) {
      setSelectedNetworkFamily('base');
      setSelectedTipNetworkFamily('base');
      return;
    }
    if (!availableNetworkFamilies.includes(selectedNetworkFamily)) {
      setSelectedNetworkFamily(
        availableNetworkFamilies.includes('base') ? 'base' : availableNetworkFamilies[0]
      );
    }
    if (!availableNetworkFamilies.includes(selectedTipNetworkFamily)) {
      setSelectedTipNetworkFamily(
        availableNetworkFamilies.includes('base') ? 'base' : availableNetworkFamilies[0]
      );
    }
  }, [availableNetworkFamilies, selectedNetworkFamily, selectedTipNetworkFamily]);

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
          setHasPaid(false);
          setIsPaymentStatusLoaded(false);

          const authorInfo = await apiService.getAuthor(response.data.authorAddress);
          if (authorInfo.success && authorInfo.data) {
            if (authorInfo.data.supportedNetworks?.length) {
              setAuthorNetworks(
                Array.from(new Set(authorInfo.data.supportedNetworks))
              );
            }

            if (authorInfo.data.wallets?.length) {
              setAuthorWallets(authorInfo.data.wallets);
            } else {
              setAuthorWallets([{
                id: 'primary-fallback',
                authorUuid: authorInfo.data.authorUuid || 'primary',
                address: authorInfo.data.address,
                network: authorInfo.data.primaryPayoutNetwork || 'base',
                isPrimary: true,
                createdAt: authorInfo.data.createdAt,
              }]);
            }
          }

          // Check if user has already paid for this article (Base or Solana address)
          const potentialPayers = [
            address,
            solanaSigner?.address
          ].filter((value): value is string => Boolean(value));

          if (!potentialPayers.length) {
            setHasPaid(false);
            setIsPaymentStatusLoaded(false);
            return;
          }

          let hasAccess = false;
          try {
            for (const payer of potentialPayers) {
              const hasPaidBefore = await x402PaymentService.checkPaymentStatus(
                response.data.id,
                payer
              );
              if (hasPaidBefore) {
                hasAccess = true;
                break;
              }
            }
          } finally {
            setHasPaid(hasAccess);
            setIsPaymentStatusLoaded(true);
          }
        } else {
          setLoadError(response.error || 'Article not found');
          setIsPaymentStatusLoaded(true);
        }
      } catch (err) {
        setLoadError('Failed to load article');
        console.error('Error fetching article:', err);
        setIsPaymentStatusLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, address, solanaSigner?.address]);

  // Check if current user is the author of this article
  const normalizeWalletAddress = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    if (value.startsWith('0x')) {
      return value.toLowerCase();
    }
    return value;
  };

  const normalizedUserAddress = useMemo(() => normalizeWalletAddress(address), [address]);

  const isAuthor = useMemo(() => {
    if (!normalizedUserAddress) return false;
    if (authorWallets.length) {
      return authorWallets.some(wallet => normalizeWalletAddress(wallet.address) === normalizedUserAddress);
    }
    if (article) {
      return normalizeWalletAddress(article.authorAddress) === normalizedUserAddress;
    }
    return false;
  }, [normalizedUserAddress, authorWallets, article?.authorAddress]);

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
      setPaymentError('Connect a Solana USDC-compatible wallet to complete this payment.');
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

    const isSolanaTip = selectedTipNetworkFamily === 'solana';
    const selectedNetwork: SupportedNetwork = isSolanaTip ? resolvedSolanaNetwork : getNetworkFromChain(chain?.id);

    if (isSolanaTip && !solanaSigner) {
      setTipResult({ success: false, message: 'Please connect a Solana wallet to tip' });
      return;
    }

    if (!isSolanaTip && (!isConnected || !walletClient)) {
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
          evmWalletClient: !isSolanaTip ? walletClient ?? undefined : undefined,
          solanaSigner: isSolanaTip ? solanaSigner : undefined,
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
            {!isAuthor && !isPaymentStatusLoaded && (
              <div className="article-preview">
                <p>
                  {address
                    ? 'Checking your access...'
                    : 'Connect your wallet to check access.'}
                </p>
              </div>
            )}

            {!isAuthor && isPaymentStatusLoaded && !hasPaid && (
              <div className="article-preview">
                {article.preview.split('\n\n').map((paragraph, index) => (
                  <p key={index} dangerouslySetInnerHTML={{__html: sanitizeHTML(paragraph)}} />
                ))}
              </div>
            )}

            {!hasPaid && isPaymentStatusLoaded && !isAuthor && (
              <div className="payment-gate">
                <div className="paywall-card">
                  <div className="paywall-body">
                  <section className="paywall-summary">
                    <div className="paywall-summary__headline">
                      <div className="paywall-summary__icon">
                        <Lock size={28} />
                      </div>
                      <div className="paywall-summary__content">
                        <h3>Keep Reading</h3>
                        <p>
                          Unlock full article for{' '}
                          <strong>${article.price.toFixed(2)}</strong>
                        </p>
                      </div>
                    </div>

                    {!isConnected && (
                      <div className="connect-wallet">
                        <p>Connect your wallet to continue</p>
                        <AppKitConnectButton />
                      </div>
                    )}

                    <ul className="payment-benefits">
                      <li>Instant access to full article</li>
                      <li>Direct x402 payment to author's wallet</li>
                      <li>No subscription required </li>
                    </ul>
                  </section>

                  {isConnected && paymentMethodOptions.length > 0 && <div className="paywall-divider" aria-hidden="true" />}

                  {isConnected && paymentMethodOptions.length > 0 && (
                    <section
                      className="paywall-methods"
                      role="radiogroup"
                      aria-label="Select payment network"
                    >
                      <div className="method-header">
                        <div>
                          <p>Complete purchase</p>
                          <span>Available payment options:</span>
                        </div>
                      </div>

                      <div className="method-grid">
                        {paymentMethodOptions.map(option => {
                          const isActive = selectedNetworkFamily === option.family;
                          return (
                            <button
                              key={option.family}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              aria-label={option.title}
                              className={`method-card${isActive ? ' is-active' : ''}`}
                              onClick={() => setSelectedNetworkFamily(option.family)}
                            >
                              <span className="method-card__icon" aria-hidden="true">
                                <img src={option.icon} alt="" />
                              </span>
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

                      <button
                        className="pay-button"
                        onClick={handlePayment}
                        disabled={isProcessingPayment}
                      >
                        <span className="pay-button__label">
                          {isProcessingPayment
                            ? 'Processing...'
                            : `Pay $${article.price.toFixed(2)}`}
                        </span>
                        <Coins
                          size={18}
                          aria-hidden="true"
                          className="pay-button__icon"
                        />
                      </button>

                      {paymentError && (
                        <div className="payment-error">
                          <p>{paymentError}</p>
                        </div>
                      )}
                      <p className="paywall-footnote">Blockchain transactions are final.</p>

                    </section>
                  )}
                  </div>

                  <div className="paywall-footer">
                    <div className="paywall-footer__row">
                      <div className="paywall-accepts-line">
                        <span className="network-label">Author accepts:</span>
                        <div className="paywall-accepts__icons">
                          {availableNetworkFamilies.includes('base') && (
                            <img src="/icons/base.png" alt="Base icon" className="network-icon" />
                          )}
                          {availableNetworkFamilies.includes('solana') && (
                            <img src="/icons/solana.png" alt="Solana icon" className="network-icon" />
                          )}
                        </div>
                      </div>
                      <div className="paywall-powered hero-meta">
                        <span className="hero-powered-label">Powered by</span>
                        <span className="hero-powered-brand">Coinbase x402</span>
                      </div>
                    </div>
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
                setSelectedTipAmount(null);
                setCustomTipAmount('');
                setTipResult(null);
                setSelectedTipNetworkFamily(
                  availableNetworkFamilies.includes(selectedNetworkFamily)
                    ? selectedNetworkFamily
                    : availableNetworkFamilies[0] || 'base'
                );
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

                {availableNetworkFamilies.length > 0 && (
                  <div className="tip-network-selector">
                    <label>Choose network:</label>
                    <div className="tip-network-options">
                      {(['base', 'solana'] as const).map((family) => {
                        const isSupported = availableNetworkFamilies.includes(family);
                        return (
                          <button
                            key={family}
                            type="button"
                            className={`network-option ${selectedTipNetworkFamily === family ? 'active' : ''} ${!isSupported ? 'disabled' : ''}`}
                            onClick={() => isSupported && setSelectedTipNetworkFamily(family)}
                            disabled={!isSupported}
                          >
                            {family === 'solana' ? 'Solana' : 'Base'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="tip-modal-actions">
                  <button
                    className="tip-submit-button"
                    onClick={handleTip}
                    disabled={
                      isProcessingTip ||
                      !isTipNetworkReady ||
                      (!selectedTipAmount && !customTipAmount)
                    }
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
