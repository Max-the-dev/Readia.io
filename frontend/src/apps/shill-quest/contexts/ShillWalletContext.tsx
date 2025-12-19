import { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider, useAppKit, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useNetworkIcon } from '../../../hooks/useNetworkAssets';
import { NETWORK_FALLBACK_ICONS } from '../../../constants/networks';

// USDC contract addresses for EVM chains
const USDC_ADDRESSES_EVM = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
} as const;

// USDC token mint addresses for Solana
const USDC_ADDRESSES_SOLANA = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Solana devnet
} as const;

interface ShillWalletContextType {
  address: string | undefined;
  isConnected: boolean;
  walletIcon: string | undefined;
  walletName: string | undefined;
  networkIcon: string | null;
  usdcBalance: string | null;
  connect: () => void;
  disconnect: () => Promise<void>;
}

const ShillWalletContext = createContext<ShillWalletContextType | undefined>(undefined);

export function ShillWalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const { chainId, caipNetworkId, caipNetwork } = useAppKitNetwork();
  const { walletProvider: evmProvider } = useAppKitProvider('eip155');
  const { walletProvider: solanaProvider } = useAppKitProvider('solana');
  const { open } = useAppKit();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const { walletInfo } = useWalletInfo();
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  const networkIcon = useNetworkIcon(
    caipNetwork,
    caipNetworkId ? NETWORK_FALLBACK_ICONS[caipNetworkId] : undefined
  );

  // Fetch USDC balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address) {
        setUsdcBalance(null);
        return;
      }

      try {
        // Check if it's a Solana network
        if (caipNetworkId && caipNetworkId.startsWith('solana:')) {
          const usdcMint = USDC_ADDRESSES_SOLANA[caipNetworkId as keyof typeof USDC_ADDRESSES_SOLANA];

          if (!usdcMint) {
            setUsdcBalance(null);
            return;
          }

          const isMainnet = caipNetworkId.includes('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
          const rpcUrl = isMainnet
            ? import.meta.env.VITE_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
            : import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

          const connection = new Connection(rpcUrl, 'confirmed');
          const owner = new PublicKey(address);
          const mint = new PublicKey(usdcMint);

          const accounts = await connection.getTokenAccountsByOwner(owner, { mint });

          if (!accounts.value.length) {
            setUsdcBalance('0.00');
            return;
          }

          const balance = await connection.getTokenAccountBalance(accounts.value[0].pubkey);
          const uiAmount = balance.value.uiAmountString ?? '0';
          setUsdcBalance(parseFloat(uiAmount).toFixed(2));
        } else {
          // EVM network (Base, Base Sepolia)
          const usdcAddress = USDC_ADDRESSES_EVM[chainId as keyof typeof USDC_ADDRESSES_EVM];
          if (!usdcAddress || !evmProvider) {
            setUsdcBalance('0.00');
            return;
          }

          // ERC20 balanceOf call
          const data = await (evmProvider as any).request({
            method: 'eth_call',
            params: [
              {
                to: usdcAddress,
                data: `0x70a08231000000000000000000000000${address.slice(2)}`,
              },
              'latest',
            ],
          });

          const balance = BigInt(data as string);
          const formatted = (Number(balance) / 1_000_000).toFixed(2);
          setUsdcBalance(formatted);
        }
      } catch (error) {
        console.error('Failed to fetch USDC balance:', error);
        setUsdcBalance('0.00');
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [isConnected, address, chainId, caipNetworkId, evmProvider, solanaProvider]);

  const connect = useCallback(() => {
    open();
  }, [open]);

  const disconnect = useCallback(async () => {
    await appKitDisconnect();
  }, [appKitDisconnect]);

  const value = useMemo(() => ({
    address,
    isConnected,
    walletIcon: walletInfo?.icon,
    walletName: walletInfo?.name,
    networkIcon,
    usdcBalance,
    connect,
    disconnect,
  }), [address, isConnected, walletInfo?.icon, walletInfo?.name, networkIcon, usdcBalance, connect, disconnect]);

  return (
    <ShillWalletContext.Provider value={value}>
      {children}
    </ShillWalletContext.Provider>
  );
}

export function useShillWallet() {
  const context = useContext(ShillWalletContext);
  if (!context) {
    throw new Error('useShillWallet must be used within ShillWalletProvider');
  }
  return context;
}
