import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { base, baseSepolia, solana, solanaDevnet } from '@reown/appkit/networks';

import type { AppKitNetwork } from '@reown/appkit/networks';

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base, baseSepolia, solana, solanaDevnet];

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
  name: 'Penny.io',
  description: 'Content Monetization Reimagined',
  url: window.location.origin,
  icons: ['https://penny.io/icon.png'],
};

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [base, baseSepolia],
  ssr: false,
});

const solanaAdapter = new SolanaAdapter({
  // No configuration - use defaults without auto-connect
});



createAppKit({
  projectId,
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  metadata,
  themeMode: 'light',
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: [],
  },
  enableWalletConnect: true,
  enableInjected: true,
  enableCoinbase: true,
  enableEIP6963: true,
  allowUnsupportedChain: false,
  allWallets: 'SHOW',
});

export { wagmiAdapter };
