import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Clock, User, Lock, HeartHandshake } from 'lucide-react';

// Mock article data - in real app this would come from API
const mockArticles = {
  4: {
    id: 4,
    title: "Getting Started with Penny.io: A Writer's Guide",
    author: "connected_user",
    authorAddress: "DYNAMIC", // Will be replaced with actual connected address
    readTime: "4 min read",
    publishDate: "2024-10-27",
    price: 0.05,
    preview: `Welcome to Penny.io! This comprehensive guide will walk you through everything you need to know about creating, publishing, and monetizing your content on our revolutionary micropayment platform.

Whether you're a seasoned writer looking for a new revenue stream or a newcomer to content creation, this guide covers all the essentials to get you started and thriving on Penny.io.`,
    fullContent: `Welcome to Penny.io! This comprehensive guide will walk you through everything you need to know about creating, publishing, and monetizing your content on our revolutionary micropayment platform.

Whether you're a seasoned writer looking for a new revenue stream or a newcomer to content creation, this guide covers all the essentials to get you started and thriving on Penny.io.

## What Makes Penny.io Different

Penny.io represents a fundamental shift from traditional content monetization models. Instead of relying on subscriptions, ads, or paywalls that block entire articles, we use the x402 protocol to enable true micropayments.

### Key Benefits for Writers

1. **Instant Payouts**: Get paid immediately when readers purchase your content
2. **You Set the Price**: Complete control over your article pricing ($0.01-$1.00)
3. **No Platform Fees**: Keep 100% of your earnings
4. **Global Reach**: Accessible to anyone with a Web3 wallet
5. **Transparent Analytics**: Real-time insights into your content performance

## Getting Started: Your First Article

Creating your first article on Penny.io is straightforward:

### Step 1: Connect Your Wallet
- Use MetaMask, Coinbase Wallet, or any Web3-compatible wallet
- Ensure you're on a supported network (Ethereum, Polygon, etc.)
- Your wallet address becomes your unique writer identity

### Step 2: Write Your Content
- Use our markdown editor for rich formatting
- Include engaging headlines and clear structure
- Optimize for readability and value delivery

### Step 3: Set Your Price
- Consider your content's value and target audience
- Start with lower prices to build readership
- Test different price points to find your sweet spot

### Step 4: Publish and Promote
- Share your article link on social media
- Engage with the Penny.io community
- Build your reader base organically

## Maximizing Your Earnings

Success on Penny.io comes from understanding your audience and consistently delivering value.

### Content Strategy Tips

**Focus on Quality Over Quantity**: One well-researched, valuable article often outperforms multiple rushed pieces.

**Understand Your Niche**: Develop expertise in specific areas and become known for that content.

**Engage with Readers**: Respond to feedback and build relationships with your audience.

**Optimize Pricing**: Use your dashboard analytics to understand what pricing works best.

### Analytics and Optimization

Your writer dashboard provides comprehensive insights:
- View counts and conversion rates
- Earnings tracking and trends
- Reader engagement metrics
- Performance comparisons across articles

Use this data to refine your content strategy and pricing approach.

## Best Practices for Success

### Writing Guidelines
- Clear, engaging headlines
- Strong opening paragraphs
- Well-structured content with headers
- Actionable insights and takeaways
- Proper grammar and formatting

### Pricing Strategy
- Research similar content pricing
- Consider your target audience's willingness to pay
- Factor in content length and research depth
- Test and iterate based on performance

### Community Building
- Consistently publish quality content
- Engage with other writers
- Share insights and tips
- Build your reputation within the ecosystem

## Technical Considerations

### Wallet Security
- Use hardware wallets for large earnings
- Keep your seed phrase secure
- Enable two-factor authentication where possible
- Regularly monitor your account activity

### Platform Features
- Bookmark your favorite articles
- Follow writers you enjoy
- Use the search functionality to discover content
- Participate in community discussions

## Troubleshooting Common Issues

### Payment Problems
- Ensure sufficient network fees for transactions
- Check wallet connectivity
- Verify network compatibility
- Contact support if issues persist

### Content Issues
- Use supported markdown formatting
- Check image upload requirements
- Ensure content meets community guidelines
- Review for proper formatting before publishing

## The Future of Content Monetization

Penny.io is pioneering the future of how creators get paid for their work. By removing traditional barriers and enabling direct value exchange, we're creating a more equitable content ecosystem.

As you begin your journey on Penny.io, remember that success comes from consistently providing value to your readers. Focus on creating content that genuinely helps, informs, or entertains your audience, and the financial rewards will follow.

Welcome to the future of content creation!`
  },
  1: {
    id: 1,
    title: "Building Scalable Web3 Applications with x402 Protocol",
    author: "alex_crypto",
    authorAddress: "0x742d35Cc6634C0532925a3b8D6A9DdC6C7C10f12", // Mock author wallet address
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
  const { isConnected, address } = useWallet();
  const [hasPaid, setHasPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentToast, setShowPaymentToast] = useState(false);

  // Tipping state
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(0.05);
  const [isProcessingTip, setIsProcessingTip] = useState(false);
  const [hasTipped, setHasTipped] = useState(false);

  const article = mockArticles[Number(id) as keyof typeof mockArticles];
  
  // Set dynamic author address for article 4 (connected user's article)
  if (article && article.id === 4 && article.authorAddress === "DYNAMIC" && address) {
    article.authorAddress = address;
  }
  
  // Check if current user is the author of this article
  const isAuthor = address && article && address.toLowerCase() === article.authorAddress.toLowerCase();

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
      setShowPaymentToast(true);
      // Hide toast after 3 seconds
      setTimeout(() => setShowPaymentToast(false), 3000);
    }, 2000);
  };

  const handleTip = async () => {
    setIsProcessingTip(true);
    // Simulate tip processing
    setTimeout(() => {
      setHasTipped(true);
      setIsProcessingTip(false);
      // Don't close modal automatically - let user see success message and close manually
    }, 1500);
  };

  // Set default tip options
  const tipOptions = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];

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

            {!hasPaid && !isAuthor && (
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

            {isAuthor && (
              <div className="author-notice">
                <p>✍️ You're viewing your own article - no payment required!</p>
              </div>
            )}

            {(hasPaid || isAuthor) && (
              <div className="full-content">
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

        {/* Floating Tip Button - only show for readers after payment */}
        {(hasPaid && !isAuthor) && (
          <div className="floating-tip-container">
            <button 
              className="floating-tip-button"
              onClick={() => {
                setShowTipModal(true);
                setHasTipped(false); // Reset tip success state when opening modal
              }}
              title="Tip the author"
            >
              <HeartHandshake size={15}/> Tip Author
            </button>
          </div>
        )}

        {/* Tip Modal */}
        {showTipModal && (
          <div className="tip-modal-overlay" onClick={() => setShowTipModal(false)}>
            <div className="tip-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tip-modal-header">
                <h3><HeartHandshake size={16}/> Tip the Author</h3>
                <button 
                  className="tip-modal-close"
                  onClick={() => setShowTipModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="tip-modal-content">
                <p>Show your appreciation for this great content!</p>
                
                <div className="tip-amount-selector">
                  <label>Select tip amount:</label>
                  <div className="tip-options">
                    {tipOptions.map((amount) => (
                      <button
                        key={amount}
                        className={`tip-option ${tipAmount === amount ? 'selected' : ''}`}
                        onClick={() => setTipAmount(amount)}
                      >
                        ${amount.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="tip-custom-amount">
                  <label>Or enter custom amount:</label>
                  <input
                    type="number"
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0.01)}
                    className="tip-amount-input"
                  />
                </div>
                
                <div className="tip-modal-actions">
                  <button
                    className="tip-submit-button"
                    onClick={handleTip}
                    disabled={isProcessingTip || tipAmount < 0.01 || tipAmount > 1.00}
                  >
                    {isProcessingTip ? 'Processing...' : `Send Tip $${tipAmount.toFixed(2)}`}
                  </button>
                </div>
                
                {hasTipped && (
                  <div className="tip-success">
                    <p>✨ Tip sent successfully! Thank you for supporting the author.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Success Toast */}
        {showPaymentToast && (
          <div className="payment-toast">
            <p>✓ Payment successful!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Article;