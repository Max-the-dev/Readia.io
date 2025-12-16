# Readia.io Ecosystem Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│                                                                      │
│  URL: readia.io                                                      │
│  URL: shillquest.readia.io                                          │
│  URL: publish.readia.io                                             │
│  URL: dao.readia.io                                                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          VERCEL CDN                                  │
│                   (Single Vercel Project)                            │
│                                                                      │
│  Domain Routing Layer                                               │
│  ├─ readia.io           → Hub App                                   │
│  ├─ shillquest.readia.io → ShillQuest App                          │
│  ├─ publish.readia.io    → Publish App                             │
│  ├─ dao.readia.io        → DAO App                                  │
│  └─ *.staging.readia.io  → Staging Environment                     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FRONTEND (React + TypeScript + Vite)                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                       App.tsx                               │    │
│  │            (Domain-based Router)                            │    │
│  │                                                             │    │
│  │  getCurrentProduct() → Detects subdomain                    │    │
│  │  isProductEnabled()  → Checks environment config            │    │
│  │  renderApp()         → Loads appropriate product            │    │
│  └──────────────┬─────────────────────────────────────────────┘    │
│                 │                                                    │
│                 ├─────────────────┬─────────────────┬───────────┐   │
│                 ▼                 ▼                 ▼           ▼   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  ┌───┐ │
│  │   Hub App       │  │  ShillQuest App │  │ Publish App │  │...│ │
│  │                 │  │                 │  │             │  └───┘ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────┐ │       │
│  │ │   Pages     │ │  │ │   Pages     │ │  │ │  Pages  │ │       │
│  │ │  - Home     │ │  │ │  - Home     │ │  │ │  - Home │ │       │
│  │ │  - About    │ │  │ │  - Explore  │ │  │ │  - Write│ │       │
│  │ │  - Products │ │  │ │  - Create   │ │  │ │  - Dash │ │       │
│  │ │  - Roadmap  │ │  │ │  - Quest    │ │  │ │  - Arti │ │       │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────┘ │       │
│  │                 │  │                 │  │             │        │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────┐ │       │
│  │ │ Components  │ │  │ │ Components  │ │  │ │Component│ │       │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────┘ │       │
│  │                 │  │                 │  │             │        │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────┐ │       │
│  │ │   Config    │ │  │ │   Config    │ │  │ │ Config  │ │       │
│  │ │ - Branding  │ │  │ │ - Mode      │ │  │ │ - API   │ │       │
│  │ │ - Routes    │ │  │ │ - Features  │ │  │ │ - Feat  │ │       │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────┘ │       │
│  └─────────────────┘  └─────────────────┘  └─────────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Shared Resources                         │   │
│  │                                                             │   │
│  │ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │ │Components│  │ Contexts │  │  Hooks   │  │  Utils   │   │   │
│  │ │ - Button │  │ - Theme  │  │ - Wallet │  │ - Routing│   │   │
│  │ │ - Modal  │  │ - Auth   │  │ - Media  │  │ - Format │   │   │
│  │ └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + TypeScript)                    │
│                         Port 3001                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    API Routes                               │    │
│  │                                                             │    │
│  │  /api/articles/*          (Publish)                         │    │
│  │  /api/quests/*            (ShillQuest)                      │    │
│  │  /api/dao/*               (DAO - future)                    │    │
│  │  /api/verify-payment      (Shared)                          │    │
│  │  /api/upload              (Shared)                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  Middleware                                 │    │
│  │                                                             │    │
│  │  - Rate Limiting                                            │    │
│  │  - CORS                                                     │    │
│  │  - Validation (Zod)                                         │    │
│  │  - Spam Prevention                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                             │
│                                                                      │
│  Tables:                                                             │
│  ├─ authors                                                          │
│  ├─ articles                                                         │
│  ├─ payments                                                         │
│  ├─ quests              (ShillQuest)                                │
│  ├─ dao_proposals       (DAO - future)                              │
│  └─ ...                                                             │
│                                                                      │
│  Storage:                                                            │
│  └─ article-images                                                  │
│                                                                      │
│  pg_cron Jobs:                                                       │
│  ├─ Recalculate popularity scores                                   │
│  └─ Cleanup expired drafts                                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Domain Routing Flow

```
User visits URL
       │
       ▼
┌──────────────────┐
│  Browser loads   │
│   React app      │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  App.tsx                                  │
│  ├─ getCurrentProduct()                   │
│  │  └─ Reads window.location.hostname     │
│  │                                        │
│  ├─ isProductEnabled()                    │
│  │  └─ Checks VITE_*_ENABLED_PROD        │
│  │                                        │
│  └─ renderApp()                           │
│     └─ Switch statement                   │
│        ├─ case 'hub'       → HubApp       │
│        ├─ case 'shillquest' → ShillQuestApp│
│        ├─ case 'publish'   → PublishApp   │
│        └─ default          → NotFound     │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Product App     │
│  renders         │
└──────────────────┘
```

## Product Lifecycle States

```
                  LANDING MODE
                      │
                      │ Product development
                      ▼
                  HYBRID MODE
                  /         \
                 /           \
          Landing (/)    App (/app)
                 \           /
                  \         /
                   ▼       ▼
                   APP MODE
                      │
                      │ Fully launched
                      ▼
                  PRODUCTION
```

## Git Branching Strategy

```
main (production)
 │
 ├─── staging
 │     │
 │     ├─── develop
 │     │     │
 │     │     ├─── product/shillquest
 │     │     │     │
 │     │     │     ├─── feature/shillquest/quest-creation
 │     │     │     └─── feature/shillquest/rewards
 │     │     │
 │     │     ├─── product/publish
 │     │     │     │
 │     │     │     └─── feature/publish/dark-mode
 │     │     │
 │     │     └─── product/dao
 │     │           │
 │     │           └─── feature/dao/voting
 │     │
 │     └─── hotfix/critical-bug
 │
 └─── release/v2.0.0

Merge Flow:
Feature → Product → Develop → Staging → Main
```

## File Structure Tree

```
frontend/src/
├── App.tsx                    # Domain router
├── main.tsx                   # Entry point
│
├── apps/                      # Product applications
│   ├── hub/                   # Ecosystem hub
│   │   ├── HubApp.tsx
│   │   ├── config.ts
│   │   ├── pages/
│   │   ├── components/
│   │   └── styles/
│   │
│   ├── shill-quest/           # ShillQuest
│   │   ├── ShillQuestApp.tsx
│   │   ├── config.ts
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── providers/
│   │   ├── landing/           # Pre-launch landing
│   │   └── styles/
│   │
│   ├── publish/               # Article platform
│   │   ├── PublishApp.tsx
│   │   ├── config.ts
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── styles/
│   │
│   ├── dao/                   # DAO portal
│   ├── investor/              # Investor portal
│   └── memestack/             # Memestack
│
├── shared/                    # Shared resources
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   └── types/
│
├── config/                    # Global config
│   └── products.ts            # Product registry
│
└── utils/                     # Utilities
    └── routing.ts             # Domain routing
```

## Deployment Flow

```
Developer commits to feature branch
       │
       ▼
GitHub Actions (optional CI)
       │
       ▼
Merge to product branch
       │
       ▼
Merge to develop branch
       │
       ▼
Merge to staging branch
       │
       ▼
Vercel deploys to staging
       │
       │ Testing & QA
       ▼
Merge to main branch
       │
       ▼
Vercel deploys to production
       │
       ├─── readia.io
       ├─── shillquest.readia.io
       ├─── publish.readia.io
       └─── ...
```

## Environment Variable Flow

```
Local Development
└── .env.local

        │
        ▼

Vercel Dashboard
├── Development
│   └── VITE_*_MODE=app
├── Preview
│   └── VITE_*_MODE=app
├── Staging
│   └── VITE_*_MODE=app
│       VITE_*_ENABLED_PROD=true
└── Production
    └── VITE_*_MODE=landing
        VITE_*_ENABLED_PROD=false (for unreleased products)

        │
        ▼

Build Time (Vite)
└── import.meta.env.VITE_*

        │
        ▼

Runtime (Browser)
└── Product configuration loaded
```

## Data Flow Example (Article Purchase)

```
User clicks "Purchase"
       │
       ▼
PublishApp (publish.readia.io)
       │
       ▼
Wallet connection (shared hook)
       │
       ▼
x402 payment flow
       │
       ▼
Backend API (/api/articles/:id/purchase)
       │
       ▼
Supabase (payments table)
       │
       ├─ Insert payment record
       └─ Update author earnings
       │
       ▼
Response to frontend
       │
       ▼
Update local state + localStorage
       │
       ▼
Show unlocked article
```

## Adding New Product (Quick Flow)

```
1. Create directory
   apps/new-product/

2. Create config
   apps/new-product/config.ts

3. Register in registry
   config/products.ts

4. Update routing
   utils/routing.ts

5. Update App router
   App.tsx

6. Configure DNS
   new-product.readia.io

7. Add to Vercel
   Domains → Add domain

8. Deploy!
   git push origin staging
```

## Security Layers

```
┌──────────────────────────────────────┐
│  Browser Security                     │
│  - CORS policies                      │
│  - Content Security Policy (CSP)      │
│  - XSS protection (DOMPurify)         │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Vercel Edge Security                 │
│  - DDoS protection                    │
│  - SSL/TLS certificates               │
│  - Security headers                   │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Backend Security                     │
│  - Rate limiting                      │
│  - Input validation (Zod)             │
│  - Spam prevention                    │
│  - Address normalization              │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Database Security                    │
│  - Row Level Security (RLS)           │
│  - Connection pooling                 │
│  - Prepared statements                │
└──────────────────────────────────────┘
```

---

**Legend:**
- `→` Direct connection/flow
- `├─` Branches/options
- `└─` Final/leaf node
- `▼` Sequential flow
- `│` Continuation
