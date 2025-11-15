import { useEffect, useState } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { useAppKit, useWalletInfo } from '@reown/appkit/react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletMinimal } from 'lucide-react';
import { useNetworkIcon } from '../hooks/useNetworkAssets';
import { NETWORK_FALLBACK_ICONS } from '../constants/networks';

// USDC contract addresses for EVM chains
const USDC_ADDRESSES_EVM = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
} as const;

// USDC token mint addresses for Solana
const USDC_ADDRESSES_SOLANA = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Solana devnet (Circle devnet USDC)
} as const;

const AppKitConnectButton = () => {
  const { address, isConnected } = useAppKitAccount();
  const { chainId, caipNetworkId, caipNetwork } = useAppKitNetwork();
  const { walletProvider: evmProvider } = useAppKitProvider('eip155');
  const { walletProvider: solanaProvider } = useAppKitProvider('solana');
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address) {
        setUsdcBalance(null);
        return;
      }

      // console.log('Fetching balance for:', {
      //   address,
      //   chainId,
      //   caipNetworkId,
      //   hasEvmProvider: !!evmProvider,
      //   hasSolanaProvider: !!solanaProvider
      // });

      try {
        // Check if it's a Solana network
        if (caipNetworkId && caipNetworkId.startsWith('solana:')) {
          // console.log('Detected Solana network:', caipNetworkId);
          const usdcMint = USDC_ADDRESSES_SOLANA[caipNetworkId as keyof typeof USDC_ADDRESSES_SOLANA];
          // console.log('USDC Mint address:', usdcMint);

          if (!usdcMint) {
            // console.log('Missing usdcMint for network:', caipNetworkId);
            setUsdcBalance(null);
            return;
          }

          // Use Solana web3.js Connection to fetch balance (same approach as working script)
          const isMainnet = caipNetworkId.includes('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');

          const rpcUrl = isMainnet
            ? 'https://mainnet.helius-rpc.com/?api-key=df097add-2a0e-43c5-a06d-468c8641b459'
            : 'https://api.devnet.solana.com';

          // console.log('Connecting to Solana RPC:', rpcUrl);
          const connection = new Connection(rpcUrl, 'confirmed');

          // console.log('Fetching token accounts for address:', address);
          // console.log('USDC mint:', usdcMint);

          const owner = new PublicKey(address);
          const mint = new PublicKey(usdcMint);

          // Step 1: Get token accounts (same as working script)
          const accounts = await connection.getTokenAccountsByOwner(owner, { mint });

          // console.log('Token accounts found:', accounts.value.length);

          if (!accounts.value.length) {
            // console.log('No token account found, setting balance to 0.00');
            setUsdcBalance('0.00');
            return;
          }

          // Step 2: Get balance from first account (same as working script)
          const balance = await connection.getTokenAccountBalance(accounts.value[0].pubkey);
          const uiAmount = balance.value.uiAmountString ?? '0';

          // console.log('Solana USDC balance:', uiAmount);
          setUsdcBalance(parseFloat(uiAmount).toFixed(2));
        } else {
          // EVM network (Base, Base Sepolia)
          const usdcAddress = USDC_ADDRESSES_EVM[chainId as keyof typeof USDC_ADDRESSES_EVM];
          if (!usdcAddress || !evmProvider) {
            // console.log('Missing USDC address or provider for EVM network');
            setUsdcBalance('0.00');
            return;
          }

          // ERC20 balanceOf call
          const data = await (evmProvider as any).request({
            method: 'eth_call',
            params: [
              {
                to: usdcAddress,
                data: `0x70a08231000000000000000000000000${address.slice(2)}`, // balanceOf(address)
              },
              'latest',
            ],
          });

          // Convert hex to decimal and format (USDC has 6 decimals)
          const balance = BigInt(data as string);
          const formatted = (Number(balance) / 1_000_000).toFixed(2);
          // console.log('EVM USDC balance:', formatted);
          setUsdcBalance(formatted);
        }
      } catch (error) {
        console.error('Failed to fetch USDC balance:', error);
        // On error, default to 0.00 instead of null
        setUsdcBalance('0.00');
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [isConnected, address, chainId, caipNetworkId, evmProvider, solanaProvider]);

  const { open } = useAppKit();
  const { walletInfo } = useWalletInfo();
  const showUsdcBalance = isConnected && usdcBalance !== null;

  // Format address for display (0x1234...5678)
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const connectedNetworkIcon = useNetworkIcon(
    caipNetwork,
    caipNetworkId ? NETWORK_FALLBACK_ICONS[caipNetworkId] : undefined
  );

  const isWalletConnected = isConnected && Boolean(address);

  const buttonClassName = isWalletConnected
    ? 'wallet-connect-button'
    : 'wallet-connect-button wallet-connect-button--disconnected';

  return (
    <button
      onClick={() => open()}
      className={buttonClassName}
      type="button"
    >
      {isWalletConnected ? (
        <>
          <div className="wallet-info">
            {walletInfo?.icon && (
              <img
                src={walletInfo.icon}
                alt={walletInfo.name || 'Wallet'}
                className="wallet-icon"
              />
            )}
            {connectedNetworkIcon && (
              <img
                src={connectedNetworkIcon}
                alt="Network"
                className="network-icon"
              />
            )}
            <span className="wallet-address">{formatAddress(address)}</span>
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
        </>
      ) : (
        <>
          <WalletMinimal
            aria-hidden="true"
            className="wallet-connect-button--disconnected__icon"
            strokeWidth={2.4}
            size={18}
          />
          <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">
            Connect Wallet
          </span>
        </>
      )}
    </button>
  );
};

export default AppKitConnectButton;
