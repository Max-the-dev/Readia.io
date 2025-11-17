import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useBalance } from 'wagmi';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { apiService } from '../services/api';

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | undefined;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, status, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const isConnecting = status === 'connecting';
  const isEvmAddress = Boolean(address && address.startsWith('0x'));
  const { data: balance } = useBalance({
    address: isEvmAddress ? (address as `0x${string}`) : undefined,
    query: { enabled: isEvmAddress },
  });

  // Auto-register author when wallet connects
  useEffect(() => {
    const registerAuthor = async () => {
      if (address && isConnected) {
        try {
          await apiService.getPublicAuthor(address);
        } catch (error) {
          console.error('Failed to register author:', error);
          // Non-critical error - user can still browse
        }
      }
    };

    registerAuthor();
  }, [address, isConnected]);

  const formattedBalance = balance
    ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
    : undefined;

  const value: WalletContextType = {
    address,
    isConnected,
    isConnecting,
    balance: formattedBalance,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
