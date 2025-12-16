# Quick Reference - Readia Ecosystem

## Domain Map

| Domain | Product | Status | Port (Local) |
|--------|---------|--------|--------------|
| `readia.io` | Hub | Live | 3000 |
| `shillquest.readia.io` | ShillQuest | Pre-launch | 3001 |
| `publish.readia.io` | Article Platform | Live | 3002 |
| `dao.readia.io` | DAO Portal | Planned | 3003 |
| `investor.readia.io` | Investor Portal | Planned | 3004 |
| `memestack.readia.io` | Memestack | Planned | 3005 |

## Common Commands

```bash
# Development
cd frontend && npm run dev              # Start frontend
cd backend && npm run dev               # Start backend

# Build
cd frontend && npm run build            # Build frontend

# Linting
cd frontend && npm run lint             # Lint code

# Git workflow
git checkout develop                    # Switch to develop
git checkout -b feature/product/name    # Create feature branch
git add . && git commit -m "..."        # Commit changes
git push origin feature/product/name    # Push branch

# Deployment
git push origin staging                 # Deploy to staging
git push origin main                    # Deploy to production
```

## File Locations

```
Config & Setup:
- Product configs:     apps/{product}/config.ts
- Product registry:    config/products.ts
- Domain routing:      utils/routing.ts
- Environment vars:    .env.local
- Vercel config:       vercel.json

Product Structure:
- App root:           apps/{product}/{Product}App.tsx
- Pages:              apps/{product}/pages/
- Components:         apps/{product}/components/
- Styles:             apps/{product}/styles/

Shared Resources:
- Components:         shared/components/
- Contexts:           shared/contexts/
- Hooks:              shared/hooks/
- Utils:              shared/utils/
- Types:              shared/types/
```

## Product Modes

```typescript
// In apps/{product}/config.ts
mode: 'landing'  // Pre-launch landing page only
mode: 'app'      // Full application
mode: 'hybrid'   // Landing at /, app at /app
```

## Environment Variables

```bash
# Product mode
VITE_{PRODUCT}_MODE=landing|app|hybrid

# Product enable/disable
VITE_{PRODUCT}_ENABLED_PROD=true|false

# Shared
VITE_API_URL=...
VITE_WALLETCONNECT_PROJECT_ID=...
```

## Code Snippets

### Import Shared Component
```typescript
import Button from '@/shared/components/Button';
import { useTheme } from '@/shared/contexts/ThemeContext';
```

### Import Product-Local Component
```typescript
import Header from './components/Header';
import { useAuth } from './contexts/AuthContext';
```

### Get Current Product
```typescript
import { getCurrentProduct } from '@/utils/routing';

const product = getCurrentProduct(); // 'hub' | 'shillquest' | ...
```

### Navigate to Another Product
```typescript
import { navigateToProduct } from '@/utils/routing';

navigateToProduct('shillquest', '/quest/123');
// Goes to https://shillquest.readia.io/quest/123
```

### Access Product Config
```typescript
import config from './config';

console.log(config.name);        // Product name
console.log(config.mode);        // 'landing' | 'app' | 'hybrid'
console.log(config.features);    // { wallet: true, ... }
```

## Adding a New Product

1. **Create directory:**
   ```bash
   mkdir -p apps/{product}/{pages,components}
   ```

2. **Copy template files:**
   ```bash
   cp docs/PRODUCT_TEMPLATE.md apps/{product}/
   # Follow template instructions
   ```

3. **Register product:**
   - Add to `config/products.ts`
   - Add to `utils/routing.ts`
   - Add to `App.tsx`

4. **Configure:**
   - Add env vars to `.env.local`
   - Create `config.ts`

5. **Deploy:**
   - Add DNS record
   - Add domain to Vercel
   - Push to staging

## Troubleshooting

### "Product not found"
- Check product is in `config/products.ts`
- Check domain in `utils/routing.ts`
- Check `VITE_{PRODUCT}_ENABLED_PROD`

### Assets not loading
- Use absolute paths: `/logo.svg` not `./logo.svg`
- Check `public/` directory
- Verify Vercel deployment includes assets

### Wrong product loads
- Check `getCurrentProduct()` logic
- Verify domain spelling
- Clear browser cache

### Environment variables not working
- Prefix with `VITE_`
- Restart dev server after changes
- Check Vercel dashboard for production

### Routing not working
- Check `vercel.json` has rewrite rule
- Verify React Router routes
- Check for conflicting routes

## Git Workflow

```
Your Work:
1. git checkout develop
2. git pull origin develop
3. git checkout -b feature/product/feature-name
4. [make changes]
5. git add .
6. git commit -m "feat(product): description"
7. git push origin feature/product/feature-name
8. Open PR → product/product-name

Product Lead:
1. Review PRs
2. Merge to product/product-name
3. When ready, merge product → develop

Release:
1. develop → staging (auto-deploy)
2. Test on staging
3. staging → main (auto-deploy to production)
```

## URL Patterns

### Development
```
http://localhost:3000              → Hub
http://publish.localhost:3000      → Publish (requires /etc/hosts)
http://shillquest.localhost:3000   → ShillQuest (requires /etc/hosts)
```

### Staging
```
https://staging.readia.io          → Hub
https://publish.staging.readia.io  → Publish
https://shillquest.staging.readia.io → ShillQuest
```

### Production
```
https://readia.io                  → Hub
https://publish.readia.io          → Publish
https://shillquest.readia.io       → ShillQuest
```

## Vercel Configuration

### Adding Domain
1. Vercel Dashboard → Project → Domains
2. Add Domain: `{product}.readia.io`
3. Vercel provides DNS target: `cname.vercel-dns.com`
4. Add CNAME in DNS provider

### Environment Variables
1. Settings → Environment Variables
2. Add variable
3. Select environments: Production, Preview, Development
4. Save
5. Redeploy if needed

## Testing Checklist

Before pushing:
- [ ] Runs locally without errors
- [ ] Linting passes
- [ ] No console errors
- [ ] All routes work
- [ ] Responsive on mobile

Before staging:
- [ ] All features work
- [ ] Wallet connection works (if applicable)
- [ ] API calls succeed
- [ ] Images load

Before production:
- [ ] Tested on staging
- [ ] SEO meta tags correct
- [ ] Analytics configured
- [ ] Error tracking works
- [ ] Performance acceptable

## Useful Links

- Architecture Doc: `/ARCHITECTURE.md`
- Migration Guide: `/MIGRATION_GUIDE.md`
- Product Template: `/docs/PRODUCT_TEMPLATE.md`
- Architecture Diagram: `/docs/ARCHITECTURE_DIAGRAM.md`
- CLAUDE.md: `/CLAUDE.md`
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard

## Team Contacts

- Architecture questions: [Team lead]
- Deployment issues: [DevOps lead]
- Product decisions: [Product manager]
- Design questions: [Design lead]

## Keyboard Shortcuts (VS Code)

```
Cmd/Ctrl + P           → Quick open file
Cmd/Ctrl + Shift + F   → Search in files
Cmd/Ctrl + D           → Select next occurrence
Cmd/Ctrl + /           → Toggle comment
Cmd/Ctrl + B           → Toggle sidebar
Cmd/Ctrl + `           → Toggle terminal
```

## Common Patterns

### Page Component
```typescript
export default function PageName() {
  return (
    <div className="page-name">
      <h1>Page Title</h1>
      {/* content */}
    </div>
  );
}
```

### Component with Props
```typescript
interface Props {
  title: string;
  onClick?: () => void;
}

export default function Component({ title, onClick }: Props) {
  return <button onClick={onClick}>{title}</button>;
}
```

### API Call
```typescript
async function fetchData() {
  const response = await fetch(`${API_URL}/endpoint`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}
```

### Conditional Rendering
```typescript
{isLoading ? (
  <Loading />
) : error ? (
  <Error message={error} />
) : (
  <Content data={data} />
)}
```

## Performance Tips

- Use lazy loading for routes
- Optimize images (use WebP)
- Minimize bundle size
- Use React.memo for expensive components
- Implement virtualization for long lists
- Code split by product

## Security Reminders

- Always sanitize user input (DOMPurify)
- Validate on backend (Zod schemas)
- Never expose private keys
- Use environment variables for secrets
- Normalize wallet addresses
- Rate limit API endpoints

## Documentation Standards

Every product should have:
- `README.md` - Overview & setup
- `config.ts` - Configuration
- Component JSDoc comments
- API endpoint documentation
- Deployment notes

---

**Last Updated:** 2025-12-16
**Version:** 1.0
**Maintained By:** Engineering Team
