import { useEffect } from 'react';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';

/**
 * Wallet Connection Manager Hook
 *
 * Prevents Phantom and other wallets from showing auto-connect prompts
 * when users have explicitly disconnected.
 *
 * How it works:
 * 1. When user disconnects, we set a flag in localStorage
 * 2. On page load, we check this flag and disconnect if set
 * 3. When user connects, we clear the flag
 *
 * This respects the user's disconnect intent and prevents annoying
 * automatic reconnection prompts from wallets like Phantom.
 */

const DISCONNECT_FLAG_KEY = 'penny_wallet_disconnected';

export function useWalletConnectionManager() {
  const { isConnected, address } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  // On mount: Check if user previously disconnected
  useEffect(() => {
    const wasDisconnected = localStorage.getItem(DISCONNECT_FLAG_KEY) === 'true';

    if (wasDisconnected && isConnected) {
      // User explicitly disconnected before, but wallet is trying to auto-reconnect
      // Disconnect it to respect the user's choice
      console.log('Preventing auto-reconnect - user previously disconnected');
      disconnect();
    }
  }, []); // Only run once on mount

  // When connection state changes
  useEffect(() => {
    if (isConnected && address) {
      // User is connected - clear the disconnect flag
      // This means they explicitly connected via the Connect button
      localStorage.removeItem(DISCONNECT_FLAG_KEY);
    }
  }, [isConnected, address]);

  /**
   * Enhanced disconnect function that sets the flag to prevent auto-reconnect
   */
  const disconnectAndPreventReconnect = async () => {
    // Set flag BEFORE disconnecting to prevent race conditions
    localStorage.setItem(DISCONNECT_FLAG_KEY, 'true');

    // Disconnect the wallet
    await disconnect();

    console.log('Wallet disconnected - auto-reconnect prevented');
  };

  return {
    disconnectAndPreventReconnect,
  };
}
