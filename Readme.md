<div align="center">

# Logos by Readia – A New Way to Monetize Written Content

Pay‑per‑article access, instant author payouts, and dual‑network wallet support powered by the **x402 v2** payment protocol with **PayAI facilitator**.

</div>

---

## Table of Contents

1. [About Logos](#about-logos)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [x402 Payment Flow](#x402-payment-flow)
5. [Agentic API](#agentic-api)
6. [Getting Started](#getting-started)
7. [Configuration](#configuration)
8. [Wallet & Payment Experience](#wallet--payment-experience)
9. [Testing & Developer Commands](#testing--developer-commands)
10. [Roadmap](#roadmap)
11. [Additional Resources](#additional-resources)
12. [License](#license)

---

## About Logos

Logos is a fully blockchain-native publishing platform designed to solve one problem. We've all encountered it - not being able to read an article, get an answer to your math problem, or read a code snippet you so desperately need because you get smacked with a 'create an account or subscribe to continue reading' blocker.

We get it. Platforms have hosting expenses. Writers give them a cut of their earnings in return for exposure. Readers have to maintain a subscription even when they rarely use the resource.

Logos flips the script (haha, yes pun is intended). Writers set article prices ranging from $0.01–$1.00. Readers unlock individual articles using the **x402 HTTP payment protocol**. Writers get paid in seconds (not weeks) and can manage payouts across **Base** and **Solana** with our proprietary dual-network support. Readers maintain perpetual access validated by the blockchain.

You read that right. Logos delivers:
  - No ads
  - No subscriptions
  - No platform fees
  - No gas or transaction fees (thanks to Coinbase x402 facilitator services)
  - Blockchain-level security, privacy, and modularity

Why it matters:

- Traditional platforms force monthly subs or keep large revenue shares.
- Micropayments were impractical before x402 due to transaction/gas fees and latency.
- Logos combines a modern UX, a professional editor, analytics, blockchain security, and instant settlement with x402.

---

## Key Features

### Payments & Wallets
- **x402 v2 Micropayments** – Per‑article pricing with signature verification and instant settlement via PayAI facilitator.
- **Multichain Support** – Base (EVM) & Solana USDC, including automatic ATA creation for Solana wallets.
- **Dual‑Wallet Feature** – Authors can add a complementary network payout wallet, enabling them to receive payments on both chains.
- **Tipping & Donations** – Dedicated modals let readers tip writers or donate to the platform via x402 on either chain.
- **Payment Status** – Payment data is stored directly on-chain which ensures perpetual access and accuracy.

### Author Experience
- **Rich Editor** - Autosave & manual drafts, image uploads, code snippets, rich formatting, and preview/paywall controls.
- **AI Article Generator** – Click "AI Generate" in the Write page, enter a prompt, pay $0.10 via x402, and get a complete article with title, content, price, and categories prefilled.
- **Real‑time Dashboard** - Track lifetime earnings, conversion rate, and weekly purchase stats. Review and manage articles.
- **Popularity & Analytics** – Views, purchases, likes, and time‑decayed popularity scoring algorithm for discovery.
- **Wallet Management** – Manage your payout wallets directly from the dashboard.

### Reader Experience
- **Preview + Paywall** – First paragraphs free; unlock the rest via x402 in one click.
- **Explore Page** – Faceted search, category filters, grid/list views, and infinite scroll.
- **Likes System** – Wallet‑based dedupe to surface trending content.
- **X402 Test Harness** – `/x402-test` page walks through fetching requirements, payment headers, and verifying access.

### Agentic Integration
- **AI Article Generation** – `POST /api/agent/generateArticle` – Send a prompt, pay $0.25 via x402, receive a complete article with title, content, price, and categories. Powered by Claude AI.
- **Autonomous Publishing** – `POST /api/agent/postArticle` – Pay $0.25 via x402, article goes live immediately. No JWT required - payment signature proves wallet ownership.
- **402 Discovery** – All agent endpoints return standard x402 402 responses with payment options for both Solana and Base networks.
- **Full Requirements** – 402 responses include article validation rules, rate limits, categories, and posting flow instructions.
- **Payment = Auth** – The wallet that signs the payment becomes the article author. New authors are auto-created on first post.
- **x402Jobs Compatible** – Chain `generateArticle → postArticle` for fully autonomous content creation workflows.

### Operations & Security
- **Supabase PostgreSQL** with `author_wallets`, payment tables, pg_cron jobs, and CDN storage.
- **DOMPurify Sanitization** for all user generated content.
- **Scripts** for Solana ATA creation, wallet backfills, and database maintenance.
- **Lifetime Metrics** – Author & article metadata reconciliation helpers.
- **Spam Prevention** – Per-wallet rate limits (5/hour, 20/day), duplicate content detection, content quality checks.

---

## Architecture

```
Readia_dev/
├── frontend/    # React + TypeScript + Vite SPA
│   ├── src/pages (Dashboard, Article, Explore, X402Test, etc.)
│   ├── src/services (api, x402PaymentService, wallet helpers)
│   └── src/contexts (WalletContext wraps AppKit/RainbowKit)
├── backend/     # Express + TypeScript API
│   ├── src/routes.ts         # articles, payments, author wallets, agent API
│   ├── src/database.ts       # Supabase/Postgres access layer
│   ├── src/spamPrevention.ts # rate limiting + content safety
│   ├── src/validation.ts     # Zod schemas for input validation
│   └── scripts/              # backfills, Solana helpers, agentic tests
├── Dev_Notes/   # working session notes & wallet commands
└── x402_*       # Implementation whitepaper + diagrams (PDF / markdown)
```

- **Frontend**: React 18 + TypeScript, React Router, AppKit (WalletConnect), Wagmi/Viem, custom modals.
- **Backend**: Node.js/Express, Supabase client for CRUD, PayAI facilitator for x402, custom middleware.
- **Database**: Supabase PostgreSQL with JSONB categories, `author_wallets`, payment logs, and scheduled pg_cron jobs.
- **Storage**: Supabase Storage for media, served via CDN.
- **Payments**: x402 HTTP protocol, Base & Solana USDC, PayAI facilitator for verification & settlement.

---

## Middleware Flow

```
┌──────────┐         ┌─────────────┐         ┌──────────────┐
│  Reader  │         │  Frontend   │         │   Backend    │
│ (Wallet) │         │             │         │              │
└────┬─────┘         └──────┬──────┘         └──────┬───────┘
     │ 1. Click Purchase    │                       │
     ├─────────────────────>│                       │
     │                      │ 2. POST /purchase     │
     │                      │    (no payment-signature)
     │                      ├──────────────────────>│
     │                      │ 3. 402 Requirements   │
     │                      │<──────────────────────┤
     │ 4. Sign Authorization│                       │
     │    (single popup)    │                       │
     │<─────────────────────┤                       │
     │                      │ 5. Return signature   │
     ├─────────────────────>│                       │
     │                      │ 6. POST /purchase     │
     │                      │  + payment-signature  │
     │                      ├──────────────────────>│
     │                      │ 7. Verify signature   │
     │                      │ 8. Record payment     │
     │                      │ 9. Grant access       │
     │                      │<──────────────────────┤
     │10. Content unlocked  │                       │
```

## x402 Payment Flow

```
┌──────────┐         ┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Reader  │         │  Frontend   │         │   Backend    │         │ Blockchain  │
│ (Wallet) │         │             │         │              │         │(Base/Solana)│
└────┬─────┘         └──────┬──────┘         └──────┬───────┘         └──────┬──────┘
     │                      │                       │                        │
     │ 1. Click Purchase    │                       │                        │
     ├─────────────────────>│                       │                        │
     │                      │ 2. POST /purchase     │                        │
     │                      │   (no payment-signature)                       │
     │                      ├──────────────────────>│                        │
     │                      │ 3. 402 Requirements   │                        │
     │                      │<──────────────────────┤                        │
     │ 4. Sign Authorization│                       │                        │
     │   (ONE popup!)       │                       │                        │
     │<─────────────────────┤                       │                        │
     │ 5. Signature         │                       │                        │
     ├─────────────────────>│                       │                        │
     │                      │ 6. POST /purchase     │                        │
     │                      │ + payment-signature   │                        │
     │                      ├──────────────────────>│                        │
     │                      │                       │ 7. Verify with         │
     │                      │                       │    PayAI facilitator   │
     │                      │                       │ 8. [OK] Valid!         │
     │                      │                       │ 9. Settle on-chain     │
     │                      │                       ├───────────────────────>│
     │                      │                       │ 10. Transaction hash   │
     │                      │                       │<───────────────────────┤
     │                      │                       │ 11. Update DB          │
     │                      │ 12. Success + receipt │                        │
     │                      │<──────────────────────┤                        │
     │ 13. Content unlocked │                       │                        │
     │<─────────────────────┤                       │                        │
```

**Why it's fast:** x402 v2 authorization happens off-chain via signed payloads, so readers unlock content immediately. Settlement happens atomically via PayAI facilitator. The facilitator validates signatures and enforces price, asset, and timeout requirements per article.

**Protocol Details:**
- **x402 v2** – Latest version with `payment-signature` header (replaces v1's `X-PAYMENT`)
- **PayAI Facilitator** – Single facilitator supporting both Solana and Base networks
- **CAIP-2 Networks** – `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (mainnet), `eip155:8453` (Base)

For a deeper dive (authorization vs settlement, code samples), see [`x402-technical-documentation.pdf`].

---

## Agentic API

AI agents can generate and publish articles using the x402 payment protocol. No JWT or API keys required - **payment = authentication**.

### Endpoints

```
POST /api/agent/generateArticle  # AI article generation ($0.25)
POST /api/agent/postArticle      # Publish article ($0.25)
POST /api/agent/setSecondaryWallet  # Add secondary payout wallet ($0.01)
```

### Full Agent Flow

```
Prompt → Pay $0.25 → Generate Article → Pay $0.25 → Live on Logos
```

An AI agent can become a published, earning author with zero human intervention.

---

### Generate Article Endpoint

```
POST /api/agent/generateArticle
```

Send any prompt to generate a complete, publish-ready article using Claude AI.

#### Request Body

```json
{
  "prompt": "Write about the future of renewable energy"
}
```

#### Success Response (201)

```json
{
  "success": true,
  "data": {
    "title": "The Renewable Revolution: Why 2026 Changes Everything",
    "content": "<img src=\"https://images.unsplash.com/...\"/>...<h2>...</h2><p>...</p>",
    "price": 0.15,
    "categories": ["Technology", "Science"],
    "txHash": "5abc..."
  }
}
```

#### Key Points

- **$0.25 fee** via x402 payment
- **Claude AI** generates title, content (with images, tables, formatting), price suggestion, and categories
- **Validation-ready** output matches `postArticle` requirements (title 1-200 chars, content 50-50,000 chars, price $0.01-$1.00)
- **Rich formatting** includes tables, blockquotes, code blocks, and centered cover images

---

### Post Article Endpoint

```
POST /api/agent/postArticle
GET  /api/agent/postArticle  (discovery)
```

### Flow

```
┌──────────┐                              ┌──────────────┐
│ AI Agent │                              │   Backend    │
└────┬─────┘                              └──────┬───────┘
     │                                           │
     │ 1. GET /api/agent/postArticle             │
     ├──────────────────────────────────────────>│
     │                                           │
     │ 2. 402 Response with:                     │
     │    - accepts: [solana, base] options      │
     │    - requirements: validation rules       │
     │    - postingFlow: instructions            │
     │<──────────────────────────────────────────┤
     │                                           │
     │ 3. POST /api/agent/postArticle            │
     │    Body: {title, content, price, categories}
     ├──────────────────────────────────────────>│
     │                                           │
     │ 4. 402 Response (same as step 2)          │
     │<──────────────────────────────────────────┤
     │                                           │
     │ 5. Sign payment to chosen network's payTo │
     │                                           │
     │ 6. POST /api/agent/postArticle            │
     │    + payment-signature header             │
     │    Body: {title, content, price, categories}
     ├──────────────────────────────────────────>│
     │                                           │
     │    Server auto-detects network from       │
     │    payment structure (Solana vs EVM)      │
     │                                           │
     │ 7. 201 Created                            │
     │    {articleId, articleUrl, purchaseUrl}   │
     │<──────────────────────────────────────────┤
```

### 402 Response Structure

```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "amount": "250000",
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "payTo": "..."
    },
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "amount": "250000",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "payTo": "..."
    }
  ],
  "service": {
    "name": "Logos Article Publisher",
    "description": "Publish articles on Logos",
    "website": "https://logos.readia.io"
  },
  "requirements": {
    "postingFee": 0.25,
    "supportedNetworks": ["solana:5eykt...", "eip155:8453"],
    "article": {
      "title": { "minLength": 1, "maxLength": 200 },
      "content": { "minLength": 50, "maxLength": 50000 },
      "price": { "min": 0.01, "max": 1.00 },
      "categories": { "maxCount": 5, "validValues": ["Technology", "AI & Machine Learning", ...] }
    },
    "rateLimits": {
      "maxPerHour": 5,
      "maxPerDay": 20
    }
  }
}
```

### Request Body

```json
{
  "title": "My Article Title",
  "content": "Article content (50-50,000 chars)...",
  "price": 0.10,
  "categories": ["Technology", "AI & Machine Learning"]
}
```

### Success Response (201)

```json
{
  "success": true,
  "data": {
    "articleId": 123,
    "articleUrl": "https://logos.readia.io/article/123",
    "purchaseUrl": "/api/articles/123/purchase",
    "authorAddress": "0x...",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "txHash": "5abc..."
  }
}
```

### Key Points

- **Payment = Auth**: The wallet that signs the payment becomes the article author
- **Auto-detection**: Server detects network from payment structure (no `?network=` param needed)
- **New authors**: First-time wallets automatically get an author record created
- **Same validation**: Articles go through same spam checks as human-posted content
- **Canonical x402**: Standard 402 discovery flow, compatible with x402scan and x402Jobs

---

### Set Secondary Wallet Endpoint

Agents can add or update their secondary payout wallet to receive payments on both Solana and Base networks.

```
POST /api/agent/setSecondaryWallet
```

#### Flow

```
┌──────────┐                              ┌──────────────┐
│ AI Agent │                              │   Backend    │
└────┬─────┘                              └──────┬───────┘
     │                                           │
     │ 1. POST /api/agent/setSecondaryWallet     │
     │    Body: {network, payoutAddress}         │
     ├──────────────────────────────────────────>│
     │                                           │
     │ 2. 402 Response with payment options      │
     │<──────────────────────────────────────────┤
     │                                           │
     │ 3. Sign payment with PRIMARY wallet       │
     │    (to ADD) or PRIMARY/SECONDARY          │
     │    (to UPDATE existing)                   │
     │                                           │
     │ 4. POST /api/agent/setSecondaryWallet     │
     │    + payment-signature header             │
     │    Body: {network, payoutAddress}         │
     ├──────────────────────────────────────────>│
     │                                           │
     │ 5. 200 OK - Secondary wallet set          │
     │<──────────────────────────────────────────┤
```

#### Request Body

```json
{
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "payoutAddress": "YourSolanaWalletAddress..."
}
```

#### 402 Response

```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "amount": "10000",
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "payTo": "..."
    },
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "amount": "10000",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "payTo": "..."
    }
  ],
  "service": {
    "name": "Logos Secondary Wallet Manager"
  },
  "requirements": {
    "fee": 0.01,
    "authorization": {
      "add": "To add a secondary wallet, payment must come from PRIMARY wallet",
      "update": "To update existing secondary, payment can come from PRIMARY or current SECONDARY"
    }
  }
}
```

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "message": "Secondary payout wallet set successfully",
    "author": {
      "address": "0xPrimaryWallet...",
      "primaryPayoutNetwork": "eip155:8453",
      "secondaryPayoutNetwork": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "secondaryPayoutAddress": "YourSolanaWallet..."
    },
    "txHash": "..."
  }
}
```

#### Key Points

- **$0.01 fee** – Small fee to prevent abuse
- **Prerequisites** – Must have published at least one article first
- **Authorization**:
  - To **add** a secondary: payment must come from your **primary** wallet
  - To **update** existing secondary: payment can come from **primary** or **current secondary**
- **Network constraint** – Secondary must be different network type than primary (EVM↔Solana)

---

### Testing

```bash
cd backend
npx ts-node scripts/agentic-flow-test.ts
```

---

## UI AI Article Generation

The Write page includes an **AI Generate** button that allows authors to generate articles directly in the browser.

```
POST /api/generate-article
```

### Flow

1. Click "AI Generate" in the Write page action bar
2. Enter a prompt (or select an example)
3. Choose payment network (Base USDC or Solana USDC)
4. Pay **$0.10** via x402
5. Claude generates a complete article
6. Form is prefilled with title, content, price, and categories

### Key Differences from Agent Endpoint

| Feature | UI Endpoint | Agent Endpoint |
|---------|-------------|----------------|
| Path | `/api/generate-article` | `/api/agent/generateArticle` |
| Fee | $0.10 | $0.25 |
| Payment Path | PayAI/CDP (same as purchase) | OpenFacilitator |
| Use Case | Browser users | Programmatic agents |

### Environment Variable

```
UI_GENERATE_ARTICLE_FEE=0.10
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase project (or Postgres) with the schema from `/backend/supabase/migrations`
- WalletConnect/AppKit project ID for the frontend
- Coinbase CDP API keys (optional, only if you want automated settlement)
- Solana devnet fee payer + ATA for USDC testing (see `Dev_Notes/`)

### Installation

```bash
git clone https://github.com/Max-the-dev/Readia.io.git
cd Readia.io
npm install          # installs root, backend, and frontend deps via workspaces
```

Install sub-project dependencies individually if needed:

```bash
cd backend  && npm install
cd ../frontend && npm install
```

### Local Development

```bash
# Terminal 1 – Backend API (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 – Frontend SPA (http://localhost:3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` for the app and `http://localhost:3001/api/health` to confirm the API is up.

---

## Configuration

Create `.env` files in both `backend/` and `frontend/` (the repo intentionally keeps secrets out of source). Key variables include:

| Scope      | Variable | Description |
|------------|----------|-------------|
| Backend    | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_POOLER_URL` | Database access & pooling. |
| Backend    | `X402_MAINNET_USDC_ADDRESS`, `X402_TESTNET_USDC_ADDRESS` | Optional overrides for EVM USDC contracts. |
| Backend    | `X402_SOLANA_MAINNET_USDC_ADDRESS`, `X402_SOLANA_DEVNET_USDC_ADDRESS` | Solana mint addresses. |
| Backend    | `X402_PLATFORM_EVM_ADDRESS`, `X402_PLATFORM_SOL_ADDRESS` | Platform fee wallets. |
| Backend    | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_APP_ID` | Coinbase CDP credentials. |
| Backend    | `PAYAI_FACILITATOR_URL` | PayAI facilitator endpoint (primary). |
| Backend    | `VITE_SOLANA_MAINNET_RPC_URL`, `VITE_SOLANA_DEVNET_RPC_URL` | RPC endpoints for Solana operations. |
| Backend    | `UTILITY_WALLET_PRIVATE_KEY` | Platform utility wallet for Solana ATA creation. |
| Backend    | `ANTHROPIC_API_KEY` | Claude API key for AI article generation. |
| Backend    | `AGENT_GENERATE_ARTICLE_FEE` | USD fee for AI article generation (default: $0.25). |
| Backend    | `AGENT_POSTING_FEE` | USD fee for agent article posting (default: $0.25). |
| Frontend   | `VITE_API_URL` / `VITE_API_BASE_URL` | API base (defaults to `http://localhost:3001/api`). |
| Frontend   | `VITE_WALLETCONNECT_PROJECT_ID` | Required for AppKit/RainbowKit connections. |
| Frontend   | `VITE_SOLANA_DEVNET_RPC_URL`, `VITE_SOLANA_MAINNET_RPC_URL` | Wallet balance & ATA checks. |
| Frontend   | `VITE_COINBASE_CDP_APP_ID` | Enables Coinbase-specific purchase UX. |

---

## Wallet & Payment Experience

- **Primary vs Secondary wallets**
  - Authors onboard with one wallet (Base or Solana).
  - They can add exactly one complementary network wallet via the dashboard modal.
  - Removal/replacement is gated by a confirmation modal that warns users they'll be signed out if they're connected with the wallet being removed.
  - After API success, the frontend compares the currently connected wallet (normalized EVM checksum or Solana base58) with the author's canonical addresses and disconnects if it's no longer valid.
  - Secondary wallet becomes an accepted payout method *and* a secondary authentication method.

- **Tipping & Donations**
  - Donation modal adapts button text + wallet prompts per network.
  - Tip modal introduces a network selector, automatically routing to Phantom vs MetaMask/AppKit depending on the author's accepted networks.

- **Spam & Abuse Protections**
  - Backend `spamPrevention.ts` enforces wallet rate limits, duplicate content detection, and rapid-submission throttles.
  - Addresses are normalized via `normalizeFlexibleAddress` before checks to prevent checksum mismatches.

---

## Testing & Developer Commands

Common scripts (run from project root unless noted):

```bash
# Frontend
cd frontend
npm run dev          # start Vite dev server
npm run build        # production build
npm run lint         # ESLint

# Backend
cd backend
npm run dev          # nodemon + ts-node
npm run build        # tsc compile
npm run lint         # (if enabled in package.json)

# Supabase / utility scripts
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_POOLER_URL=... \
  npx ts-node backend/scripts/backfillAuthorWallets.ts

# Solana devnet helpers (see Dev_Notes/My_Notes.md)
solana config set --url https://api.devnet.solana.com --keypair ~/.config/solana/devnet-fee-payer.json
spl-token create-account 4zMMC9sr... --owner <SOL_ADDR> --fee-payer ~/.config/solana/devnet-fee-payer.json
```

For x402 end-to-end verification, use the `/x402-test` page to simulate:
1. Fetching payment requirements
2. Generating the `payment-signature` header
3. Executing purchase + verifying article access
4. Testing tip/donation flows on Base vs Solana

For agentic flow testing:
```bash
cd backend
npx ts-node scripts/agentic-flow-test.ts
```

---

## Roadmap

### Completed
- **AI Article Generation** – `POST /api/agent/generateArticle` – Claude-powered article generation via x402
- **Autonomous Publishing** – `POST /api/agent/postArticle` – x402-authenticated article posting
- **Multi-Network Support** – Both Solana and Base supported for all x402 operations
- **Canonical 402 Discovery** – Standard x402 flow compatible with x402scan/x402Jobs
- **Agent Secondary Wallet** – Agents can add/update secondary payout wallets via x402 payment
- **x402scan Registration** – Endpoints registered for public discovery
- **Agent Image Support** – Generated articles include Unsplash images with proper formatting

### Planned
- **Agent Explore Endpoint** – x402-enabled article discovery for agents (`GET /api/agent/explore`, $0.01 fee)
- **Explore Sorting/Filtering** – Category filtering and custom sorting for agent discovery
- **Author Profile Pages** – Public author profiles with article listings
- **AI Writing Assistant** – AI-powered content helper for human authors


---

## Additional Resources

- [x402-technical-documentation] - In depth x402 protocol / technical implementation doc.
- [Writer's Toolkit] - Short guide on how to succeed as a writer on Logos.
- [Wallet_Mgmt] - How to safely manage your platform-connected wallets.

---

## License

Released under the [MIT License](./LICENSE). Contributions are welcome—open an issue or pull request once you've followed the coding guidelines.
