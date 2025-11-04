import Database from './database';

// Test authors with realistic wallet addresses
const testAuthors = [
  {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
  },
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  },
];

// Generate realistic user addresses (readers who like/purchase articles)
const generateRealisticUsers = (count: number): string[] => {
  const users: string[] = [];
  const prefixes = [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
    '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // Example user 1
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', // Example user 2
    '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', // Example user 3
    '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', // Example user 4
    '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', // Example user 5
    '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', // Example user 6
    '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', // Example user 7
    '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5', // Example user 8
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap router
    '0x00000000219ab540356cBB839Cbe05303d7705Fa', // Eth2 deposit
  ];

  for (let i = 0; i < count; i++) {
    if (i < prefixes.length) {
      users.push(prefixes[i]);
    } else {
      // Generate random addresses
      const hex = '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      users.push(hex);
    }
  }

  return users;
};

const testUsers = generateRealisticUsers(30); // Pool of 30 users for realistic activity

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Available categories (must match validation schema)
const categories = [
  // Tech (5)
  'Technology',
  'AI & Machine Learning',
  'Web Development',
  'Crypto & Blockchain',
  'Security',
  // Business (4)
  'Business',
  'Startup',
  'Finance',
  'Marketing',
  // General Topics (11)
  'Science',
  'Health',
  'Education',
  'Politics',
  'Sports',
  'Entertainment',
  'Gaming',
  'Art & Design',
  'Travel',
  'Food',
  'Other'
];

// Test article data
const testArticles = [
  {
    title: 'The Future of Decentralized Finance',
    content: '<p>Decentralized finance (DeFi) is revolutionizing the financial industry by removing intermediaries and enabling peer-to-peer transactions. This comprehensive guide explores the key concepts, opportunities, and challenges in the DeFi space.</p><p>Smart contracts are the backbone of DeFi, automating financial services without the need for traditional banks or financial institutions. We\'ll examine how protocols like Uniswap, Aave, and Compound are reshaping lending, borrowing, and trading.</p><p>The risks and rewards of DeFi participation, including yield farming, liquidity mining, and governance tokens, are also discussed in detail. Understanding these mechanisms is crucial for anyone looking to participate in this rapidly evolving ecosystem.</p>',
    categories: ['Crypto & Blockchain', 'Finance', 'Technology'],
  },
  {
    title: 'Building Scalable Web Applications with React and TypeScript',
    content: '<p>Modern web development requires robust tooling and best practices. In this article, we explore how React and TypeScript work together to create maintainable, scalable applications.</p><p>Type safety is paramount in large codebases. TypeScript provides compile-time error checking that catches bugs before they reach production. We\'ll cover patterns like custom hooks, context management, and component composition.</p><p>Performance optimization techniques, including code splitting, lazy loading, and memoization, are essential for delivering fast user experiences. Real-world examples demonstrate these concepts in action.</p>',
    categories: ['Web Development', 'Technology'],
  },
  {
    title: 'Understanding Machine Learning Algorithms: A Beginner\'s Guide',
    content: '<p>Machine learning is transforming industries from healthcare to finance. This beginner-friendly guide breaks down fundamental algorithms and their practical applications.</p><p>We start with supervised learning methods like linear regression and decision trees, then progress to more complex algorithms like neural networks and ensemble methods. Each concept is explained with clear examples and visualizations.</p><p>The article also covers data preprocessing, feature engineering, and model evaluation metrics that are essential for successful ML projects. By the end, you\'ll have a solid foundation to start your ML journey.</p>',
    categories: ['AI & Machine Learning', 'Technology', 'Science'],
  },
  {
    title: 'Smart Contract Security: Avoiding Common Vulnerabilities',
    content: '<p>Smart contract vulnerabilities can lead to catastrophic financial losses. This guide covers the most common security issues and how to prevent them.</p><p>Reentrancy attacks, integer overflows, and access control bugs have resulted in millions of dollars in losses. We analyze real-world exploits and demonstrate secure coding patterns using Solidity best practices.</p><p>Testing strategies, including unit tests, integration tests, and formal verification, are crucial for ensuring contract security. We\'ll also discuss audit processes and bug bounty programs.</p>',
    categories: ['Security', 'Crypto & Blockchain', 'Web Development'],
  },
  {
    title: 'The Rise of AI Agents in Autonomous Systems',
    content: '<p>Artificial intelligence agents are becoming increasingly sophisticated, capable of making complex decisions without human intervention. This article explores their architecture and applications.</p><p>From self-driving cars to trading bots, AI agents are transforming how we interact with technology. We examine reinforcement learning algorithms, multi-agent systems, and decision-making frameworks.</p><p>Ethical considerations and safety measures are paramount as these systems gain more autonomy. We discuss alignment problems, fail-safes, and regulatory approaches to AI governance.</p>',
    categories: ['AI & Machine Learning', 'Technology'],
  },
  {
    title: 'Startup Fundraising in 2024: A Complete Guide',
    content: '<p>Raising capital for your startup requires strategy, timing, and compelling storytelling. This comprehensive guide walks through the fundraising process from seed to Series A and beyond.</p><p>We cover pitch deck essentials, valuation methods, term sheet negotiations, and investor relations. Understanding dilution, liquidation preferences, and governance rights is critical for founders.</p><p>Alternative funding sources like revenue-based financing, venture debt, and crowdfunding are also explored as viable options for different types of businesses.</p>',
    categories: ['Startup', 'Business', 'Finance'],
  },
  {
    title: 'Design Systems: Creating Consistent User Experiences',
    content: '<p>A well-crafted design system ensures consistency across products and accelerates development. This article explores how to build and maintain effective design systems.</p><p>Component libraries, design tokens, and documentation are the foundations of a successful system. We analyze examples from companies like Google (Material Design) and IBM (Carbon Design System).</p><p>Governance models, versioning strategies, and adoption tactics help teams successfully implement and evolve their design systems over time.</p>',
    categories: ['Art & Design', 'Web Development', 'Technology'],
  },
  {
    title: 'Quantum Computing: Breaking the Classical Barrier',
    content: '<p>Quantum computers promise to solve problems that are intractable for classical computers. This article demystifies quantum mechanics and its application to computing.</p><p>Qubits, superposition, and entanglement are the building blocks of quantum algorithms. We explore algorithms like Shor\'s factoring and Grover\'s search that demonstrate quantum advantage.</p><p>Current challenges in quantum error correction and scaling are discussed, along with the timeline for practical quantum computers and their potential impact on cryptography.</p>',
    categories: ['Science', 'Technology'],
  },
  {
    title: 'Content Marketing Strategies That Drive Growth',
    content: '<p>Content marketing is more than just blogging - it\'s a strategic approach to attracting and retaining customers. This guide covers proven strategies that drive business results.</p><p>SEO optimization, distribution channels, and audience targeting are foundational elements. We examine case studies from successful content marketing campaigns across different industries.</p><p>Measuring ROI, attribution modeling, and continuous optimization ensure your content efforts deliver tangible business value.</p>',
    categories: ['Marketing', 'Business'],
  },
  {
    title: 'Zero-Knowledge Proofs: Privacy in a Transparent World',
    content: '<p>Zero-knowledge proofs enable verification without revealing underlying information. This cryptographic technique is revolutionizing privacy in blockchain and beyond.</p><p>ZK-SNARKs and ZK-STARKs are the two main implementations, each with different trade-offs. We explore their mathematical foundations and practical applications in protocols like Zcash and zkSync.</p><p>Privacy-preserving authentication, confidential transactions, and scalability solutions demonstrate the broad applicability of zero-knowledge cryptography.</p>',
    categories: ['Crypto & Blockchain', 'Security', 'Technology'],
  },
  {
    title: 'Node.js Performance Optimization Techniques',
    content: '<p>Building high-performance Node.js applications requires understanding event loops, streams, and asynchronous patterns. This guide covers essential optimization techniques.</p><p>Profiling tools like clinic.js and Chrome DevTools help identify bottlenecks. We explore clustering, worker threads, and caching strategies that dramatically improve throughput.</p><p>Memory management, garbage collection tuning, and database query optimization round out our performance toolkit for production Node.js applications.</p>',
    categories: ['Web Development', 'Technology'],
  },
  {
    title: 'The Science of Productivity: Evidence-Based Strategies',
    content: '<p>Productivity isn\'t about working harder - it\'s about working smarter. This article examines scientifically-proven techniques for maximizing output while maintaining well-being.</p><p>Time-blocking, the Pomodoro Technique, and deep work principles are explored with supporting research. We also cover the neuroscience of focus and how to optimize your environment for concentration.</p><p>Habit formation, goal setting frameworks like OKRs, and work-life balance strategies provide a holistic approach to sustainable productivity.</p>',
    categories: ['Business', 'Health', 'Education'],
  },
  {
    title: 'Blockchain Interoperability: Connecting Different Networks',
    content: '<p>The blockchain ecosystem is fragmented across multiple chains. Interoperability solutions are essential for creating a connected, multi-chain future.</p><p>Cross-chain bridges, atomic swaps, and layer-0 protocols enable asset and data transfer between blockchains. We analyze solutions like Polkadot, Cosmos, and LayerZero.</p><p>Security considerations, trust assumptions, and trade-offs in different interoperability approaches are critically examined for developers and users.</p>',
    categories: ['Crypto & Blockchain', 'Technology', 'Security'],
  },
  {
    title: 'Financial Modeling for Early-Stage Startups',
    content: '<p>Creating accurate financial models is crucial for startup planning and investor pitches. This practical guide covers the essentials of startup financial modeling.</p><p>Revenue projections, cost structures, and cash flow forecasting form the core of your model. We provide templates and best practices for different business models including SaaS, marketplace, and e-commerce.</p><p>Scenario planning, sensitivity analysis, and key metrics like CAC, LTV, and burn rate help founders make data-driven decisions.</p>',
    categories: ['Startup', 'Finance', 'Business'],
  },
  {
    title: 'Data Visualization: Communicating Insights Effectively',
    content: '<p>Great data visualization transforms complex data into actionable insights. This article covers principles and tools for creating compelling visualizations.</p><p>Chart selection, color theory, and cognitive load considerations are fundamental to effective design. We explore libraries like D3.js, Plotly, and Tableau for different use cases.</p><p>Dashboard design, interactive visualizations, and storytelling with data help teams communicate findings and drive decision-making across organizations.</p>',
    categories: ['Art & Design', 'Technology', 'Science'],
  },
  {
    title: 'API Design Best Practices for Modern Web Services',
    content: '<p>Well-designed APIs are the backbone of modern software architecture. This comprehensive guide covers REST, GraphQL, and gRPC best practices.</p><p>Versioning strategies, authentication methods, and error handling patterns ensure APIs are maintainable and developer-friendly. We examine real-world examples from leading tech companies.</p><p>Rate limiting, caching, and documentation standards complete our toolkit for building robust, scalable APIs that developers love to use.</p>',
    categories: ['Web Development', 'Technology'],
  },
  {
    title: 'Cybersecurity Fundamentals for Developers',
    content: '<p>Security isn\'t optional in modern software development. This article covers essential security practices every developer should know.</p><p>OWASP Top 10 vulnerabilities, secure coding practices, and defense-in-depth strategies protect applications from common attacks. We cover SQL injection, XSS, CSRF, and authentication vulnerabilities.</p><p>Security testing, dependency management, and incident response procedures ensure your applications remain secure in production environments.</p>',
    categories: ['Security', 'Web Development', 'Technology'],
  },
  {
    title: 'The Economics of Cryptocurrency Mining',
    content: '<p>Cryptocurrency mining is a complex economic activity balancing energy costs, hardware investments, and market volatility. This analysis explores mining economics.</p><p>Proof-of-work consensus mechanisms, mining difficulty adjustments, and pool dynamics determine miner profitability. We calculate break-even points and ROI for different cryptocurrencies.</p><p>Environmental concerns, renewable energy adoption, and the transition to proof-of-stake are reshaping the mining landscape and its long-term viability.</p>',
    categories: ['Crypto & Blockchain', 'Finance', 'Technology'],
  },
  {
    title: 'User Experience Research: Methods and Frameworks',
    content: '<p>Great UX design is grounded in research and user understanding. This guide covers essential research methods for product teams.</p><p>User interviews, usability testing, and A/B testing generate insights that drive design decisions. We explore both qualitative and quantitative research approaches.</p><p>Personas, journey mapping, and design thinking frameworks help teams empathize with users and create products that truly solve their problems.</p>',
    categories: ['Art & Design', 'Business', 'Technology'],
  },
  {
    title: 'Microservices Architecture: Patterns and Anti-Patterns',
    content: '<p>Microservices architecture enables teams to build scalable, resilient systems. However, it introduces complexity that must be carefully managed.</p><p>Service boundaries, communication patterns, and data management strategies are critical design decisions. We examine patterns like API gateway, service mesh, and event sourcing.</p><p>Common pitfalls including distributed monoliths, cascading failures, and operational complexity are discussed with practical solutions and tooling recommendations.</p>',
    categories: ['Technology', 'Web Development'],
  },
];

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(): number {
  // Random price between $0.01 and $1.00
  const prices = [0.01, 0.02, 0.03, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.50, 0.75, 1.00];
  return getRandomElement(prices);
}

function getRandomDate(daysAgo: number): string {
  const now = Date.now();
  const randomDays = Math.random() * daysAgo;
  const date = new Date(now - randomDays * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function generatePreview(content: string): string {
  // Strip HTML tags and take first 300 chars
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.substring(0, 300);
}

function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, ' ');
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

/**
 * Generate realistic likes for an article based on its view count
 * Returns array of unique user addresses who liked the article
 */
function generateRealisticLikes(views: number, articleCreatedAt: string): string[] {
  // Like rate varies by article quality (simulated by random factor)
  // Real-world conversion: 2-15% of viewers like content
  const likeRate = 0.02 + Math.random() * 0.13; // 2-15%
  const potentialLikes = Math.floor(views * likeRate);

  // Not all potential likers will actually like (some just view)
  const actualLikes = Math.floor(potentialLikes * (0.6 + Math.random() * 0.4)); // 60-100% follow through

  // Select random unique users from pool
  const shuffled = [...testUsers].sort(() => Math.random() - 0.5);
  const likers = shuffled.slice(0, Math.min(actualLikes, testUsers.length));

  return likers;
}

async function populateDatabase() {
  const db = new Database();

  // Wait for database initialization to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    console.log('🚀 Starting database population...\n');

    // Step 1: Create test authors
    console.log('👥 Creating test authors...');
    for (const author of testAuthors) {
      await db.createOrUpdateAuthor({
        ...author,
        totalEarnings: 0,
        totalArticles: 0,
        totalViews: 0,
        totalPurchases: 0,
      });
      console.log(`✅ Created author: ${formatAddress(author.address)} (${author.address})`);
    }

    console.log('\n📝 Creating test articles...\n');

    // Step 2: Create test articles
    const createdArticles: Array<{ id: number; views: number; createdAt: string }> = [];

    for (let i = 0; i < testArticles.length; i++) {
      const articleData = testArticles[i];
      const author = getRandomElement(testAuthors);
      const price = getRandomPrice();
      const views = getRandomInt(5, 500);
      const purchases = getRandomInt(0, Math.min(50, Math.floor(views * 0.3))); // Up to 30% of views
      const earnings = purchases * price;
      const createdAt = getRandomDate(30); // Within last 30 days

      const article = {
        title: articleData.title,
        content: articleData.content,
        preview: generatePreview(articleData.content),
        price,
        authorAddress: author.address,
        publishDate: createdAt,
        createdAt,
        updatedAt: createdAt,
        views,
        purchases,
        earnings,
        readTime: calculateReadTime(articleData.content),
        categories: articleData.categories,
        likes: 0, // Will be calculated from user_likes table
        popularityScore: 0, // Will be calculated after likes
      };

      const created = await db.createArticle(article);
      createdArticles.push({ id: created.id, views, createdAt });

      console.log(`✅ Article ${i + 1}/20: "${article.title}"`);
      console.log(`   Author: ${formatAddress(author.address)}`);
      console.log(`   Price: $${price.toFixed(2)} | Views: ${views} | Purchases: ${purchases}`);
      console.log(`   Categories: ${articleData.categories.join(', ')}`);
      console.log('');
    }

    // Step 3: Generate realistic user likes
    console.log('❤️  Generating realistic user likes...\n');
    let totalLikes = 0;

    for (const article of createdArticles) {
      const likers = generateRealisticLikes(article.views, article.createdAt);

      for (const userAddress of likers) {
        try {
          await db.likeArticle(article.id, userAddress);
          totalLikes++;
        } catch (error) {
          // Skip duplicates silently
        }
      }

      // Update the article's like count from user_likes table
      await db.updateArticleLikesCount(article.id);

      const updatedArticle = await db.getArticleById(article.id);
      if (updatedArticle) {
        console.log(`✅ Article ${article.id}: ${updatedArticle.likes} likes from ${article.views} views (${((updatedArticle.likes / article.views) * 100).toFixed(1)}% conversion)`);
      }
    }

    console.log(`\n✨ Generated ${totalLikes} total likes from ${testUsers.length} unique users\n`);

    // Step 4: Recalculate popularity scores (now includes likes)
    console.log('📈 Recalculating popularity scores for all articles...');
    const result = await db.recalculateAllPopularityScores();
    console.log(`✅ Updated ${result.updated} articles (${result.errors} errors)\n`);

    // Step 5: Recalculate author totals
    console.log('📊 Recalculating author totals...');
    for (const author of testAuthors) {
      await db.recalculateAuthorTotals(author.address);
      const updatedAuthor = await db.getAuthor(author.address);
      if (updatedAuthor) {
        console.log(`✅ ${formatAddress(updatedAuthor.address)}:`);
        console.log(`   Total Articles: ${updatedAuthor.totalArticles}`);
        console.log(`   Total Views: ${updatedAuthor.totalViews}`);
        console.log(`   Total Purchases: ${updatedAuthor.totalPurchases}`);
        console.log(`   Total Earnings: $${updatedAuthor.totalEarnings.toFixed(2)}`);
      }
    }

    console.log('\n✨ Database population complete!');
    console.log(`📊 Created ${testAuthors.length} authors and ${testArticles.length} articles`);

  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    db.close();
  }
}

// Run the population script
populateDatabase();
