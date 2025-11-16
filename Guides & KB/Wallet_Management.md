# Managing Payout Wallets on Penny.io

Keeping your wallets linked correctly ensures that payouts land where you expect and that your dashboard always reflects the right profile. This guide walks through the dual-wallet flow and what to expect when you add, replace, or remove a secondary payout method.

---

## Quick Principles

1. **One primary wallet per profile** – this is the address you first signed in with. All lifetime stats and author metadata live under this canonical address/UUID.
2. **Optional secondary wallet** – you can link exactly one complementary network wallet (Base + Solana pairing). Use it when you want payouts on both chains.
3. **Wallets never need to “log in” to receive funds** – once stored, payouts route automatically. You only have to connect when you want dashboard access.
4. **Dual Wallet Authentication** - Once linked, you may sign in with either wallet to access the same dashboard. 

---

## Replace or Remove Flow

1. In the dashboard, click the **Manage Wallets** button.  
2. Choose **Remove** or enter a new address and click **Submit**.  
3. A confirmation modal appears:
   > “Make sure you have access to your primary wallet before changing the secondary, otherwise you’ll lose access.”
4. After confirming:
   - `DELETE /authors/:id/payout-methods` removes the old secondary.
   - If you’re replacing it, `POST /authors/:id/payout-methods` immediately stores the new address.
5. The app fetches the fresh author record, updates the primary/secondary badges, and compares the currently connected wallet against the new data.

### What happens next?

- **Still connected via primary** → Nothing changes; you remain signed in with updated UI.
- **Connected via the removed secondary** → We instantly disconnect you and show “Connect wallet.” Reconnect with the primary (or the new secondary) to regain access.

This safeguards your account so an obsolete wallet can’t keep accessing your profile.

---

## Linking a Secondary Wallet

- You must already be authenticated via the dashboard with either:
  - Your primary wallet, or  
  - The existing secondary wallet.
- You **do not** need to sign in with the new wallet you’re adding. Just paste the address and confirm—it will become eligible to receive payouts immediately.
- After linking, you can connect that secondary wallet (Phantom, Backpack, Metamask, etc.) at any time to access the same dashboard, stats, and drafts. We treat primary and secondary equally once they’re on file.

---

## Publishing With Multiple Wallets

- Publish with your first wallet → everything is tied to that profile automatically.  
- Before publishing from another wallet, link it as a secondary so both addresses point to the same author UUID.  
- If you already published with two different wallets by accident, contact support—we’ll merge the profiles for you.  
  - If you hit an “address already linked” error, use the CTA in the modal to reach out to support@penny.io for a manual merge.

---

## Security Notes

- All wallet management calls require an authenticated session from a wallet already on file.  
- Removing/replacing a secondary when you’re connected with that same wallet will sign you out immediately to prevent unauthorized access.  
- We never custody funds or private keys; wallet signatures happen entirely client-side via AppKit/WalletConnect.  
- Once stored, payouts route automatically—no additional logins needed for the receiving wallet.

---

Questions or issues? Reach out via support@penny.io.
