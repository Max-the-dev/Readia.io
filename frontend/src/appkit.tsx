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



const modal = createAppKit({
  projectId,
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  metadata,
  themeMode: 'light',
  themeVariables: {
    '--apkt-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    '--apkt-accent': '#1a1a1a',                 // Black accent for buttons/interactions
    '--apkt-color-mix': '#1a1a1a',
    '--apkt-color-mix-strength': 0,             // Minimal color mixing - keep it clean B&W
    '--apkt-border-radius-master': '8px',       // Subtle rounded corners (match wallet button)
    '--apkt-border-radius-xl': '8px',
    '--apkt-border-radius-l': '8px',
    '--apkt-border-radius-m': '6px',
    '--apkt-border-radius-s': '4px',
    '--apkt-border-radius-xs': '4px',
    '--apkt-z-index': 1000,
    '--apkt-gray-glass-001': 'rgba(255, 255, 255, 1)',  // Clean white backgrounds
    '--apkt-gray-glass-002': 'rgba(248, 249, 250, 1)',  // Match nav hover (#f8f9fa)
    '--apkt-gray-glass-005': 'rgba(225, 232, 237, 1)',  // Match borders (#e1e8ed)
    '--apkt-gray-glass-010': 'rgba(26, 26, 26, 0.08)',  // Subtle hover states
    '--apkt-gray-glass-015': 'rgba(26, 26, 26, 0.12)',  // Slightly darker hover
    '--apkt-gray-glass-020': 'rgba(26, 26, 26, 0.15)',  // Dividers
  },
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: [],
    history: false,  // Disables "Activity" tab
    send: false,     // Disables "Send" functionality
  },
  enableWalletConnect: true,
  enableInjected: true,
  enableCoinbase: true,
  enableEIP6963: true,
  allowUnsupportedChain: false,
  allWallets: 'SHOW',
});

export { wagmiAdapter, modal };
