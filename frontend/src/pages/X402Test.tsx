import React, { useMemo, useState } from 'react';
import { useChainId, useWalletClient } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { useAppKitNetwork, useAppKitProvider, useWalletInfo } from '@reown/appkit/react';
import { x402PaymentService, type PaymentRequirement, type PaymentExecutionContext, type SupportedNetwork } from '../services/x402PaymentService';
import { useWallet } from '../contexts/WalletContext';
import { createSolanaTransactionSigner } from '../utils/solanaSigner';
import { useNetworkIcon } from '../hooks/useNetworkAssets';
import { NETWORK_FALLBACK_ICONS } from '../constants/networks';

const X402Test: React.FC = () => {
  const { address, isConnected } = useWallet();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { caipNetworkId, chainId: appKitChainId, caipNetwork } = useAppKitNetwork();
  const { walletProvider: solanaWalletProvider } = useAppKitProvider('solana');
  const { walletInfo } = useWalletInfo();
  const solanaSigner = useMemo(
    () => createSolanaTransactionSigner(solanaWalletProvider),
    [solanaWalletProvider]
  );
  const currentNetworkIcon = useNetworkIcon(
    caipNetwork,
    caipNetwork?.caipNetworkId ? NETWORK_FALLBACK_ICONS[caipNetwork.caipNetworkId] : undefined
  );

  const [currentPaymentReq, setCurrentPaymentReq] = useState<PaymentRequirement | null>(null);
  const [selectedArticle, setSelectedArticle] = useState('92');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    paymentReq?: string;
    payment?: string;
    verification?: string;
    verificationHtml?: string;
  }>({});

  const SUPPORTED_NETWORKS: Record<string, { label: string; supported: SupportedNetwork; family: 'evm' | 'solana'; explorerUrl: (hash: string) => string }> = {
    'eip155:8453': {
      label: 'Base Mainnet',
      supported: 'base',
      family: 'evm',
      explorerUrl: (hash: string) => `https://basescan.org/tx/${hash}`,
    },
    'eip155:84532': {
      label: 'Base Sepolia',
      supported: 'base-sepolia',
      family: 'evm',
      explorerUrl: (hash: string) => `https://sepolia.basescan.org/tx/${hash}`,
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      label: 'Solana Mainnet',
      supported: 'solana',
      family: 'solana',
      explorerUrl: (hash: string) => `https://solscan.io/tx/${hash}`,
    },
    'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
      label: 'Solana Devnet',
      supported: 'solana-devnet',
      family: 'solana',
      explorerUrl: (hash: string) => `https://solscan.io/tx/${hash}?cluster=devnet`,
    },
  };

  const fallbackChainId = appKitChainId ?? chainId;
  const normalizedCaipId =
    caipNetworkId ||
    (typeof fallbackChainId === 'number' ? `eip155:${fallbackChainId}` : undefined);

  const currentNetworkInfo = normalizedCaipId
    ? SUPPORTED_NETWORKS[normalizedCaipId]
    : undefined;

  const detectedFamily: 'evm' | 'solana' | 'unknown' = normalizedCaipId
    ? normalizedCaipId.startsWith('solana:')
      ? 'solana'
      : normalizedCaipId.startsWith('eip155:')
        ? 'evm'
        : 'unknown'
    : 'unknown';

  const isSolanaNetwork = detectedFamily === 'solana';
  const isEvmNetwork = detectedFamily === 'evm';
  const currentNetworkName = currentNetworkInfo?.label
    ? currentNetworkInfo.label
    : isSolanaNetwork
      ? 'Solana Wallet'
      : isEvmNetwork && fallbackChainId
        ? `Chain ${fallbackChainId}`
        : 'Unknown';
  const preferredNetwork: SupportedNetwork = currentNetworkInfo?.supported ?? 'base';
  const isSupportedNetwork = Boolean(currentNetworkInfo);

  const explorerUrlBuilder = currentNetworkInfo?.explorerUrl;
  const networkStatusMessage = isSupportedNetwork
    ? 'Connected'
    : isSolanaNetwork
      ? 'Switch to Solana Mainnet or Devnet inside your wallet.'
      : isEvmNetwork
        ? 'Switch to Base Mainnet or Base Sepolia inside your wallet.'
        : 'Connect a supported Base or Solana network.';

  const articles = [
    { id: '92', title: 'Test article 1', price: '$0.01' },
    { id: '93', title: 'Test article 2', price: '$0.01' },
    { id: '94', title: 'Test article 3', price: '$0.01' },
  ];

  const getPaymentRequirements = async () => {
    try {
      setTestResults(prev => ({ ...prev, paymentReq: '⏳ Fetching payment requirements...' }));

      const response = await x402PaymentService.attemptPayment(
        `/articles/${selectedArticle}/purchase`,
        undefined,
        preferredNetwork
      );

      if (response.paymentRequired) {
        setCurrentPaymentReq(response.paymentRequired);

        const requirement = response.paymentRequired.accept;
        const amountDisplay = requirement
          ? `$${(parseInt(requirement.maxAmountRequired, 10) / 1_000_000).toFixed(2)} (${requirement.maxAmountRequired} micro USDC)`
          : 'Unknown';

        const prettyJson = JSON.stringify(response.paymentRequired.raw, null, 2);

        const result = `✅ Payment Requirements Received

💰 Amount: ${amountDisplay}
👤 Pay To (Author): ${requirement?.payTo}
🌐 Network: ${requirement?.network}
🪙 Asset: USDC (${requirement?.asset})
📝 Description: ${requirement?.description}

Raw Response:
${prettyJson}

Ready to execute transaction!`;

        setTestResults(prev => ({ ...prev, paymentReq: result }));
      } else if (response.success) {
        setTestResults(prev => ({ 
          ...prev, 
          paymentReq: '✅ Already paid! Access granted without new authorization.' 
        }));
      } else if (response.error) {
        setTestResults(prev => ({ ...prev, paymentReq: `❌ Error: ${response.error}` }));
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, paymentReq: `❌ Error: ${error.message}` }));
    }
  };

  // Format encoded header for display (wrap every 60 chars)
  const formatEncodedHeader = (header: string | undefined): string => {
    if (!header) return 'N/A';
    const chunkSize = 60;
    const chunks: string[] = [];
    for (let i = 0; i < header.length; i += chunkSize) {
      chunks.push(header.substring(i, i + chunkSize));
    }
    return chunks.join('\n  ');
  };

  const executePayment = async () => {
    if (!address || !currentPaymentReq) {
      alert('Please connect wallet and get payment requirements first');
      return;
    }

    if (isSolanaNetwork && !solanaSigner) {
      setTestResults(prev => ({
        ...prev,
        payment: '❌ Please connect a Solana wallet to continue.',
        verificationHtml: undefined,
      }));
      return;
    }

    if (!isSolanaNetwork && !walletClient) {
      setTestResults(prev => ({ 
        ...prev, 
        payment: '❌ Wallet client unavailable. Please reconnect and retry.' ,
        verificationHtml: undefined
      }));
      return;
    }

    try {
      setTestResults(prev => ({ ...prev, payment: '⏳ Preparing x402 payment header...', verificationHtml: undefined }));

      const executionContext: PaymentExecutionContext = {
        network: preferredNetwork,
        evmWalletClient: isSolanaNetwork ? undefined : walletClient,
        solanaSigner: isSolanaNetwork ? solanaSigner : undefined,
      };

      const purchaseResult = await x402PaymentService.purchaseArticle(
        parseInt(selectedArticle, 10),
        executionContext
      );

      if (purchaseResult.success) {
        // Extract transaction hash from backend response
        const txHash = purchaseResult.rawResponse?.data?.transactionHash;
        
        // Store for verification section
        if (txHash) {
          setLastTxHash(txHash);
        }

        const formattedHeader = formatEncodedHeader(purchaseResult.encodedHeader);

        const successMsg = `🎉 PAYMENT SUCCESSFUL!

Receipt: ${purchaseResult.receipt}

Encoded Header:
  ${formattedHeader}

🔧 Settling payment via CDP facilitator...
   From: ${address}
   To: ${currentPaymentReq.to}
   Amount: ${currentPaymentReq.accept?.maxAmountRequired} micro USDC
   ${
     txHash
       ? `Transaction Hash: ${txHash}`
       : '⚠️ Settlement succeeded but no transaction hash returned'
   }

✅ Settlement completed successfully!
✅ Access to article granted.`;

        setTestResults(prev => ({ ...prev, payment: successMsg }));
      } else {
        const failureDetail = purchaseResult.error || 'Payment failed';
        const raw = purchaseResult.rawResponse 
          ? `\nResponse: ${JSON.stringify(purchaseResult.rawResponse, null, 2)}` 
          : '';
        setTestResults(prev => ({ 
          ...prev, 
          payment: `❌ Payment Failed: ${failureDetail}${raw}`,
          verificationHtml: undefined 
        }));
      }
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        payment: `❌ Payment Failed: ${error.message}`,
        verificationHtml: undefined 
      }));
    }
  };

  const verifyPayment = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/payment-status/${selectedArticle}/${address}`);
      const result = await response.json();

      if (result.success && result.data.hasPaid) {
        const articleTitle = articles.find(a => a.id === selectedArticle)?.title || 'Unknown';
        const articleUrl = `${window.location.origin}/article/${selectedArticle}`;
        const explorerUrl = lastTxHash && explorerUrlBuilder
          ? explorerUrlBuilder(lastTxHash)
          : null;

        const successLines = [
          '✅ PAYMENT VERIFIED!',
          '',
          'Payment Status: PAID ✅',
          `Article: ${articleTitle}`,
          `Your Wallet: ${result.data.userAddress}`,
          '',
          `🔗 Verify Access: ${articleUrl}`,
        ];

        if (explorerUrl) {
          successLines.push(`🔗 Verify Payment: ${explorerUrl}`);
        }

        successLines.push('', `Congrats on completing your first transaction on ${currentNetworkName} 🚀`);

        const successMsg = successLines.join('\n');
        let successHtml = successMsg.replace(/\n/g, '<br />');
        successHtml = successHtml.replace(
          articleUrl,
          `<a href="${articleUrl}" target="_blank" rel="noopener noreferrer">${articleUrl}</a>`
        );

        if (explorerUrl) {
          successHtml = successHtml.replace(
            explorerUrl,
            `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">${explorerUrl}</a>`
          );
        }

        setTestResults(prev => ({ 
          ...prev, 
          verification: successMsg,
          verificationHtml: successHtml 
        }));
      } else {
        setTestResults(prev => ({ 
          ...prev, 
          verification: '❌ Payment not found in system',
          verificationHtml: undefined 
        }));
      }
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        verification: `❌ Error: ${error.message}`,
        verificationHtml: undefined 
      }));
    }
  };

  return (
    <div className="circuit-wrapper">
      <div className="circuit-background"></div>
      <div className="container">
        {/* Hero Section */}
        <div className="hero-section">
        <div className="hero-meta">
          <span className="hero-powered-label">Powered by</span>
          <span className="hero-powered-brand">Coinbase x402</span>
        </div>
        <h1 className="hero-title">x402 Payment Protocol</h1>
        <p className="hero-subtitle">Live Demo</p>
      </div>

      {/* Main Content */}
      <div className="content-wrapper">
        {/* Wallet Status */}
        <div className="test-section">
          <div className="section-header">
            <h2 className="section-title">Wallet Connection</h2>
            {isConnected && (
              <span className={`status-badge ${isSupportedNetwork ? 'success' : 'warning'}`}>
                {isSupportedNetwork ? 'Connected' : 'Wrong Network'}
              </span>
            )}
          </div>
          {isConnected ? (
            <div className={`info-card ${isSupportedNetwork ? 'success' : 'warning'}`}>
              <div className="info-row-horizontal">
                <div className="info-column">
                  <span className="info-label">Wallet</span>
                  <span className="info-value wallet-name">
                    {walletInfo?.icon && (
                      <img src={walletInfo.icon} alt={walletInfo.name} className="wallet-icon" />
                    )}
                    {walletInfo?.name || 'Connected'}
                  </span>
                </div>
                <div className="info-column">
                  <span className="info-label">Address</span>
                  <span className="info-value mono-text">{address}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="info-card error">
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-value">Disconnected</span>
              </div>
              <div className="info-row">
                <span className="info-label">Action Required</span>
                <span className="info-value">Connect wallet using the button in the header</span>
              </div>
            </div>
          )}
        </div>

        {/* Network Check */}
        <div className="test-section">
          <div className="section-header">
            <h2 className="section-title">Network Configuration</h2>
            {isConnected && (
              <span className={`status-badge ${isSupportedNetwork ? 'success' : 'error'}`}>
                {isSupportedNetwork ? 'Supported' : 'Unsupported'}
              </span>
            )}
          </div>
          <div className={`info-card ${isSupportedNetwork ? 'success' : 'error'}`}>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Network</span>
                <span className="info-value network-info">
                  {currentNetworkIcon && (
                    <img src={currentNetworkIcon} alt={`${currentNetworkName} icon`} className="network-icon" />
                  )}
                  {currentNetworkName}
                </span>
              </div>
              <div className="info-row info-row-type">
                <span className="info-label">Type</span>
                <span className="info-value">{isSolanaNetwork ? 'SVM' : isEvmNetwork ? 'EVM' : 'Unknown'}</span>
              </div>
              <div className="info-row info-row-identifier">
                <span className="info-label">Identifier</span>
                <span className="info-value mono-text small">
                  {isSolanaNetwork ? normalizedCaipId || '—' : chainId ?? '—'}
                </span>
              </div>
            </div>
            <div className="info-row status-row">
              <span className="info-label">Status</span>
              <span className="info-value">{networkStatusMessage}</span>
            </div>
          </div>
        </div>

        {/* Article Selection */}
        <div className="test-section">
          <div className="section-header">
            <h2 className="section-title">Article Selection</h2>
            <span className="step-badge">Step 1</span>
          </div>
          <div className="action-card">
            <div className="form-group">
              <label htmlFor="articleSelect" className="form-label">Choose an article to purchase</label>
              <select
                id="articleSelect"
                value={selectedArticle}
                onChange={(e) => setSelectedArticle(e.target.value)}
                className="select-input"
              >
                {articles.map(article => (
                  <option key={article.id} value={article.id}>
                    {article.title} ({article.price})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={getPaymentRequirements}
              disabled={!isConnected || !isSupportedNetwork}
              className="action-button primary"
            >
              Get Payment Requirements
            </button>
            {testResults.paymentReq && (
              <div className="result-box">{testResults.paymentReq}</div>
            )}
          </div>
        </div>

        {/* Payment Flow */}
        <div className="test-section">
          <div className="section-header">
            <h2 className="section-title">Payment Execution</h2>
            <span className="step-badge">Step 2</span>
          </div>
          <div className="action-card">
            <p className="description">
              This will send the x402 payload to your wallet for authorization.
              Once confirmed, the Coinbase x402 Facilitator will automatically settle your payment on-chain (gas-free).
            </p>
            <button
              onClick={executePayment}
              disabled={
                !isConnected ||
                !isSupportedNetwork ||
                !currentPaymentReq ||
                (isSolanaNetwork && !solanaSigner) ||
                (!isSolanaNetwork && !walletClient)
              }
              className="action-button accent"
            >
              Execute Transaction
            </button>
            {testResults.payment && (
              <div className="result-box">{testResults.payment}</div>
            )}
          </div>
        </div>

        {/* Verification */}
        <div className="test-section">
          <div className="section-header">
            <h2 className="section-title">Transaction Verification</h2>
            <span className="step-badge">Step 3</span>
          </div>
          <div className="action-card">
            <p className="description">
              Verify that your payment was executed on-chain and you now have access to the article.
            </p>
            <button
              onClick={verifyPayment}
              disabled={!isConnected || !address}
              className="action-button primary"
            >
              Verify Transaction
            </button>
            {testResults.verificationHtml ? (
              <div
                className="result-box"
                dangerouslySetInnerHTML={{ __html: testResults.verificationHtml }}
              />
            ) : testResults.verification ? (
              <div className="result-box">{testResults.verification}</div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          position: relative;
          z-index: 1;
        }

        /* Hero Section */
        .hero-section {
          text-align: center;
          margin-bottom: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .hero-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .hero-powered-label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          font-weight: 600;
        }

        .hero-powered-brand {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
        }

        .hero-title {
          font-size: 42px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
        }

        .hero-subtitle {
          font-size: 18px;
          color: #666;
          margin: 0;
          font-weight: 400;
          text-align: center;
        }

        /* Content Wrapper */
        .content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* Test Section */
        .test-section {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          border: 1px solid #e1e8ed;
          transition: box-shadow 0.2s ease;
        }

        .test-section:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        /* Section Header */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e1e8ed;
        }

        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        /* Status Badges */
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .status-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-badge.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .step-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #1a1a1a;
          color: white;
        }

        /* Info Card */
        .info-card {
          background: #f8f9fa;
          border: 2px solid #e1e8ed;
          border-radius: 10px;
          padding: 24px;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .info-card.success {
          background: rgba(16, 185, 129, 0.03);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .info-card.warning {
          background: rgba(245, 158, 11, 0.03);
          border-color: rgba(245, 158, 11, 0.3);
        }

        .info-card.error {
          background: rgba(239, 68, 68, 0.03);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .info-grid {
          display: grid;
          grid-template-columns: minmax(260px, 0.35fr) minmax(150px, 0.3fr) minmax(320px, 0.35fr);
          column-gap: clamp(32px, 4vw, 72px);
          row-gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          width: 100%;
        }

        .info-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-row-horizontal {
          display: flex;
          flex-direction: row;
          gap: 32px;
          align-items: flex-start;
        }

        .info-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .info-row-type {
          align-items: center;
          justify-self: center;
          text-align: center;
        }

        .info-row-type .info-value {
          font-size: 14px;
        }

        .info-row-identifier {
          min-width: 320px;
        }

        .info-row-identifier .info-value {
          white-space: nowrap;
        }

        .info-row.status-row {
          margin-top: 8px;
        }

        .info-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #666;
        }

        .info-value {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          word-break: break-word;
        }

        .info-value.mono-text {
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 13px;
          font-weight: 500;
          color: #0052FF;
        }

        .info-value.mono-text.small {
          font-size: 12px;
        }

        .wallet-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wallet-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
        }

        /* Action Card */
        .action-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .description {
          font-size: 14px;
          line-height: 1.6;
          color: #666;
          margin: 0;
        }

        /* Form Elements */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .select-input {
          width: 100%;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #1a1a1a;
          background: white;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 48px;
        }

        .select-input:hover {
          border-color: #1a1a1a;
        }

        .select-input:focus {
          outline: none;
          border-color: #0052FF;
          box-shadow: 0 0 0 3px rgba(0, 82, 255, 0.1);
        }

        /* Action Buttons */
        .action-button {
          width: 100%;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-button.primary {
          background: #1a1a1a;
          color: white;
        }

        .action-button.primary:hover:not(:disabled) {
          background: #2a2a2a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26, 26, 26, 0.3);
        }

        .action-button.accent {
          background: #0052FF;
          color: white;
        }

        .action-button.accent:hover:not(:disabled) {
          background: #0041CC;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 82, 255, 0.4);
        }

        .action-button:disabled {
          background: #e1e8ed;
          color: #999;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .action-button:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Result Box */
        .result-box {
          margin-top: 8px;
          padding: 20px;
          background: #f8f9fa;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #1a1a1a;
          white-space: pre-wrap;
          overflow-x: auto;
          max-height: 500px;
          overflow-y: auto;
        }

        .result-box :global(a) {
          color: #0052FF;
          text-decoration: none;
          font-weight: 600;
        }

        .result-box :global(a:hover) {
          text-decoration: underline;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .container {
            padding: 24px 16px 60px;
          }

          .hero-title {
            font-size: 32px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .test-section {
            padding: 24px 20px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .info-row-type,
          .info-row-identifier {
            min-width: 0;
            justify-self: flex-start;
          }

          .info-row-type {
            align-items: flex-start;
            text-align: left;
          }

          .info-row-horizontal {
            flex-direction: column;
            gap: 16px;
          }
        }

        /* Circuit Board Background */
        .circuit-wrapper {
          min-height: 100vh;
          width: 100%;
          position: relative;
          background-color: white;
        }

        .circuit-background {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 0;
          pointer-events: none;
          background-image: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 19px,
              rgba(75, 85, 99, 0.08) 19px,
              rgba(75, 85, 99, 0.08) 20px,
              transparent 20px,
              transparent 39px,
              rgba(75, 85, 99, 0.08) 39px,
              rgba(75, 85, 99, 0.08) 40px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 19px,
              rgba(75, 85, 99, 0.08) 19px,
              rgba(75, 85, 99, 0.08) 20px,
              transparent 20px,
              transparent 39px,
              rgba(75, 85, 99, 0.08) 39px,
              rgba(75, 85, 99, 0.08) 40px
            ),
            radial-gradient(
              circle at 20px 20px,
              rgba(55, 65, 81, 0.12) 2px,
              transparent 2px
            ),
            radial-gradient(
              circle at 40px 40px,
              rgba(55, 65, 81, 0.12) 2px,
              transparent 2px
            );
          background-size:
            40px 40px,
            40px 40px,
            40px 40px,
            40px 40px;
        }
      `}</style>
      </div>
    </div>
  );
};

export default X402Test;
