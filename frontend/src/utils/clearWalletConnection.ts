/**
 * Utility to clear wallet connection state from localStorage
 * This prevents automatic reconnection attempts by Phantom and other wallets
 */

export function clearAllWalletConnections() {
  // Clear AppKit/Reown connection state
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('wc@') ||           // WalletConnect state
      key.startsWith('@appkit') ||        // AppKit state
      key.startsWith('@reown') ||         // Reown state
      key.startsWith('WALLETCONNECT') ||  // Legacy WalletConnect
      key.startsWith('wagmi') ||          // Wagmi state
      key.startsWith('solana') ||         // Solana wallet state
      key.includes('phantom') ||          // Phantom wallet state
      key === 'walletName'                // Selected wallet name
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  console.log(`Cleared ${keysToRemove.length} wallet connection entries from localStorage`);
}

export function preventEagerConnection() {
  // Clear any existing wallet connection on app load
  // This ensures wallets only connect when explicitly requested by the user
  clearAllWalletConnections();
}
