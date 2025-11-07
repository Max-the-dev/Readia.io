# Security Testing Guide

## XSS (Cross-Site Scripting) Protection Tests

### How to Test Content Sanitization

**What we're testing**: Article content is sanitized to prevent malicious JavaScript execution.

### Test Cases:

#### ✅ Test 1: Script Tag Injection
**Malicious Input**:
```html
<script>alert('XSS Attack!')</script>
<p>Normal content here</p>
```

**Expected Result**: The `<script>` tag is stripped, only paragraph displays.

#### ✅ Test 2: Event Handler Injection
**Malicious Input**:
```html
<img src="x" onerror="alert('XSS!')">
<button onclick="alert('Clicked!')">Click me</button>
```

**Expected Result**: Event handlers (`onerror`, `onclick`) are removed.

#### ✅ Test 3: JavaScript URL Protocol
**Malicious Input**:
```html
<a href="javascript:alert('XSS!')">Click me</a>
```

**Expected Result**: `javascript:` protocol is stripped from href.

#### ✅ Test 4: Data URL with Script
**Malicious Input**:
```html
<iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>
```

**Expected Result**: `<iframe>` tag is completely removed.

#### ✅ Test 5: SVG with Script
**Malicious Input**:
```html
<svg><script>alert('XSS')</script></svg>
```

**Expected Result**: `<svg>` and `<script>` tags are removed.

### How to Run Tests:

1. **Navigate to Write page**: http://localhost:3000/write
2. **Connect wallet**
3. **Paste malicious code** into TinyMCE editor
4. **Click Preview** button
5. **Verify**: No alert boxes appear
6. **Inspect HTML**: Check DevTools Elements tab - malicious code should be stripped

### Safe Content That Should Work:

```html
<h1>Article Title</h1>
<p>This is a <strong>bold</strong> and <em>italic</em> paragraph.</p>
<img src="https://example.com/image.jpg" alt="Safe image">
<a href="https://example.com">Safe external link</a>
<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>
<code>const safe = 'code block';</code>
```

**Expected Result**: All formatting displays correctly without any stripped content.

---

## Implementation Details

### Frontend Protection (DOMPurify)

**File**: `frontend/src/utils/sanitize.ts`

**Protected Components**:
- `Article.tsx` - Article content display (3 instances)
- `EditArticle.tsx` - Preview modal (1 instance)

**Configuration**:
- Allowed tags: `p`, `h1-h6`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `img`, `code`, `pre`, `table`, etc.
- Blocked tags: `script`, `iframe`, `object`, `embed`, `style`, `link`
- Blocked attributes: All event handlers (`onclick`, `onerror`, etc.)
- URL sanitization: Only `http`, `https`, `mailto`, `tel` protocols allowed

### Backend Protection (TODO)

**Next Steps**:
- Add server-side sanitization using `sanitize-html` package
- Sanitize on article creation/update endpoints
- Defense-in-depth: Double sanitization (frontend + backend)

---

## Security Headers (TODO)

Future enhancements to add in production:

```javascript
// Express middleware for security headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```
