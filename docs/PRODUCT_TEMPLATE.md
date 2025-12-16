# Product Template

Use this template when creating a new product in the Readia.io ecosystem.

## Quick Start

1. Copy the template files to your new product directory
2. Replace `{PRODUCT_NAME}` with your product name (e.g., "ShillQuest")
3. Replace `{product-id}` with your product ID (lowercase, e.g., "shillquest")
4. Update configuration values
5. Register in product registry

## File Structure

```
apps/{product-id}/
├── {ProductName}App.tsx           # Main app component
├── config.ts                      # Product configuration
├── pages/                         # Product pages
│   └── Home.tsx
├── components/                    # Product components
├── styles/                        # Product styles
└── landing/                       # Optional: pre-launch landing
    └── LandingPage.tsx
```

## Template Files

### config.ts

```typescript
import { ProductConfig } from '../../shared/types/config';

export const {product-id}Config: ProductConfig = {
  id: '{product-id}',
  name: '{PRODUCT_NAME}',
  description: 'Short description of your product',
  domains: {
    production: ['{product-id}.readia.io', 'www.{product-id}.readia.io'],
    staging: ['{product-id}.staging.readia.io'],
    development: ['localhost:300X', '{product-id}.localhost:3000'] // Pick unique port
  },
  mode: import.meta.env.VITE_{PRODUCT_ID}_MODE || 'landing', // 'landing' | 'app' | 'hybrid'
  enabled: {
    production: import.meta.env.VITE_{PRODUCT_ID}_ENABLED_PROD === 'true',
    staging: true,
    development: true
  },
  features: {
    wallet: false,           // Does product require wallet connection?
    authentication: false,   // Does product require authentication?
    payments: false,         // Does product handle payments?
    // Add custom feature flags here
  },
  branding: {
    logo: '/{product-id}-logo.svg',
    primaryColor: '#6366f1',  // Update with your brand color
    secondaryColor: '#8b5cf6',
    favicon: '/{product-id}-favicon.ico'
  },
  routes: {
    home: '/',
    // Add your custom routes here
  },
  metadata: {
    title: '{PRODUCT_NAME} - Description',
    description: 'Longer description for SEO and social sharing',
    keywords: ['keyword1', 'keyword2', 'keyword3'],
    ogImage: '/og-image-{product-id}.png'
  }
};

export default {product-id}Config;
```

### {ProductName}App.tsx

```typescript
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import {product-id}Config from './config';

// Optional: Import providers if needed
// import {ProductName}Providers from './providers/{ProductName}Providers';

// Optional: Import landing page
// import LandingPage from './landing/LandingPage';

function {ProductName}App() {
  useEffect(() => {
    // Set page title
    document.title = {product-id}Config.metadata?.title || '{PRODUCT_NAME}';
  }, []);

  // Optional: Mode-based rendering
  // const mode = {product-id}Config.mode;
  //
  // if (mode === 'landing') {
  //   return <LandingPage />;
  // }

  return (
    <div className="{product-id}-app">
      <header className="{product-id}-header">
        <nav>
          <a href="/" className="logo">{PRODUCT_NAME}</a>
          {/* Add navigation links */}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Add more routes */}
        </Routes>
      </main>

      <footer className="{product-id}-footer">
        <p>&copy; 2025 {PRODUCT_NAME} by Readia. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default {ProductName}App;
```

### pages/Home.tsx

```typescript
export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Welcome to {PRODUCT_NAME}</h1>
        <p>Product tagline or description</p>
        <button className="btn-primary">Get Started</button>
      </section>

      <section className="features">
        <h2>Features</h2>
        {/* Add feature cards */}
      </section>
    </div>
  );
}
```

### landing/LandingPage.tsx (Optional)

```typescript
import { useState } from 'react';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to waitlist API
    console.log('Waitlist signup:', email);
  };

  return (
    <div className="{product-id}-landing">
      <header>
        <h1>{PRODUCT_NAME}</h1>
        <p className="tagline">Coming Soon</p>
      </header>

      <main>
        <section className="hero">
          <h2>Revolutionary [Product Category]</h2>
          <p>Short pitch for your product</p>
        </section>

        <section className="waitlist">
          <h3>Join the Waitlist</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Notify Me</button>
          </form>
        </section>

        <section className="features">
          <h3>What to Expect</h3>
          <div className="feature-grid">
            <div className="feature">
              <h4>Feature 1</h4>
              <p>Description</p>
            </div>
            <div className="feature">
              <h4>Feature 2</h4>
              <p>Description</p>
            </div>
            <div className="feature">
              <h4>Feature 3</h4>
              <p>Description</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>Part of the <a href="https://readia.io">Readia Ecosystem</a></p>
      </footer>
    </div>
  );
}
```

## Environment Variables

Add to `.env.local`:

```bash
# {PRODUCT_NAME} Configuration
VITE_{PRODUCT_ID}_MODE=landing              # 'landing' | 'app' | 'hybrid'
VITE_{PRODUCT_ID}_ENABLED_PROD=false        # Enable in production
VITE_{PRODUCT_ID}_API_URL=http://localhost:3001/api/{product-id}  # If product has API
```

## Registration Steps

### 1. Update Product Registry

Edit `config/products.ts`:

```typescript
import {product-id}Config from '../apps/{product-id}/config';

export const PRODUCTS: Record<string, ProductConfig> = {
  // ... existing products
  {product-id}: {product-id}Config,
};
```

### 2. Update Routing

Edit `utils/routing.ts`:

```typescript
export type ProductDomain =
  | 'hub'
  | 'shillquest'
  | 'publish'
  | '{product-id}'  // Add here
  | /* ... */;

const DOMAIN_MAP: Record<ProductDomain, DomainConfig> = {
  // ... existing products
  {product-id}: {
    production: ['{product-id}.readia.io', 'www.{product-id}.readia.io'],
    staging: ['{product-id}.staging.readia.io'],
    development: ['localhost:300X', '{product-id}.localhost:3000']
  },
};
```

### 3. Update App Router

Edit `App.tsx`:

```typescript
// Import
const {ProductName}App = lazy(() => import('./apps/{product-id}/{ProductName}App'));

// Add case in renderApp()
case '{product-id}':
  return <{ProductName}App />;
```

### 4. Configure DNS

Add CNAME record:

```
Type   Name         Target
CNAME  {product-id} cname.vercel-dns.com
```

### 5. Add Domain to Vercel

1. Vercel Dashboard → Domains
2. Add `{product-id}.readia.io`
3. Add `{product-id}.staging.readia.io`

### 6. Set Environment Variables in Vercel

1. Settings → Environment Variables
2. Add:
   - `VITE_{PRODUCT_ID}_MODE`
   - `VITE_{PRODUCT_ID}_ENABLED_PROD`

## Testing

### Local Testing

```bash
# Run dev server
npm run dev

# Test your product at:
# http://localhost:300X (if using unique port)
# or
# http://{product-id}.localhost:3000 (requires /etc/hosts entry)
```

### /etc/hosts Entry

```bash
# Add to /etc/hosts
127.0.0.1 {product-id}.localhost
```

### Staging Testing

After deploying to staging branch:

```
https://{product-id}.staging.readia.io
```

## Checklist

Before launching your product:

- [ ] Config file created with correct values
- [ ] App component implemented
- [ ] At least one page created (Home)
- [ ] Product registered in `config/products.ts`
- [ ] Routing updated in `utils/routing.ts`
- [ ] App router updated in `App.tsx`
- [ ] Environment variables added locally and to Vercel
- [ ] DNS record added
- [ ] Domain added to Vercel
- [ ] Tested locally
- [ ] Tested on staging
- [ ] Branding assets created (logo, favicon, og-image)
- [ ] Documentation written (README.md)
- [ ] SEO metadata configured
- [ ] Analytics integration added (if needed)
- [ ] Error tracking configured (if needed)

## Common Patterns

### Adding Wallet Integration

```typescript
import { useWallet } from '../../shared/hooks/useWallet';

function Component() {
  const { address, isConnected, connect } = useWallet();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Adding Product-Specific API

```typescript
// utils/api.ts
import {product-id}Config from '../config';

const API_URL = {product-id}Config.apiUrl;

export async function fetchData() {
  const response = await fetch(`${API_URL}/endpoint`);
  return response.json();
}
```

### Using Shared Components

```typescript
import Button from '../../shared/components/Button';
import Modal from '../../shared/components/Modal';
import { useTheme } from '../../shared/contexts/ThemeContext';
```

## Tips

1. **Start with landing mode** - Launch with a waitlist, then switch to app mode when ready
2. **Use hybrid mode for gradual rollout** - Show landing to visitors, app at /app for beta testers
3. **Leverage shared code** - Don't reinvent wallet connection, theming, etc.
4. **Follow naming conventions** - Consistent naming makes maintenance easier
5. **Document as you build** - Future you will thank you

## Need Help?

- Review ARCHITECTURE.md for detailed explanations
- Check existing products (ShillQuest, Publish) for examples
- Ask in team chat or open an issue
