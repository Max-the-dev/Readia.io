/**
 * Wallet Connection Manager
 *
 * Manages wallet connection state to prevent unwanted auto-reconnection prompts.
 * When users disconnect their wallet, we ensure all connection state is cleared
 * so Phantom and other wallets won't try to auto-reconnect on next page load.
 */

const WALLET_CONNECTION_KEYS = [
  'wc@2',
  'walletconnect',
  '@appkit',
  '@reown',
  'wagmi.',
  'solana:',
  'wallet-standard:',
  'walletName',
];

/**
 * Clear all wallet connection state from localStorage
 * Call this when user explicitly disconnects to prevent auto-reconnect
 */
export function clearWalletConnectionState(): void {
  const keysToRemove: string[] = [];

  // Find all wallet-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const shouldRemove = WALLET_CONNECTION_KEYS.some(prefix =>
        key.startsWith(prefix) || key.includes(prefix)
      );
      if (shouldRemove) {
        keysToRemove.push(key);
      }
    }
  }

  // Remove all wallet connection keys
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.debug(`Cleared wallet state: ${key}`);
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error);
    }
  });

  console.log(`Cleared ${keysToRemove.length} wallet connection entries`);
}

/**
 * Enhanced disconnect function that clears all connection state
 * Use this instead of the default disconnect() to prevent auto-reconnect prompts
 */
export async function disconnectAndClearState(
  disconnectFn: () => Promise<void>
): Promise<void> {
  // First disconnect the wallet
  await disconnectFn();

  // Then clear localStorage to prevent auto-reconnect
  clearWalletConnectionState();
}
