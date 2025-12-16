# Migration Guide: Current State → Multi-Product Ecosystem

This guide provides step-by-step instructions for migrating from the current Readia.io architecture to the new multi-product ecosystem architecture.

## Prerequisites

- Node.js 18+ installed
- Git installed and configured
- Access to Vercel account
- Access to DNS provider (for domain configuration)
- Backup of current database and environment variables

## Timeline

**Estimated time:** 4-5 weeks
- Week 1: Infrastructure setup
- Week 2: Hub creation & Publish migration
- Week 3: Code organization & ShillQuest configuration
- Week 4: DNS, Vercel, and deployment
- Week 5: Testing and rollout

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Create New Directory Structure

```bash
cd frontend/src

# Create apps directory
mkdir -p apps/{hub,publish,dao,investor,memestack}/{pages,components,styles}

# Create shared directory
mkdir -p shared/{components,contexts,hooks,utils,styles,types}

# Create config directory
mkdir -p config

# Verify structure
tree -L 3 apps shared config
```

### 1.2 Create Core Utilities

```bash
# Create routing utilities
touch utils/routing.ts
touch shared/types/config.ts
touch config/products.ts

# Copy implementation files
cp utils/routing-implementation.ts utils/routing.ts
```

Edit `utils/routing.ts` and implement the domain detection logic from ARCHITECTURE.md Section 1.2.

### 1.3 Update Environment Variables

Create `.env.local` in frontend directory:

```bash
cd frontend
touch .env.local
```

Add the following to `.env.local`:

```bash
# Copy all existing variables from .env
# Then add new product-specific variables:

# Product Modes
VITE_SHILLQUEST_MODE=landing
VITE_DAO_MODE=landing
VITE_INVESTOR_MODE=landing
VITE_MEMESTACK_MODE=landing

# Product Enabled Flags
VITE_SHILLQUEST_ENABLED_PROD=false
VITE_DAO_ENABLED_PROD=false
VITE_INVESTOR_ENABLED_PROD=false
VITE_MEMESTACK_ENABLED_PROD=false
VITE_PUBLISH_ENABLED_PROD=true
```

Add `.env.local` to `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

### 1.4 Install Dependencies (if needed)

```bash
cd frontend
npm install
```

### 1.5 Create Git Branch

```bash
git checkout -b product/ecosystem-migration
git add .
git commit -m "chore: setup directory structure for multi-product ecosystem"
```

## Phase 2: Create Ecosystem Hub (Week 1-2)

### 2.1 Create Hub App Structure

```bash
cd frontend/src/apps/hub

# Create necessary files
touch HubApp.tsx config.ts
touch pages/{Home,About,Products,Roadmap,Ecosystem}.tsx
```

### 2.2 Implement Hub Configuration

Create `apps/hub/config.ts`:

```typescript
import { ProductConfig } from '../../shared/types/config';

export const hubConfig: ProductConfig = {
  id: 'hub',
  name: 'Readia',
  description: 'Web3 content monetization ecosystem',
  domains: {
    production: ['readia.io', 'www.readia.io'],
    staging: ['hub.staging.readia.io', 'staging.readia.io'],
    development: ['localhost:3000', '127.0.0.1:3000']
  },
  mode: 'app',
  enabled: {
    production: true,
    staging: true,
    development: true
  },
  features: {
    wallet: false,
    authentication: false,
    payments: false
  },
  branding: {
    logo: '/readia-logo.svg',
    primaryColor: '#6366f1',
    favicon: '/favicon.ico'
  },
  routes: {
    home: '/',
    about: '/about',
    products: '/products',
    roadmap: '/roadmap',
    ecosystem: '/ecosystem'
  },
  metadata: {
    title: 'Readia - Web3 Content Monetization Ecosystem',
    description: 'Empowering creators with decentralized content monetization tools',
    keywords: ['web3', 'content', 'monetization', 'blockchain', 'creator economy']
  }
};

export default hubConfig;
```

### 2.3 Create Hub Landing Page

Create `apps/hub/pages/Home.tsx`:

```typescript
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="hub-home">
      <section className="hero">
        <h1>Readia Ecosystem</h1>
        <p>Empowering creators with Web3 monetization tools</p>
        <div className="cta-buttons">
          <Link to="/products" className="btn btn-primary">
            Explore Products
          </Link>
          <Link to="/about" className="btn btn-secondary">
            Learn More
          </Link>
        </div>
      </section>

      <section className="products-grid">
        <h2>Our Products</h2>
        <div className="product-cards">
          <ProductCard
            name="ShillQuest"
            description="Get paid to promote Web3 projects"
            status="Coming Soon"
            link="https://shillquest.readia.io"
          />
          <ProductCard
            name="Publish"
            description="Micropayment article platform"
            status="Live"
            link="https://publish.readia.io"
          />
          <ProductCard
            name="DAO"
            description="Community governance portal"
            status="Coming Soon"
            link="https://dao.readia.io"
          />
        </div>
      </section>
    </div>
  );
}

function ProductCard({ name, description, status, link }: {
  name: string;
  description: string;
  status: string;
  link: string;
}) {
  return (
    <a href={link} className="product-card">
      <h3>{name}</h3>
      <p>{description}</p>
      <span className={`status status-${status.toLowerCase().replace(' ', '-')}`}>
        {status}
      </span>
    </a>
  );
}
```

### 2.4 Create Hub App Component

Create `apps/hub/HubApp.tsx`:

```typescript
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import Roadmap from './pages/Roadmap';
import Ecosystem from './pages/Ecosystem';

export default function HubApp() {
  return (
    <div className="hub-app">
      <header className="hub-header">
        <nav>
          <a href="/" className="logo">Readia</a>
          <div className="nav-links">
            <a href="/products">Products</a>
            <a href="/about">About</a>
            <a href="/roadmap">Roadmap</a>
            <a href="/ecosystem">Ecosystem</a>
          </div>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/ecosystem" element={<Ecosystem />} />
        </Routes>
      </main>

      <footer className="hub-footer">
        <p>&copy; 2025 Readia. All rights reserved.</p>
      </footer>
    </div>
  );
}
```

### 2.5 Migrate About Page

```bash
# Copy existing About page content to hub
cp src/pages/About.tsx src/apps/hub/pages/About.tsx
```

Edit the copied file to fit the hub design.

### 2.6 Test Hub App

```bash
# Temporarily update App.tsx to always render HubApp
# Test that it loads correctly
npm run dev
```

## Phase 3: Migrate Publish App (Week 2-3)

### 3.1 Create Publish Directory Structure

```bash
cd frontend/src/apps/publish

# Create subdirectories
mkdir -p {pages,components,contexts,providers,hooks,utils,styles}
```

### 3.2 Create Publish Configuration

Create `apps/publish/config.ts`:

```typescript
import { ProductConfig } from '../../shared/types/config';

export const publishConfig: ProductConfig = {
  id: 'publish',
  name: 'Readia Publish',
  description: 'Micropayment content platform for writers and readers',
  domains: {
    production: ['publish.readia.io', 'www.publish.readia.io'],
    staging: ['publish.staging.readia.io'],
    development: ['localhost:3002', 'publish.localhost:3000']
  },
  mode: 'app',
  enabled: {
    production: true,
    staging: true,
    development: true
  },
  features: {
    wallet: true,
    authentication: true,
    payments: true,
    articles: true,
    drafts: true
  },
  branding: {
    logo: '/publish-logo.svg',
    primaryColor: '#6366f1',
    favicon: '/publish-favicon.ico'
  },
  apiUrl: import.meta.env.VITE_API_URL,
  metadata: {
    title: 'Readia Publish - Micropayment Content Platform',
    description: 'Write and earn with micropayments. Readers pay per article.',
    keywords: ['writing', 'content', 'micropayments', 'web3', 'articles']
  }
};

export default publishConfig;
```

### 3.3 Move Pages

```bash
cd frontend/src

# Move all pages to publish app
mv pages/* apps/publish/pages/

# Keep the pages directory for backwards compatibility temporarily
rmdir pages
```

### 3.4 Move Components

```bash
# Move publish-specific components
mv components/Header.tsx apps/publish/components/
mv components/Footer.tsx apps/publish/components/
mv components/SessionExpiredModal.tsx apps/publish/components/
mv components/AuthPromptToast.tsx apps/publish/components/

# Identify shared components (Button, Modal, etc.) and move to shared/
mv components/Button.tsx shared/components/
mv components/Modal.tsx shared/components/
```

### 3.5 Move Contexts and Providers

```bash
# Move contexts
mv contexts/WalletContext.tsx apps/publish/contexts/
mv contexts/AuthContext.tsx apps/publish/contexts/

# Move providers
mv providers/MainAppProviders.tsx apps/publish/providers/PublishProviders.tsx
```

### 3.6 Update Imports

This is the most time-consuming step. Update all imports in moved files:

**Before:**
```typescript
import Header from '../../components/Header';
import { useWallet } from '../../contexts/WalletContext';
import Button from '../../components/Button';
```

**After:**
```typescript
import Header from './components/Header';
import { useWallet } from './contexts/WalletContext';
import Button from '../../shared/components/Button';
```

Use find and replace to speed this up:

```bash
# From apps/publish directory
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/components/|@/apps/publish/components/|g'
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/contexts/|@/apps/publish/contexts/|g'
```

### 3.7 Create PublishApp Component

Rename `MainLayout.tsx` to `apps/publish/PublishApp.tsx` and update:

```typescript
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SessionExpiredModal from './components/SessionExpiredModal';
import AuthPromptToast from './components/AuthPromptToast';
import Home from './pages/Home';
// ... import other pages
import { useWalletConnectionManager } from './hooks/useWalletConnectionManager';
import publishConfig from './config';

function PublishApp() {
  useWalletConnectionManager();

  useEffect(() => {
    document.title = publishConfig.metadata?.title || 'Readia Publish';
  }, []);

  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/write" element={<Write />} />
          {/* ... other routes */}
        </Routes>
      </main>
      <Footer />
      <SessionExpiredModal />
      <AuthPromptToast />
    </>
  );
}

export default PublishApp;
```

### 3.8 Test Publish App

```bash
npm run dev
# Access at localhost:3002 (if configured) or temporarily modify App.tsx
```

## Phase 4: Update Root App Router (Week 3)

### 4.1 Update App.tsx

Replace `frontend/src/App.tsx` with domain-based routing:

```typescript
import { BrowserRouter as Router } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import { getCurrentProduct, isProductEnabled } from './utils/routing';

// Lazy load product apps
const HubApp = lazy(() => import('./apps/hub/HubApp'));
const ShillQuestApp = lazy(() => import('./apps/shill-quest/ShillQuestApp'));
const PublishApp = lazy(() => import('./apps/publish/PublishApp'));
const NotFound = lazy(() => import('./shared/components/NotFound'));

function App() {
  const currentProduct = getCurrentProduct();

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

### 4.2 Test Routing Locally

```bash
# Test default (hub)
open http://localhost:3000

# Test with host override (requires /etc/hosts modification)
# Add to /etc/hosts:
# 127.0.0.1 publish.localhost
# 127.0.0.1 shillquest.localhost

open http://publish.localhost:3000
open http://shillquest.localhost:3000
```

## Phase 5: Update ShillQuest Configuration (Week 3)

### 5.1 Update ShillQuest Config

Create/update `apps/shill-quest/config.ts`:

```typescript
import { ProductConfig } from '../../shared/types/config';

export const shillQuestConfig: ProductConfig = {
  id: 'shillquest',
  name: 'ShillQuest',
  description: 'Get paid to promote Web3 projects',
  domains: {
    production: ['shillquest.readia.io', 'www.shillquest.readia.io'],
    staging: ['shillquest.staging.readia.io'],
    development: ['localhost:3001', 'shillquest.localhost:3000']
  },
  mode: import.meta.env.VITE_SHILLQUEST_MODE || 'landing',
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
  }
};

export default shillQuestConfig;
```

### 5.2 Update ShillQuestApp for Mode-Based Rendering

Edit `apps/shill-quest/ShillQuestApp.tsx`:

```typescript
import { Routes, Route } from 'react-router-dom';
import ShillQuestProviders from './providers/ShillQuestProviders';
import LandingPage from './landing/LandingPage';
import MainApp from './components/MainApp'; // Your current app content
import shillQuestConfig from './config';

function ShillQuestApp() {
  const mode = shillQuestConfig.mode;

  if (mode === 'landing') {
    return (
      <ShillQuestProviders>
        <LandingPage />
      </ShillQuestProviders>
    );
  }

  if (mode === 'app') {
    return (
      <ShillQuestProviders>
        <MainApp />
      </ShillQuestProviders>
    );
  }

  // Hybrid mode
  return (
    <ShillQuestProviders>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<MainApp />} />
      </Routes>
    </ShillQuestProviders>
  );
}

export default ShillQuestApp;
```

### 5.3 Create Landing Page

If not already created, create `apps/shill-quest/landing/LandingPage.tsx`:

```typescript
export default function LandingPage() {
  return (
    <div className="shillquest-landing">
      <h1>ShillQuest</h1>
      <p>Get paid to promote Web3 projects</p>
      <p>Coming Soon...</p>

      <form className="waitlist-form">
        <input type="email" placeholder="Enter your email" />
        <button type="submit">Join Waitlist</button>
      </form>
    </div>
  );
}
```

## Phase 6: DNS and Vercel Configuration (Week 4)

### 6.1 Update Vercel Configuration

Create/update `vercel.json` in root:

```json
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
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
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

### 6.2 Configure Vercel Domains

1. Go to Vercel Dashboard → Your Project
2. Settings → Domains
3. Add each domain:
   - `shillquest.readia.io`
   - `publish.readia.io`
   - `dao.readia.io`
   - `investor.readia.io`
   - `memestack.readia.io`

4. For staging, add:
   - `hub.staging.readia.io`
   - `shillquest.staging.readia.io`
   - `publish.staging.readia.io`
   - etc.

### 6.3 Configure DNS Records

In your DNS provider (Cloudflare, GoDaddy, etc.):

```
Type   Name         Target
CNAME  shillquest   cname.vercel-dns.com
CNAME  publish      cname.vercel-dns.com
CNAME  dao          cname.vercel-dns.com
CNAME  investor     cname.vercel-dns.com
CNAME  memestack    cname.vercel-dns.com

# Staging
CNAME  *.staging    cname.vercel-dns.com
```

### 6.4 Configure Environment Variables in Vercel

1. Vercel Dashboard → Settings → Environment Variables
2. Add all variables from `.env.local`
3. Set different values for Production/Staging/Development

## Phase 7: Testing and Deployment (Week 4-5)

### 7.1 Local Testing Checklist

- [ ] Hub loads at `localhost:3000`
- [ ] Publish loads at `publish.localhost:3000` (with /etc/hosts)
- [ ] ShillQuest loads at `shillquest.localhost:3000`
- [ ] All pages render correctly
- [ ] No console errors
- [ ] Wallet connections work
- [ ] API calls succeed
- [ ] Images load correctly

### 7.2 Deploy to Staging

```bash
# Commit all changes
git add .
git commit -m "feat: implement multi-product ecosystem architecture"

# Push to staging branch
git checkout staging
git merge product/ecosystem-migration
git push origin staging
```

### 7.3 Staging Testing Checklist

- [ ] `hub.staging.readia.io` loads
- [ ] `publish.staging.readia.io` loads
- [ ] `shillquest.staging.readia.io` loads
- [ ] Domain routing works correctly
- [ ] All product features function
- [ ] Mobile responsive
- [ ] Performance acceptable (Lighthouse)
- [ ] SEO meta tags correct

### 7.4 Production Deployment

Once staging is verified:

```bash
# Merge to main
git checkout main
git merge staging
git push origin main
```

Monitor deployment:
- Vercel Dashboard → Deployments
- Check build logs for errors
- Verify all domains resolve

### 7.5 Post-Deployment Testing

- [ ] `readia.io` shows hub
- [ ] `publish.readia.io` shows article platform
- [ ] `shillquest.readia.io` shows landing page
- [ ] Old URLs redirect correctly
- [ ] Analytics tracking works
- [ ] Error tracking works (Sentry)
- [ ] All integrations function (wallet, payments)

### 7.6 Monitor for Issues

For 24-48 hours after deployment:
- Monitor error logs
- Check analytics for traffic drops
- Monitor API error rates
- Watch for user reports

## Rollback Procedure

If critical issues occur:

```bash
# Option 1: Revert commit
git revert HEAD
git push origin main

# Option 2: Promote previous deployment in Vercel
# Vercel Dashboard → Deployments → Previous deployment → Promote to Production

# Option 3: DNS rollback
# Temporarily point readia.io back to old infrastructure
```

## Troubleshooting

### Issue: "Product not found" error

**Solution:** Check that product is registered in `config/products.ts` and domain is in `utils/routing.ts`

### Issue: Assets not loading

**Solution:** Check that asset paths are absolute, not relative. Update `vite.config.ts` if needed.

### Issue: Environment variables not loading

**Solution:** Verify variables are set in Vercel dashboard with correct names (VITE_ prefix)

### Issue: Routing not working on subdomain

**Solution:** Clear browser cache, check DNS propagation with `dig shillquest.readia.io`

## Next Steps

After successful migration:
1. Update documentation
2. Announce new domains to users
3. Set up redirects from old URLs (if any)
4. Monitor analytics for unusual patterns
5. Begin work on next product (DAO, Investor, etc.)

## Support

If you encounter issues during migration:
- Check ARCHITECTURE.md for detailed explanations
- Review error logs in Vercel Dashboard
- Check browser console for client-side errors
- Test in staging environment first
