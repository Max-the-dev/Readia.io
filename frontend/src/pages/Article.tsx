import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Clock, User, Lock } from 'lucide-react';

// Mock article data - in real app this would come from API
const mockArticles = {
  1: {
    id: 1,
    title: "Building Scalable Web3 Applications with x402 Protocol",
    author: "alex_crypto",
    readTime: "8 min read",
    publishDate: "2024-10-25",
    price: 0.12,
    preview: `The x402 protocol represents a fundamental shift in how we think about content monetization and micropayments on the web. Unlike traditional subscription models that create barriers between readers and content, x402 enables seamless, per-article payments that benefit both creators and consumers.

In this comprehensive guide, we'll explore how to implement x402 in your applications, covering everything from basic setup to advanced payment flows. We'll also examine real-world case studies and performance optimizations that can make or break your implementation.`,
    fullContent: `The x402 protocol represents a fundamental shift in how we think about content monetization and micropayments on the web. Unlike traditional subscription models that create barriers between readers and content, x402 enables seamless, per-article payments that benefit both creators and consumers.

In this comprehensive guide, we'll explore how to implement x402 in your applications, covering everything from basic setup to advanced payment flows. We'll also examine real-world case studies and performance optimizations that can make or break your implementation.

## Getting Started with x402

First, let's understand the core components of the x402 protocol:

1. **Payment Pointer**: A standardized way to identify payment endpoints
2. **Receipt Service**: Validates and tracks payments
3. **Content Gates**: Conditionally serve content based on payment status

### Setting Up Your Payment Infrastructure

To begin implementing x402, you'll need to establish a few key components in your application architecture. The payment pointer serves as your primary identifier and should be included in your site's meta tags:

\`\`\`html
<meta name="monetization" content="$ilp.uphold.com/your-payment-pointer">
\`\`\`

### Implementing Dynamic Content Gates

The real power of x402 comes from its ability to create dynamic payment gates that don't disrupt the user experience. Here's how to implement a basic content gate:

\`\`\`javascript
class ContentGate {
  constructor(price, content) {
    this.price = price;
    this.content = content;
    this.paid = false;
  }

  async verifyPayment(receipt) {
    // Verify payment with receipt service
    const isValid = await this.validateReceipt(receipt);
    if (isValid) {
      this.paid = true;
      return this.content;
    }
    throw new Error('Invalid payment');
  }
}
\`\`\`

## Advanced Implementation Patterns

Once you have the basics working, there are several advanced patterns that can significantly improve user experience:

### Progressive Payment Gates

Instead of blocking all content, consider implementing progressive gates that allow readers to consume increasingly valuable content as they pay more. This creates a natural progression and reduces friction.

### Smart Caching Strategies

Implement intelligent caching that respects payment status while optimizing for performance. Paid content should be cached differently than free content to prevent unauthorized access.

### Analytics and Optimization

Track payment conversion rates and optimize your pricing strategy based on real data. The x402 protocol provides rich analytics capabilities that traditional payment systems lack.

## Real-World Case Studies

Several major publications have successfully implemented x402 with impressive results:

- **TechDaily**: Increased revenue by 340% while reducing churn by 60%
- **CryptoInsights**: Achieved 85% payment conversion rate on premium content
- **DevBlog**: Reduced payment friction by 90% compared to traditional paywalls

## Performance Considerations

When implementing x402, keep these performance tips in mind:

1. Lazy-load payment verification scripts
2. Cache payment status locally with appropriate expiration
3. Implement graceful fallbacks for unsupported browsers
4. Monitor payment latency and optimize accordingly

## Conclusion

The x402 protocol offers unprecedented flexibility for content monetization while maintaining excellent user experience. By following the patterns outlined in this guide, you can create a robust payment system that scales with your content strategy.

Remember that the key to success with x402 is balancing monetization with user experience. Start with simple implementations and gradually add complexity as you understand your audience's behavior patterns.`
  }
};

function Article() {
  const { id } = useParams();
  const { isConnected } = useWallet();
  const [hasPaid, setHasPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const article = mockArticles[Number(id) as keyof typeof mockArticles];

  if (!article) {
    return (
      <div className="article-page">
        <div className="container">
          <div className="article-not-found">
            <h1>Article not found</h1>
            <p>The article you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    // Simulate payment processing
    setTimeout(() => {
      setHasPaid(true);
      setIsProcessingPayment(false);
    }, 2000);
  };

  return (
    <div className="article-page">
      <div className="container">
        <article className="article-content">
          <header className="article-header">
            <h1>{article.title}</h1>
            <div className="article-meta">
              <div className="author-info">
                <User size={16} />
                <span>@{article.author}</span>
              </div>
              <div className="read-info">
                <Clock size={16} />
                <span>{article.readTime}</span>
              </div>
              <div className="publish-date">
                <span>{new Date(article.publishDate).toLocaleDateString()}</span>
              </div>
            </div>
          </header>

          <div className="article-body">
            <div className="article-preview">
              {article.preview.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {!hasPaid && (
              <div className="payment-gate">
                <div className="payment-overlay">
                  <Lock size={48} />
                  <h3>Continue Reading</h3>
                  <p>Unlock the full article with a one-time payment of <strong>${article.price.toFixed(2)}</strong></p>
                  
                  {!isConnected ? (
                    <div className="connect-wallet">
                      <p>Connect your wallet to continue</p>
                      <ConnectButton />
                    </div>
                  ) : (
                    <button 
                      className="pay-button"
                      onClick={handlePayment}
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? 'Processing...' : `Pay $${article.price.toFixed(2)}`}
                    </button>
                  )}
                  
                  <div className="payment-benefits">
                    <p>✓ Instant access to full article</p>
                    <p>✓ Support the author directly</p>
                    <p>✓ No subscription required</p>
                  </div>
                </div>
              </div>
            )}

            {hasPaid && (
              <div className="full-content">
                <div className="payment-success">
                  <p>✓ Payment successful! Enjoy the full article.</p>
                </div>
                {article.fullContent.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={index}>{paragraph.replace('## ', '')}</h2>;
                  }
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={index}>{paragraph.replace('### ', '')}</h3>;
                  }
                  if (paragraph.startsWith('```')) {
                    const code = paragraph.replace(/```\w*\n?/, '').replace(/```$/, '');
                    return <pre key={index}><code>{code}</code></pre>;
                  }
                  if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter(item => item.startsWith('- '));
                    return (
                      <ul key={index}>
                        {items.map((item, i) => (
                          <li key={i}>{item.replace('- ', '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (paragraph.match(/^\d+\./)) {
                    const items = paragraph.split('\n').filter(item => item.match(/^\d+\./));
                    return (
                      <ol key={index}>
                        {items.map((item, i) => (
                          <li key={i}>{item.replace(/^\d+\.\s*/, '')}</li>
                        ))}
                      </ol>
                    );
                  }
                  return <p key={index}>{paragraph}</p>;
                })}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

export default Article;