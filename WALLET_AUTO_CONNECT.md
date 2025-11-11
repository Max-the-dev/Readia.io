# Wallet Auto-Connect Behavior

## Why Phantom Shows Connection Prompts Automatically

When you visit Penny.io after previously connecting your Phantom wallet, you may see a connection prompt appear automatically. This is **expected behavior** and happens because:

1. **Wallet Standard Protocol**: Phantom implements the Wallet Standard, which allows wallets to remember which dApps they've connected to
2. **localStorage Persistence**: Connection state is saved in your browser's localStorage
3. **Auto-Reconnect Attempt**: When you return to the site, Phantom attempts to restore the previous connection
4. **Permission Request**: For security, Phantom asks for your permission to reconnect

## This is NOT a Bug

This behavior is intentional and provides a better user experience:
- ✅ Users don't have to manually connect every time they visit
- ✅ Secure: Wallet still asks permission before reconnecting
- ✅ Standard across all Solana dApps
- ✅ Respects user privacy and security

## How to Disable Auto-Connect (User Side)

If you want Phantom to **stop** automatically prompting to connect:

### Option 1: Disconnect from Wallet Settings (Recommended)
1. Open Phantom wallet extension
2. Go to Settings → Trusted Apps / Connected Sites
3. Find "Penny.io" in the list
4. Click "Disconnect" or "Revoke"
5. Phantom will no longer attempt to auto-connect

### Option 2: Clear Browser Storage
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Delete all entries starting with:
   - `@appkit`
   - `@reown`
   - `wc@2`
   - `wagmi`
   - `wallet-standard:`
4. Refresh the page

### Option 3: Use Incognito/Private Mode
- Incognito mode doesn't persist localStorage
- Wallet will never auto-connect in incognito

## For Developers: Why We Don't Disable Auto-Connect

### Technical Reasons:

1. **No Configuration Option**: Reown AppKit's SolanaAdapter does not expose an `autoConnect: false` parameter
   ```typescript
   export interface AdapterOptions {
     connectionSettings?: Commitment | ConnectionConfig;
     wallets?: BaseWalletAdapter[];
     registerWalletStandard?: boolean;  // Controls detection, not auto-connect
   }
   ```

2. **Wallet Standard Behavior**: The Wallet Standard protocol (implemented by modern wallets) handles auto-reconnect at the wallet level, not the dApp level

3. **User Experience**: Most users expect to stay connected across page reloads. Forcing manual reconnection on every visit creates friction.

### What We've Tried:

- ❌ `storage: null` in WagmiAdapter - Broke functionality, didn't prevent Phantom prompts
- ❌ `autoConnect: false` in SolanaAdapter - This option doesn't exist
- ❌ `registerWalletStandard: false` - Prevents wallet detection entirely (wallet won't appear in list)
- ❌ Clearing localStorage on every page load - Bad UX, users would have to reconnect constantly

### Current Configuration:

```typescript
// frontend/src/appkit.tsx
const solanaAdapter = new SolanaAdapter({
  // Empty config - uses defaults
  // Wallets are auto-detected via Wallet Standard
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
```

## Solution: Enhanced Disconnect

We provide a utility function that clears all connection state when users disconnect via the app. This ensures Phantom won't try to reconnect after an explicit disconnect:

```typescript
// frontend/src/utils/walletConnectionManager.ts
import { disconnectAndClearState } from './utils/walletConnectionManager';

// In your component:
const handleDisconnect = async () => {
  await disconnectAndClearState(disconnect);
  // Now Phantom won't auto-reconnect on next visit
};
```

## References

- [Wallet Standard Specification](https://github.com/wallet-standard/wallet-standard)
- [Solana Wallet Adapter Docs](https://github.com/anza-xyz/wallet-adapter)
- [Reown AppKit Solana Docs](https://docs.reown.com/advanced/providers/solana-adapter)
- [Phantom Wallet Docs](https://docs.phantom.app/)

## Summary

**The auto-connect behavior is working as designed.** If you want to prevent it:
1. **Disconnect from Phantom's settings** (recommended)
2. Clear browser localStorage
3. Use incognito mode

There is no application-level configuration to disable auto-reconnect in Reown AppKit with Solana, as this behavior is controlled by the Wallet Standard protocol and the wallet itself.
