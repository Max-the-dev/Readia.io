# Penny.io Technical Overview

_Version 1.0 – Prepared for GitHub publication and mirrored as an on-chain article._

This document expands on the README by focusing on the implementation details that make Penny.io a wallet-native publishing platform. It is written for engineers, protocol reviewers, and investors who want to understand how the dApp works under the hood, not as marketing collateral.

---

## Table of Contents

1. [System Context](#system-context)  
2. [x402 Protocol Primer](#x402-protocol-primer)  
3. [x402 in Penny.io](#x402-in-pennyio)  
4. [Privacy Model](#privacy-model)  
5. [Security Architecture](#security-architecture)  
6. [Wallet Management](#wallet-management)  
7. [Article Lifecycle & Ranking](#article-lifecycle--ranking)  
8. [Spam & Abuse Controls](#spam--abuse-controls)  
9. [Data Model Reference](#data-model-reference)  
10. [Performance & Benchmarks](#performance--benchmarks)  
11. [Testing Strategy](#testing-strategy)  
12. [Roadmap Hooks](#roadmap-hooks)  
13. [Appendix: Key Endpoints](#appendix-key-endpoints)

---

## System Context

```
Readers (Wallets) ──► React Frontend (AppKit + Wagmi + Phantom) ──► Express API ──► Supabase Postgres
                                              │
                                              └──► x402 Facilitator (public or Coinbase CDP)
```

- **Frontend**: React 18 + TypeScript (Vite), AppKit (WalletConnect) for EVM, Phantom for Solana, TinyMCE editor, DOMPurify sanitization, localStorage caching of payment unlocks.  
- **Backend**: Node.js/Express + TypeScript, Supabase/Postgres (author_wallets, payments, articles, drafts), spam/rate-limiting middleware, Coinbase CDP integration.  
- **Networks**: Base (mainnet + Sepolia) and Solana (mainnet + devnet) with USDC mints configured via environment variables.  
- **Storage**: Supabase Storage CDN for media, signed upload URLs.  
- **Deployment**: HTTPS/SSL enforced at the edge (Cloudflare fronting both frontend and API). WAF + API signing will be enabled before mainnet launch.

---

## x402 Protocol Primer

`x402` resurrects HTTP status 402 (“Payment Required”) as a real protocol: users sign an authorization payload, the server verifies it off-chain, and content unlocks instantly. Settlement (actual token transfer) happens via facilitator (public or Coinbase CDP) without forcing readers to wait for an on-chain confirmation.

Key concepts:

| Term             | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| Requirement      | JSON payload returned when a client hits `/purchase` without `X-PAYMENT`.   |
| Authorization    | EIP-712 signature that encodes amount, payTo, nonce, expiry, etc.           |
| Facilitator      | Endpoint that validates authorization; can optionally settle to USDC.       |
| X-PAYMENT header | Base64 payload that includes the signed authorization + metadata.           |

### Flow Diagram

```
┌──────────┐       ┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Reader  │       │  Frontend   │       │   Backend    │       │ Facilitator │
└────┬─────┘       └──────┬──────┘       └──────┬───────┘       └──────┬──────┘
     │ 1. Click Pay       │                    │                      │
     ├───────────────────>│                    │                      │
     │                    │ 2. POST /purchase  │                      │
     │                    │    (no X-PAYMENT)  │                      │
     │                    ├───────────────────>│                      │
     │                    │                    │ 3. Return 402 req.   │
     │                    │<───────────────────┤                      │
     │ 4. Sign auth       │                    │                      │
     │<───────────────────┤                    │                      │
     │ 5. Send X-PAYMENT  │                    │                      │
     ├───────────────────>│                    │                      │
     │                    │ 6. POST /purchase  │                      │
     │                    │    + header        │                      │
     │                    ├───────────────────>│                      │
     │                    │                    │ 7. Verify, record    │
     │                    │                    │    + optional settle │
     │                    │                    │─────────────────────>│
     │                    │                    │ 8. Grant access      │
     │                    │<───────────────────┤                      │
     │ 9. Content unlock  │                    │                      │
```

---

## x402 in Penny.io

### Requirement Payload

When the frontend requests `/api/articles/:id/purchase`, the backend returns:

```jsonc
{
  "scheme": "exact",
  "network": "base",
  "maxAmountRequired": "10000",   // micro USDC
  "resource": "https://api.penny.io/api/articles/92/purchase?network=base",
  "payTo": "0xAuthorWallet...",
  "asset": "0xUSDC...",
  "extra": {
    "title": "Purchase: Test article 1",
    "serviceName": "Penny.io Article Access",
    "gasLimit": "1000000",
    "pricing": { "currency": "USD Coin", "amount": "0.01" }
  }
}
```

### Verification Pipeline

1. Frontend builds `X-PAYMENT` header via `x402PaymentService` (supports AppKit, Coinbase CDP, Phantom).  
2. Backend endpoint `POST /api/articles/:id/purchase` performs:
   - Header parsing + facilitator verification (`verifyPaymentWithFacilitator` or `verifyWithFacilitator`).  
   - Anti-replay: payments table has unique constraint `(article_id, user_address)`.  
   - Recording: insert into `payments` table (`author_address`, `amount`, `network`, `tx_hash`, `authorization`).  
   - Unlock response with article body.
3. Optional `settlementService` batches author payouts if CDP credentials are configured.

### Client Persistence

- `Article.tsx` caches unlock state in `localStorage` (`payment_{articleId}_{address}`) to avoid re-signing after refresh.  
- Backend exposes `GET /api/payment-status/:articleId/:walletAddress` as a canonical check (used on load and for bots).

---

## Privacy Model

- **Wallet-only identities**: we collect wallet addresses, article IDs, timestamps, and amounts. No emails, phone numbers, or names.  
- **Supabase access**: service role key locked to the backend; row-level policies restrict public reads.  
- **Local storage**: only stores unlock flags and UI preferences. No cookies or tracking pixels.  
- **What we see**:
  - Article metadata, drafts, categories, payments, tips, wallet addresses.  
  - Solana ATA ownership (public on-chain).  
- **What we do NOT see**:
  - Private keys, seed phrases, passwords (wallet auth stays client-side).  
  - Card data, KYC, IP addresses beyond standard HTTP logs (subject to Cloudflare retention).  
  - Content of signatures (only hashed authorizations).

---

## Security Architecture

| Layer             | Controls                                                                                                     |
|-------------------|--------------------------------------------------------------------------------------------------------------|
| Transport         | HTTPS everywhere (Cloudflare + origin certs), HSTS on frontend + API.                                        |
| Edge              | Cloudflare WAF, bot management, geo/IP allowlists for admin endpoints (pre-launch).                          |
| API               | Coinbase facilitator signature verification, rate limiting middleware, spam prevention checks.               |
| Data              | Supabase encryption at rest, row-level policies, daily backups, service-role keys stored in vault.           |
| Content           | TinyMCE output sanitized with DOMPurify (strips script tags, inline JS, suspicious protocols).                |
| Wallets           | AppKit/WalletConnect for EVM, Phantom for Solana. We never custody funds; users sign in their own wallets.   |
| Secrets           | `.env` per service, injected via deployment pipeline; no secrets in Git.                                     |

Additional notes:

- **API signing**: before mainnet, API-to-API calls (e.g., admin scripts) will include HMAC headers to prevent spoofing.  
- **SSL**: Cloudflare certs terminate TLS at the edge; origin servers also serve via Let’s Encrypt to prevent downgrade.  
- **Database encryption**: Supabase uses AES-256 encryption at rest; backups are encrypted via pg_dump + Cloud Storage.  
- **Monitoring**: health endpoints and Supabase logs feed into alerting (Grafana stack in progress).

---

## Wallet Management

### Goals

1. Authors can publish with one wallet per network (Base + Solana).  
2. They can add/remove a complementary payout wallet without losing stats.  
3. Removing the active wallet forces a reconnect so unauthorized wallets can’t stay signed in.

### Implementation

```mermaid
flowchart LR
  A[Author connects wallet] --> B[ensureAuthorRecord()]
  B -->|primary| C[authors table]
  B -->|wallet metadata| D[author_wallets table]
  D --> E[Dashboard state]
  E -->|replace/remove| F[/authors/:id/payout-methods]
  F -->|success| G[reconcile session]
```

- **Normalization**: `normalizeFlexibleAddress` checks EVM checksum first, then Solana base58.  
- **Canonical address**: `resolveCanonicalAuthorAddress` maps any wallet to its author UUID (primary or secondary).  
- **API endpoints**:
  - `POST /authors/:identifier/payout-methods` – add/replace secondary (requires complementary network).  
  - `DELETE /authors/:identifier/payout-methods` – remove secondary.  
  - Both endpoints enforce:
    - New wallet must not already belong to another author.  
    - Only one wallet per network (primary is canonical, secondary must be the other network).
- **Frontend modal**:
  - Reuses `validateSecondaryAddress` (AppKit + PublicKey).  
  - Confirmation overlay warns users they’ll be signed out if they remove the wallet they’re using.  
  - After success, the modal fetches fresh author data and compares `normalizeWalletForComparison(address)` to `primary/secondary`. If mismatch → `disconnect()`.

---

## Article Lifecycle & Ranking

### Editor & Publishing

1. TinyMCE-based composer with autosave drafts (JSONB categories, price input, preview toggle).  
2. Drafts stored via `createOrUpdateRecentDraft` (auto-save updates existing draft if <1h old).  
3. Publishing writes to `articles` table; `author_primary_network` snapshot ensures paywall metadata persists even if wallets change later.

### Paywall Logic

- Frontend shows first 3 paragraphs; paywall overlay hides the rest unless `hasPaid`.  
- `hasPaid` is derived from:
  - `localStorage` flag (`payment_{articleId}_{address}`).  
  - `GET /api/payment-status` (server truth).  
  - Authors bypass automatically if their wallet matches article.authorAddress or canonical author record.  
- After purchase, the backend returns full content; the frontend stores the flag and clears preview overlay.

### Ranking & Discovery

Popularity score (`popularity_score`):

```
score = (purchases * 4) + (views * 1) + (likes * 2) - timeDecay(hours)
```

- Recomputed via `recalculatePopularityScores` (pg_cron).  
- Explore page shows Grid/List toggle, category filters, search, and infinite scroll (Intersection Observer).  
- Likes: `user_likes` table with unique `(article_id, wallet_address)` constraint; `updateArticleLikesCount` syncs counts.

---

## Spam & Abuse Controls

File: `backend/src/spamPrevention.ts`

| Check                     | Description                                                                                   |
|---------------------------|-----------------------------------------------------------------------------------------------|
| Wallet rate limit         | Tracks writes per wallet per hour; rejects bursts (configurable).                            |
| Rapid submission          | Ensures authors can’t publish identical content rapidly; uses hash of title+content.         |
| Duplicate content         | SHA-256 hash stored per article; duplicates rejected unless explicitly allowed.              |
| Solana ATA verification   | Validates author actually controls the ATA receiving USDC (via RPC call and caching).        |
| Payment replay guard      | Payments table unique constraint prevents double-spend unlocking the same article.           |

All checks log to Supabase + console; alerts will be wired into monitoring before production launch.

---

## Data Model Reference

### `authors`

```sql
CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  author_uuid UUID UNIQUE NOT NULL,
  address TEXT UNIQUE NOT NULL,
  primary_payout_network TEXT DEFAULT 'base',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_earnings NUMERIC DEFAULT 0,
  total_articles INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0
);
```

### `author_wallets`

```sql
CREATE TABLE author_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_uuid UUID REFERENCES authors(author_uuid) ON DELETE CASCADE,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(address),
  UNIQUE(author_uuid, network)
);
```

### `articles`

```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  author_address TEXT NOT NULL,
  author_primary_network TEXT,
  author_secondary_network TEXT,
  author_secondary_address TEXT,
  title TEXT,
  content TEXT,
  preview TEXT,
  price NUMERIC,
  categories JSONB DEFAULT '[]',
  publish_date TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  earnings NUMERIC DEFAULT 0,
  popularity_score NUMERIC DEFAULT 0
);
```

### `payments`

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id),
  author_address TEXT NOT NULL,
  user_address TEXT NOT NULL,
  network TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  authorization JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(article_id, user_address)
);
```

---

## Performance & Benchmarks

| Operation                      | Penny.io (x402) | Traditional credit card | On-chain transfer (L2) |
|--------------------------------|-----------------|-------------------------|------------------------|
| Authorization to unlock        | **3–5 seconds** (single wallet popup) | 15–60 seconds (3DS flow) | 15–30 seconds          |
| Settlement availability to author | Immediate (if using facilitator) | T+1 to T+3 days          | Immediate once mined   |
| Avg. network fee               | <$0.01 (Base) / <0.001 SOL | $0.30 + % fee            | ~$0.05 (L2 gas)        |

Even in devnet testing we observed end-to-end purchase completion in under 5 seconds from “Unlock article” click to confirming the success message, thanks to facilitator verification and local caching.

---

## Testing Strategy

1. **Devnet x402 harness**: `/x402-test` page exercises requirement fetch, signature generation, header validation, and article unlock for both Base Sepolia + Solana devnet.  
2. **Manual wallet QA**:
   - MetaMask + AppKit for EVM.  
   - Phantom for Solana (multiple accounts, connect/disconnect, secondary wallet removal).  
3. **Backend integration tests (in-progress)**:
   - Scripts for Solana ATA verification (`scripts/checkSolanaUsdcDevnet.ts`).  
   - `backfillAuthorWallets.ts` double-checks canonical author records.  
4. **Pre-launch plan**:
   - Deploy staging environment with Cloudflare WAF + SSL to validate rate limiting and spam controls.  
   - Simulate concurrent purchases to measure facilitator latency.  
   - Run Supabase load tests for analytics queries.

---

## Roadmap Hooks

- **AI Agent APIs**: x402-protected endpoints so agents can fetch + pay for content programmatically.  
- **Author merge tooling**: Admin CLI to merge two author UUIDs when writers publish from multiple wallets before linking.  
- **Dark mode + theming**: Doesn’t impact architecture but requires CSS variables and updated design tokens.  
- **Advanced analytics**: Cohort analysis, per-category performance, tipping trends.  
- **Observability**: Grafana dashboards, error budgets, facilitator health monitoring.

---

## Appendix: Key Endpoints

| Endpoint                                         | Description                                   |
|--------------------------------------------------|-----------------------------------------------|
| `GET /api/articles`                              | List/filter articles.                          |
| `POST /api/articles`                             | Publish new article (requires wallet auth).    |
| `POST /api/articles/:id/purchase`                | x402 purchase flow.                            |
| `GET /api/payment-status/:articleId/:wallet`     | Check if a wallet already unlocked an article. |
| `GET /api/authors/:identifier`                   | Fetch author profile by wallet or UUID.        |
| `POST /authors/:identifier/payout-methods`       | Add/replace secondary wallet.                  |
| `DELETE /authors/:identifier/payout-methods`     | Remove secondary wallet.                       |
| `POST /api/tips`                                 | Send a tip/donation (Base or Solana).          |
| `GET /api/x402/requirements` (test harness)      | Debug endpoint for x402 flows.                 |

For a full API reference, see `backend/src/routes.ts` or the inline JSDoc comments in `frontend/src/services/api.ts`.

---

_Questions or contributions? Open an issue or PR. For security disclosures, email security@penny.io._
