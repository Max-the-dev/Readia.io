import { useEffect, useRef } from 'react';
import { useAppKitState, useDisconnect } from '@reown/appkit/react';

/**
 * Custom hook to prevent eager wallet connections
 *
 * This hook disconnects any wallets that try to auto-connect on page load
 * without explicit user action. Users must click the "Connect Wallet" button
 * to establish a connection.
 *
 * @param options Configuration options
 * @param options.preventEagerConnect If true, auto-disconnect on mount (default: true)
 */
export function usePreventEagerConnect(options: { preventEagerConnect?: boolean } = {}) {
  const { preventEagerConnect = true } = options;
  const { open } = useAppKitState();
  const { disconnect } = useDisconnect();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasChecked.current || !preventEagerConnect) return;
    hasChecked.current = true;

    // If the modal is not open (user didn't explicitly click connect)
    // but a connection attempt is happening, disconnect it
    if (!open) {
      const checkForEagerConnection = async () => {
        // Small delay to let AppKit initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Disconnect any eager connections that weren't user-initiated
        try {
          await disconnect();
        } catch (error) {
          // Ignore errors - wallet might not be connected
          console.debug('No eager connection to prevent');
        }
      };

      checkForEagerConnection();
    }
  }, [open, disconnect, preventEagerConnect]);
}
