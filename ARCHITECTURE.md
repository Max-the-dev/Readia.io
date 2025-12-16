# Readia.io Ecosystem Architecture

**Version:** 1.0
**Date:** 2025-12-16
**Status:** Design Phase

## Executive Summary

This document outlines a scalable multi-product ecosystem architecture for Readia.io, designed to support 5-10+ Web3 products within a single monorepo while maintaining clean separation, independent product lifecycles, and efficient code sharing.

**Key Principles:**
- Single monorepo, single Vercel project deployment
- Domain-based routing for product isolation
- Support for pre-launch landing pages and full app modes
- Consistent patterns for rapid product addition
- Shared infrastructure with product autonomy

---

## 1. Domain Routing Architecture

### 1.1 Domain Structure

```
readia.io                          → Ecosystem hub (landing page)
├── /about                         → Token info, team, vision
├── /products                      → Product directory
├── /roadmap                       → Ecosystem roadmap
├── /ecosystem                     → Ecosystem overview
└── /docs                          → Developer docs

shillquest.readia.io              → ShillQuest product
publish.readia.io                 → Article platform (current readia.io)
dao.readia.io                     → DAO governance portal (future)
investor.readia.io                → Investor portal (future)
memestack.readia.io               → Memestack product (future)

*.staging.readia.io               → Staging environments
```

### 1.2 Hostname Detection & Routing Pattern

**Implementation Strategy:**

```typescript
// frontend/src/utils/routing.ts

export type ProductDomain =
  | 'hub'           // readia.io
  | 'shillquest'    // shillquest.readia.io
  | 'publish'       // publish.readia.io
  | 'dao'           // dao.readia.io
  | 'investor'      // investor.readia.io
  | 'memestack';    // memestack.readia.io

export interface DomainConfig {
  production: string[];
  staging: string[];
  development: string[];
}

const DOMAIN_MAP: Record<ProductDomain, DomainConfig> = {
  hub: {
    production: ['readia.io', 'www.readia.io'],
    staging: ['hub.staging.readia.io'],
    development: ['localhost:3000', '127.0.0.1:3000']
  },
  shillquest: {
    production: ['shillquest.readia.io', 'www.shillquest.readia.io'],
    staging: ['shillquest.staging.readia.io'],
    development: ['localhost:3001', 'shillquest.localhost:3000']
  },
  publish: {
    production: ['publish.readia.io', 'www.publish.readia.io'],
    staging: ['publish.staging.readia.io'],
    development: ['localhost:3002', 'publish.localhost:3000']
  },
  // Future products follow same pattern
  dao: {
    production: ['dao.readia.io'],
    staging: ['dao.staging.readia.io'],
    development: ['localhost:3003', 'dao.localhost:3000']
  },
  investor: {
    production: ['investor.readia.io'],
    staging: ['investor.staging.readia.io'],
    development: ['localhost:3004', 'investor.localhost:3000']
  },
  memestack: {
    production: ['memestack.readia.io'],
    staging: ['memestack.staging.readia.io'],
    development: ['localhost:3005', 'memestack.localhost:3000']
  }
};

export function getCurrentProduct(): ProductDomain {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const fullHost = port ? `${hostname}:${port}` : hostname;

  // Check each product's domain config
  for (const [product, config] of Object.entries(DOMAIN_MAP)) {
    const allDomains = [
      ...config.production,
      ...config.staging,
      ...config.development
    ];

    if (allDomains.includes(fullHost)) {
      return product as ProductDomain;
    }
  }

  // Default to hub for unknown domains
  return 'hub';
}

export function getEnvironment(): 'production' | 'staging' | 'development' {
  const hostname = window.location.hostname;

  if (hostname.includes('staging')) return 'staging';
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  }
  return 'production';
}

export function isProductEnabled(product: ProductDomain): boolean {
  const config = getProductConfig(product);
  const env = getEnvironment();

  // Check if product is enabled for current environment
  return config.enabled[env];
}
```

### 1.3 Root App Router

```typescript
// frontend/src/App.tsx

import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import { getCurrentProduct, isProductEnabled } from './utils/routing';

// Product apps (lazy loaded)
import { lazy, Suspense } from 'react';

const HubApp = lazy(() => import('./apps/hub/HubApp'));
const ShillQuestApp = lazy(() => import('./apps/shill-quest/ShillQuestApp'));
const PublishApp = lazy(() => import('./apps/publish/PublishApp'));
const DaoApp = lazy(() => import('./apps/dao/DaoApp'));
const InvestorApp = lazy(() => import('./apps/investor/InvestorApp'));
const MemestackApp = lazy(() => import('./apps/memestack/MemestackApp'));
const NotFound = lazy(() => import('./components/NotFound'));

function App() {
  const currentProduct = getCurrentProduct();

  // Select the appropriate app based on domain
  const renderApp = () => {
    if (!isProductEnabled(currentProduct)) {
      return <NotFound message="This product is not yet available." />;
    }

    switch (currentProduct) {
      case 'hub':
        return <HubApp />;
      case 'shillquest':
        return <ShillQuestApp />;
      case 'publish':
        return <PublishApp />;
      case 'dao':
        return <DaoApp />;
      case 'investor':
        return <InvestorApp />;
      case 'memestack':
        return <MemestackApp />;
      default:
        return <NotFound />;
    }
  };

  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Suspense fallback={<div className="app-loader">Loading...</div>}>
          {renderApp()}
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
```

---

## 2. File Structure Convention

### 2.1 Directory Organization

```
frontend/src/
├── App.tsx                           # Root app with domain router
├── main.tsx                          # Entry point
├── apps/                             # All product applications
│   ├── hub/                          # Ecosystem hub (readia.io)
│   │   ├── HubApp.tsx                # Hub root component
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Landing page
│   │   │   ├── About.tsx             # Token info
│   │   │   ├── Products.tsx          # Product directory
│   │   │   ├── Roadmap.tsx           # Roadmap page
│   │   │   └── Ecosystem.tsx         # Ecosystem overview
│   │   ├── components/               # Hub-specific components
│   │   ├── styles/                   # Hub-specific styles
│   │   └── config.ts                 # Hub configuration
│   │
│   ├── shill-quest/                  # ShillQuest product
│   │   ├── ShillQuestApp.tsx         # App root
│   │   ├── pages/                    # ShillQuest pages
│   │   ├── components/               # ShillQuest components
│   │   ├── contexts/                 # ShillQuest contexts
│   │   ├── providers/                # ShillQuest providers
│   │   ├── styles/                   # ShillQuest styles
│   │   ├── config.ts                 # Product configuration
│   │   └── landing/                  # Optional: pre-launch landing
│   │       ├── LandingPage.tsx
│   │       └── components/
│   │
│   ├── publish/                      # Article platform (current readia.io)
│   │   ├── PublishApp.tsx            # App root
│   │   ├── pages/                    # Article pages (Home, Write, etc.)
│   │   ├── components/               # Publish components (Header, Footer)
│   │   ├── contexts/                 # Wallet, Auth contexts
│   │   ├── providers/                # Publish providers
│   │   ├── hooks/                    # Custom hooks
│   │   ├── utils/                    # Sanitize, validation
│   │   └── config.ts                 # Publish configuration
│   │
│   ├── dao/                          # DAO portal (future)
│   │   ├── DaoApp.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── landing/                  # Pre-launch landing
│   │   └── config.ts
│   │
│   ├── investor/                     # Investor portal (future)
│   │   ├── InvestorApp.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── landing/
│   │   └── config.ts
│   │
│   └── memestack/                    # Memestack (future)
│       ├── MemestackApp.tsx
│       ├── pages/
│       ├── components/
│       ├── landing/
│       └── config.ts
│
├── shared/                           # Shared code across products
│   ├── components/                   # Reusable UI components
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Loading/
│   │   └── NotFound/
│   ├── contexts/                     # Shared contexts
│   │   └── ThemeContext.tsx
│   ├── hooks/                        # Shared hooks
│   │   ├── useWallet.ts
│   │   └── useMediaQuery.ts
│   ├── utils/                        # Shared utilities
│   │   ├── routing.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── styles/                       # Shared styles
│   │   ├── global.css
│   │   ├── theme.css
│   │   └── utilities.css
│   └── types/                        # Shared TypeScript types
│       ├── product.ts
│       └── config.ts
│
├── config/                           # Global configuration
│   ├── products.ts                   # Product registry
│   └── environment.ts                # Environment config
│
└── utils/                            # Legacy utils (to be migrated)
```

### 2.2 Product Structure Standards

**Every product MUST follow this structure:**

```
apps/{product-name}/
├── {ProductName}App.tsx              # Required: Root component
├── pages/                            # Required: Page components
├── components/                       # Required: Product components
├── config.ts                         # Required: Product configuration
├── contexts/                         # Optional: Product contexts
├── providers/                        # Optional: Product providers
├── hooks/                            # Optional: Custom hooks
├── styles/                           # Optional: Product styles
├── utils/                            # Optional: Product utilities
├── types/                            # Optional: Product types
└── landing/                          # Optional: Pre-launch landing
    ├── LandingPage.tsx
    └── components/
```

### 2.3 Migration of Existing Code

**Current → New Structure:**

```
Current Location                      → New Location
─────────────────────────────────────────────────────────────────
src/MainLayout.tsx                    → apps/publish/PublishApp.tsx
src/pages/*                           → apps/publish/pages/*
src/components/Header.tsx             → apps/publish/components/Header.tsx
src/components/Footer.tsx             → apps/publish/components/Footer.tsx
src/contexts/WalletContext.tsx        → apps/publish/contexts/WalletContext.tsx
src/providers/MainAppProviders.tsx    → apps/publish/providers/PublishProviders.tsx
src/styles/*                          → apps/publish/styles/* + shared/styles/*
src/apps/shill-quest/*                → apps/shill-quest/* (stays)
```

---

## 3. Product Configuration Pattern

### 3.1 Product Config Schema

```typescript
// shared/types/config.ts

export interface ProductConfig {
  id: string;
  name: string;
  description: string;
  domains: {
    production: string[];
    staging: string[];
    development: string[];
  };
  mode: 'landing' | 'app' | 'hybrid';  // Product lifecycle state
  enabled: {
    production: boolean;
    staging: boolean;
    development: boolean;
  };
  features: {
    wallet: boolean;
    authentication: boolean;
    payments: boolean;
    [key: string]: boolean;
  };
  branding: {
    logo: string;
    primaryColor: string;
    favicon: string;
  };
  routes?: {
    home: string;
    [key: string]: string;
  };
}
```

### 3.2 Product Configuration Files

```typescript
// apps/shill-quest/config.ts

import { ProductConfig } from '@/shared/types/config';

export const shillQuestConfig: ProductConfig = {
  id: 'shillquest',
  name: 'ShillQuest',
  description: 'Get paid to promote Web3 projects',
  domains: {
    production: ['shillquest.readia.io', 'www.shillquest.readia.io'],
    staging: ['shillquest.staging.readia.io'],
    development: ['localhost:3001', 'shillquest.localhost:3000']
  },
  mode: import.meta.env.VITE_SHILLQUEST_MODE || 'landing', // 'landing' or 'app'
  enabled: {
    production: import.meta.env.VITE_SHILLQUEST_ENABLED_PROD === 'true',
    staging: true,
    development: true
  },
  features: {
    wallet: true,
    authentication: true,
    payments: true,
    quests: true,
    badges: true
  },
  branding: {
    logo: '/shillquest-logo.svg',
    primaryColor: '#6366f1',
    favicon: '/shillquest-favicon.ico'
  },
  routes: {
    home: '/',
    explore: '/explore',
    create: '/create',
    quest: '/quest/:id'
  }
};

export default shillQuestConfig;
```

### 3.3 Central Product Registry

```typescript
// config/products.ts

import { ProductConfig } from '@/shared/types/config';
import hubConfig from '@/apps/hub/config';
import shillQuestConfig from '@/apps/shill-quest/config';
import publishConfig from '@/apps/publish/config';
import daoConfig from '@/apps/dao/config';
import investorConfig from '@/apps/investor/config';
import memestackConfig from '@/apps/memestack/config';

export const PRODUCTS: Record<string, ProductConfig> = {
  hub: hubConfig,
  shillquest: shillQuestConfig,
  publish: publishConfig,
  dao: daoConfig,
  investor: investorConfig,
  memestack: memestackConfig
};

export function getProductConfig(productId: string): ProductConfig {
  return PRODUCTS[productId];
}

export function getActiveProducts(environment: 'production' | 'staging' | 'development'): ProductConfig[] {
  return Object.values(PRODUCTS).filter(
    product => product.enabled[environment]
  );
}
```

### 3.4 Environment Variables

```bash
# frontend/.env

# ===== Global =====
VITE_PORT=3000
VITE_API_URL=http://localhost:3001/api
VITE_WALLETCONNECT_PROJECT_ID=95ae59a92c460744cc7b9500a88f6f5a

# ===== Product Modes (landing vs app) =====
VITE_SHILLQUEST_MODE=landing          # 'landing' | 'app' | 'hybrid'
VITE_DAO_MODE=landing
VITE_INVESTOR_MODE=landing
VITE_MEMESTACK_MODE=landing

# ===== Product Enabled Flags =====
VITE_SHILLQUEST_ENABLED_PROD=false    # Control production visibility
VITE_DAO_ENABLED_PROD=false
VITE_INVESTOR_ENABLED_PROD=false
VITE_MEMESTACK_ENABLED_PROD=false

# ===== Publish (Article Platform) =====
VITE_PUBLISH_ENABLED_PROD=true

# ===== ShillQuest Specific =====
VITE_SHILLQUEST_WAITLIST_API=https://api.shillquest.readia.io/waitlist
VITE_SHILLQUEST_BADGE_CONTRACT=0x...

# ===== Shared Blockchain Config =====
VITE_X402_FACILITATOR_URL=https://x402.org/facilitator
VITE_X402_NETWORK=base
VITE_X402_TESTNET_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_X402_MAINNET_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ===== Solana (for future products) =====
VITE_SOLANA_MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
VITE_SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com

# ===== Coinbase CDP =====
VITE_COINBASE_CDP_APP_ID=75c118d2-6946-46d9-b02e-32b0bad435d8
```

### 3.5 Mode-Based Rendering

```typescript
// apps/shill-quest/ShillQuestApp.tsx

import { Routes, Route } from 'react-router-dom';
import ShillQuestProviders from './providers/ShillQuestProviders';
import LandingPage from './landing/LandingPage';
import MainApp from './pages/MainApp';
import shillQuestConfig from './config';

function ShillQuestApp() {
  const mode = shillQuestConfig.mode;

  // Landing mode: show pre-launch landing page
  if (mode === 'landing') {
    return (
      <ShillQuestProviders>
        <LandingPage />
      </ShillQuestProviders>
    );
  }

  // App mode: show full application
  if (mode === 'app') {
    return (
      <ShillQuestProviders>
        <MainApp />
      </ShillQuestProviders>
    );
  }

  // Hybrid mode: show landing at root, app at /app
  if (mode === 'hybrid') {
    return (
      <ShillQuestProviders>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/*" element={<MainApp />} />
        </Routes>
      </ShillQuestProviders>
    );
  }

  return null;
}

export default ShillQuestApp;
```

---

## 4. Git Branch Strategy

### 4.1 Branch Naming Convention

```
main                                  # Production-ready code
├── develop                           # Integration branch
├── staging                           # Staging environment
├── product/{product-name}            # Long-lived product branches
│   ├── product/shillquest
│   ├── product/dao
│   └── product/memestack
└── feature/{product}/{feature-name}  # Short-lived feature branches
    ├── feature/shillquest/quest-creation
    ├── feature/publish/dark-mode
    └── feature/shared/wallet-integration
```

### 4.2 Branch Usage

| Branch Type | Purpose | Lifetime | Example |
|------------|---------|----------|---------|
| `main` | Production deployments | Permanent | `main` |
| `develop` | Development integration | Permanent | `develop` |
| `staging` | Staging environment | Permanent | `staging` |
| `product/{name}` | Product development | Long-lived (weeks/months) | `product/shillquest` |
| `feature/{product}/{name}` | Individual features | Short-lived (days) | `feature/shillquest/quest-rewards` |
| `hotfix/{issue}` | Production fixes | Short-lived (hours) | `hotfix/payment-error` |
| `release/{version}` | Release preparation | Short-lived (days) | `release/v2.0.0` |

### 4.3 Branching Workflow

```bash
# 1. Create product branch from develop
git checkout develop
git pull origin develop
git checkout -b product/shillquest

# 2. Create feature branch from product branch
git checkout product/shillquest
git checkout -b feature/shillquest/quest-creation

# 3. Work on feature
git add .
git commit -m "feat(shillquest): add quest creation flow"

# 4. Push feature branch
git push origin feature/shillquest/quest-creation

# 5. Create PR: feature/shillquest/quest-creation → product/shillquest

# 6. After PR approval, merge to product branch
# Product lead reviews and merges product/shillquest → develop

# 7. Develop → Staging → Main (via PRs)
```

### 4.4 Merge Strategy

```
Feature Branch    →  Product Branch  (Squash merge)
    ↓
Product Branch    →  Develop         (Merge commit, preserve history)
    ↓
Develop           →  Staging         (Merge commit)
    ↓
Staging           →  Main            (Merge commit)
```

### 4.5 Branch Protection Rules

**Main Branch:**
- Require PR reviews (2 approvals)
- Require status checks (CI/CD)
- Require up-to-date branches
- No force pushes
- No deletions

**Develop Branch:**
- Require PR reviews (1 approval)
- Require status checks
- No force pushes

**Product Branches:**
- Require PR reviews (1 approval)
- Require status checks
- Allow force pushes (with lease)

### 4.6 Commit Message Convention

```
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Tests
- chore: Maintenance

Scopes:
- shillquest
- publish
- dao
- investor
- memestack
- hub
- shared
- config
- deploy

Examples:
feat(shillquest): add quest creation page
fix(publish): resolve payment modal issue
docs(hub): update ecosystem roadmap
refactor(shared): extract wallet utilities
chore(deploy): update vercel configuration
```

---

## 5. Deployment Configuration

### 5.1 Vercel Project Setup

**Single Vercel Project:**
- Project Name: `readia-ecosystem`
- Framework: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### 5.2 Domain Configuration in Vercel

**Vercel Dashboard → Domains:**

```
Production Domains:
- readia.io                    → Primary (ecosystem hub)
- www.readia.io                → Redirect to readia.io
- shillquest.readia.io         → Subdomain
- publish.readia.io            → Subdomain
- dao.readia.io                → Subdomain
- investor.readia.io           → Subdomain
- memestack.readia.io          → Subdomain

Staging Domains:
- staging.readia.io            → Staging hub
- hub.staging.readia.io        → Staging hub (alternative)
- shillquest.staging.readia.io → ShillQuest staging
- publish.staging.readia.io    → Publish staging
- dao.staging.readia.io        → DAO staging
- investor.staging.readia.io   → Investor staging
- memestack.staging.readia.io  → Memestack staging
```

### 5.3 DNS Configuration

**DNS Provider (e.g., Cloudflare, GoDaddy):**

```dns
# Apex domain
A     @                       76.76.21.21       # Vercel IP
AAAA  @                       2606:4700:10::...  # Vercel IPv6

# WWW redirect
CNAME www                     cname.vercel-dns.com

# Subdomains (products)
CNAME shillquest              cname.vercel-dns.com
CNAME publish                 cname.vercel-dns.com
CNAME dao                     cname.vercel-dns.com
CNAME investor                cname.vercel-dns.com
CNAME memestack               cname.vercel-dns.com

# Staging subdomains
CNAME staging                 cname.vercel-dns.com
CNAME *.staging               cname.vercel-dns.com
```

### 5.4 Environment Variables in Vercel

**Vercel Dashboard → Settings → Environment Variables:**

| Variable | Production | Staging | Development | Preview |
|----------|-----------|---------|-------------|---------|
| `VITE_API_URL` | `https://api.readia.io` | `https://staging-api.readia.io` | `http://localhost:3001` | `https://staging-api.readia.io` |
| `VITE_SHILLQUEST_MODE` | `landing` | `app` | `app` | `app` |
| `VITE_SHILLQUEST_ENABLED_PROD` | `false` | `true` | `true` | `true` |
| `VITE_DAO_MODE` | `landing` | `landing` | `landing` | `landing` |
| `VITE_DAO_ENABLED_PROD` | `false` | `true` | `true` | `true` |

**Best Practice:**
- Use Vercel's environment variable UI for secrets
- Create `.env.production`, `.env.staging`, `.env.development` locally
- Add `.env.*.local` to `.gitignore`

### 5.5 Vercel Build Configuration

```json
// vercel.json (root)
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "devCommand": "cd frontend && npm run dev",
  "installCommand": "cd frontend && npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/shill",
      "destination": "https://shillquest.readia.io",
      "permanent": false
    },
    {
      "source": "/shill/:path*",
      "destination": "https://shillquest.readia.io/:path*",
      "permanent": false
    }
  ]
}
```

### 5.6 GitHub Integration

**Automatic Deployments:**

| Branch | Environment | URL Pattern |
|--------|-------------|-------------|
| `main` | Production | `readia.io`, `*.readia.io` |
| `staging` | Staging | `staging.readia.io`, `*.staging.readia.io` |
| `develop` | Preview | `develop-readia-ecosystem.vercel.app` |
| `feature/*` | Preview | `feature-{branch}-readia-ecosystem.vercel.app` |

**Vercel GitHub Integration Settings:**
- Deploy on push: ✓ Enabled
- Auto-cancel running builds: ✓ Enabled
- Production branch: `main`
- Ignore build step: Use system defaults
- Root directory: `frontend`

---

## 6. Migration Path

### 6.1 Migration Phases

**Phase 1: Infrastructure Setup** (Week 1)
- Create new directory structure
- Set up routing utilities
- Create product registry
- Configure environment variables

**Phase 2: Create Ecosystem Hub** (Week 1-2)
- Build hub landing page at `apps/hub/`
- Migrate `/about` page to hub
- Create `/products`, `/roadmap` pages
- Set up hub navigation

**Phase 3: Migrate Publish App** (Week 2-3)
- Move `MainLayout.tsx` → `apps/publish/PublishApp.tsx`
- Move article pages to `apps/publish/pages/`
- Move components to `apps/publish/components/`
- Update imports and routing
- Test all publish functionality

**Phase 4: Extract Shared Code** (Week 3)
- Identify truly shared code
- Move to `shared/` directory
- Update imports across products
- Remove duplicate code

**Phase 5: Configure ShillQuest** (Week 3-4)
- Update ShillQuest config for subdomain
- Add landing page mode
- Test routing and wallet integration

**Phase 6: DNS & Vercel Setup** (Week 4)
- Configure DNS records
- Add domains to Vercel
- Set environment variables
- Test all subdomains

**Phase 7: Final Testing & Deployment** (Week 4-5)
- End-to-end testing across all products
- Performance testing
- SEO verification
- Staged rollout (staging → production)

### 6.2 Detailed Migration Steps

#### Step 1: Create New Structure

```bash
# Create new directories
cd frontend/src
mkdir -p apps/{hub,publish,dao,investor,memestack}/{pages,components,styles}
mkdir -p shared/{components,contexts,hooks,utils,styles,types}
mkdir -p config
```

#### Step 2: Create Routing Utilities

```bash
# Create routing utility
touch src/utils/routing.ts
touch src/config/products.ts
```

Copy domain detection code from Section 1.2.

#### Step 3: Create Hub App

```bash
# Create hub app structure
mkdir -p src/apps/hub
touch src/apps/hub/HubApp.tsx
touch src/apps/hub/config.ts
mkdir -p src/apps/hub/pages
```

Build ecosystem landing page with:
- Hero section highlighting Readia ecosystem
- Product cards (ShillQuest, Publish, DAO, etc.)
- Token information
- Links to all products

#### Step 4: Migrate Publish App

```bash
# Move files to publish app
mv src/MainLayout.tsx src/apps/publish/PublishApp.tsx
mv src/pages/* src/apps/publish/pages/
mv src/components/Header.tsx src/apps/publish/components/
mv src/components/Footer.tsx src/apps/publish/components/

# Create publish config
touch src/apps/publish/config.ts
```

Update all imports:

```typescript
// Old imports
import Header from '../../components/Header';
import { useWallet } from '../../contexts/WalletContext';

// New imports
import Header from './components/Header';
import { useWallet } from './contexts/WalletContext';
```

#### Step 5: Update Root App.tsx

Replace content with domain-based routing from Section 1.3.

#### Step 6: Configure Vercel

1. Go to Vercel Dashboard → readia-ecosystem
2. Settings → Domains → Add Domain
3. Add each subdomain:
   - `shillquest.readia.io`
   - `publish.readia.io`
   - `dao.readia.io`
   - `investor.readia.io`
   - `memestack.readia.io`

4. Settings → Environment Variables
5. Add all variables from Section 3.4

#### Step 7: Update DNS

Add CNAME records in DNS provider (Section 5.3).

#### Step 8: Test Locally

```bash
# Test hub
open http://localhost:3000

# Test shillquest (requires port config or host override)
open http://localhost:3001

# Test publish
open http://localhost:3002
```

#### Step 9: Deploy to Staging

```bash
git checkout staging
git merge develop
git push origin staging
```

Verify all subdomains work on staging.

#### Step 10: Deploy to Production

```bash
git checkout main
git merge staging
git push origin main
```

### 6.3 Rollback Plan

**If issues arise post-deployment:**

1. **Immediate Rollback:**
   ```bash
   # Revert main to previous commit
   git revert HEAD
   git push origin main
   ```

2. **DNS Rollback:**
   - Point `readia.io` back to old infrastructure
   - Keep subdomains disabled until fixed

3. **Vercel Rollback:**
   - Vercel Dashboard → Deployments
   - Find previous stable deployment
   - Click "..." → Promote to Production

**Risk Mitigation:**
- Test exhaustively on staging before production
- Deploy during low-traffic hours
- Have team available for monitoring
- Set up error tracking (Sentry)
- Monitor analytics for traffic drops

### 6.4 Testing Checklist

**Before Migration:**
- [ ] All existing functionality works on current site
- [ ] Backup database
- [ ] Document all current environment variables
- [ ] Create rollback plan

**During Migration:**
- [ ] Routing works for all products
- [ ] Environment variables correctly loaded
- [ ] Shared components render properly
- [ ] Product-specific styles isolated
- [ ] Wallet connections work on each product
- [ ] API calls use correct URLs

**After Migration:**
- [ ] All subdomains resolve correctly
- [ ] SEO meta tags correct for each product
- [ ] Analytics tracking works
- [ ] Error tracking works
- [ ] Performance metrics acceptable
- [ ] Mobile responsive on all products

---

## 7. Scalability Considerations

### 7.1 Adding New Products

To add a new product (e.g., `newsletter.readia.io`):

1. **Create product directory:**
   ```bash
   mkdir -p src/apps/newsletter/{pages,components}
   touch src/apps/newsletter/NewsletterApp.tsx
   touch src/apps/newsletter/config.ts
   ```

2. **Configure product:**
   ```typescript
   // apps/newsletter/config.ts
   export const newsletterConfig: ProductConfig = {
     id: 'newsletter',
     name: 'Newsletter',
     domains: { /* ... */ },
     mode: 'landing',
     enabled: { production: false, staging: true, development: true },
     // ...
   };
   ```

3. **Register in product registry:**
   ```typescript
   // config/products.ts
   import newsletterConfig from '@/apps/newsletter/config';

   export const PRODUCTS = {
     // ... existing products
     newsletter: newsletterConfig
   };
   ```

4. **Add to routing:**
   ```typescript
   // utils/routing.ts
   export type ProductDomain =
     | 'hub' | 'shillquest' | 'publish' | 'newsletter' // Add here
     | /* ... */;
   ```

5. **Update App.tsx:**
   ```typescript
   const NewsletterApp = lazy(() => import('./apps/newsletter/NewsletterApp'));

   // Add case in renderApp()
   case 'newsletter':
     return <NewsletterApp />;
   ```

6. **Add DNS record:**
   ```dns
   CNAME newsletter cname.vercel-dns.com
   ```

7. **Add domain to Vercel:**
   - Vercel Dashboard → Domains → Add `newsletter.readia.io`

**Total time:** ~1-2 hours for basic setup

### 7.2 Performance Optimization

**Code Splitting:**
- Each product lazy-loaded
- Shared code split into chunks
- Route-based splitting within products

**Bundle Size Management:**
```json
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-wallet': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
          'shared': ['/src/shared'],
        }
      }
    }
  }
});
```

**CDN Optimization:**
- Vercel Edge Network for static assets
- Image optimization via Vercel
- Lazy load images with placeholders

### 7.3 Monitoring & Analytics

**Error Tracking:**
```typescript
// shared/utils/errorTracking.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
  tags: {
    product: getCurrentProduct()
  }
});
```

**Product-Specific Analytics:**
```typescript
// apps/shillquest/utils/analytics.ts
export function trackQuestCreation(questId: string) {
  analytics.track('quest_created', {
    product: 'shillquest',
    quest_id: questId,
    timestamp: Date.now()
  });
}
```

### 7.4 Security Considerations

**Per-Product Security:**
- Each product can have own CSP headers
- Isolated wallet contexts prevent cross-product leakage
- Shadow DOM for truly isolated components (if needed)

**Shared Security:**
- DOMPurify for XSS prevention (shared)
- Rate limiting at API level (backend)
- Address normalization (shared utility)

---

## 8. Developer Experience

### 8.1 Local Development Setup

**Running Multiple Products Locally:**

Option 1: Use different ports
```bash
# Terminal 1: Backend
cd backend && npm run dev  # Port 3001

# Terminal 2: Hub/Publish (localhost:3000)
cd frontend && npm run dev

# Terminal 3: ShillQuest (manually access different hostname)
# Requires /etc/hosts modification or browser extension
```

Option 2: Use host-based routing
```bash
# Add to /etc/hosts
127.0.0.1 hub.local
127.0.0.1 shillquest.local
127.0.0.1 publish.local

# Then access:
# http://hub.local:3000
# http://shillquest.local:3000
# http://publish.local:3000
```

### 8.2 VS Code Configuration

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "css"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.vercel": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Hub",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug ShillQuest",
      "url": "http://shillquest.local:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

### 8.3 Useful Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "test": "cd frontend && npm run test && cd ../backend && npm run test",
    "lint": "cd frontend && npm run lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "deploy:staging": "git push origin staging",
    "deploy:production": "git push origin main"
  }
}
```

---

## 9. Documentation Standards

### 9.1 Product Documentation

Each product MUST have:

```
apps/{product}/
├── README.md                 # Product overview, setup, features
├── ARCHITECTURE.md           # Product-specific architecture
└── docs/
    ├── API.md                # API endpoints (if any)
    ├── COMPONENTS.md         # Component documentation
    └── DEPLOYMENT.md         # Deployment notes
```

### 9.2 Shared Documentation

```
docs/
├── ARCHITECTURE.md           # This file
├── CONTRIBUTING.md           # Contribution guidelines
├── DEPLOYMENT.md             # Deployment procedures
├── DEVELOPMENT.md            # Development setup
├── SECURITY.md               # Security practices
└── TROUBLESHOOTING.md        # Common issues
```

---

## 10. Appendix

### 10.1 Technology Comparison

**Single Monorepo vs. Multiple Repos:**

| Aspect | Monorepo (Chosen) | Multi-Repo |
|--------|------------------|------------|
| Code sharing | Easy | Complex |
| Dependency management | Centralized | Fragmented |
| CI/CD | Single pipeline | Multiple pipelines |
| Deployment | Single deploy | Multiple deploys |
| Team coordination | Easier | Harder |
| Scalability | Good | Excellent |

**Why single Vercel project?**
- Cost-effective (single plan)
- Simplified CI/CD
- Unified deployment history
- Easy environment variable management
- No need for independent product deploys yet

### 10.2 Alternative Architectures Considered

**Option 1: Nx Monorepo**
- Pros: Advanced tooling, built-in caching
- Cons: Steep learning curve, overkill for current scale
- Decision: Rejected for now, revisit at 10+ products

**Option 2: Turborepo**
- Pros: Fast builds, better than vanilla monorepo
- Cons: Additional complexity, not necessary yet
- Decision: Rejected for now, revisit if build times become issue

**Option 3: Separate Repos + Shared Package**
- Pros: True independence, isolated deployments
- Cons: Overhead, harder code sharing, version management
- Decision: Rejected, premature optimization

### 10.3 Future Considerations

**When to split repos:**
- 10+ active products
- Products need independent release cycles
- Different tech stacks per product
- Large teams (50+ developers)

**When to adopt micro-frontends:**
- Products exceed 100k LOC each
- Need for runtime composition
- Different framework versions required

**When to use Nx/Turborepo:**
- Build times exceed 5 minutes
- Complex inter-product dependencies
- Need for sophisticated caching

### 10.4 Key Decision Log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2025-12-16 | Single monorepo architecture | Simpler, cost-effective, adequate for 5-10 products | Active |
| 2025-12-16 | Domain-based routing | Clean separation, SEO-friendly | Active |
| 2025-12-16 | Product config pattern | Flexible pre-launch/launch modes | Active |
| 2025-12-16 | Git branch strategy | Clear ownership, safe merges | Active |
| 2025-12-16 | Single Vercel project | Cost, simplicity | Active |

---

## Summary

This architecture provides:
1. **Scalability**: Easy to add 5-10+ products
2. **Separation**: Clear boundaries via domains and file structure
3. **Flexibility**: Pre-launch landing pages with environment-based modes
4. **Maintainability**: Consistent patterns and conventions
5. **Performance**: Code splitting and lazy loading
6. **Developer Experience**: Clear documentation and tooling

**Next Steps:**
1. Review this document with team
2. Begin Phase 1 (Infrastructure Setup)
3. Create initial hub landing page
4. Migrate publish app to subdomain
5. Configure DNS and Vercel
6. Deploy to staging for testing

**Timeline:** 4-5 weeks for complete migration

**Questions or feedback?** Discuss in team meeting or open an issue.
