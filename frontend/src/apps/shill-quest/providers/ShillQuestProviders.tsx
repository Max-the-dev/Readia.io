import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiAdapter } from '../../../appkit';
import { ShillWalletProvider } from '../contexts/ShillWalletContext';

interface Props {
  children: ReactNode;
}

function ShillQuestProviders({ children }: Props) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      <ShillWalletProvider>
        {children}
      </ShillWalletProvider>
    </WagmiProvider>
  );
}

export default ShillQuestProviders;
