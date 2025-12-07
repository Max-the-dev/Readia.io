import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiAdapter } from '../appkit';
import { WalletProvider } from '../contexts/WalletContext';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthToastProvider } from '../contexts/AuthToastContext';

interface Props {
  children: ReactNode;
}

function MainAppProviders({ children }: Props) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      <WalletProvider>
        <AuthProvider>
          <AuthToastProvider>{children}</AuthToastProvider>
        </AuthProvider>
      </WalletProvider>
    </WagmiProvider>
  );
}

export default MainAppProviders;
