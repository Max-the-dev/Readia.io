import Database from './database';
import { Author, SupportedAuthorNetwork } from './types';

const PLATFORM_BASE_ADDRESS =
  process.env.X402_PLATFORM_EVM_ADDRESS ||
  '0x6D084C5857b7FE93e3F947a09a8A68E6B2d5Ec75';

const SEED_AUTHORS: Array<Pick<Author, 'address' | 'primaryPayoutNetwork' | 'createdAt'>> = [
  {
    address: PLATFORM_BASE_ADDRESS,
    primaryPayoutNetwork: 'eip155:8453',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const VALIDATION_PRICE_USD = 0.01;

type ValidationArticleConfig = {
  title: string;
  content: string;
  authorAddress: string;
  authorPrimaryNetwork: SupportedAuthorNetwork;
};

const VALIDATION_ARTICLES: ValidationArticleConfig[] = [
  {
    title: 'Test Article 1',
    content:
      '<p>The evolution of decentralized finance has fundamentally changed how we think about ownership and value transfer on the internet. Unlike traditional financial systems that rely on intermediaries, blockchain technology enables peer-to-peer transactions that are transparent, immutable, and accessible to anyone with an internet connection.</p><p>Smart contracts have emerged as the backbone of this revolution, automating complex financial operations without requiring trust in centralized authorities. From automated market makers to lending protocols, these self-executing agreements are reshaping how value flows through digital ecosystems.</p><p>As we move forward, the intersection of artificial intelligence and blockchain presents unprecedented opportunities for creating more efficient, secure, and user-friendly financial systems that can serve billions of people worldwide.</p>',
    authorAddress: PLATFORM_BASE_ADDRESS,
    authorPrimaryNetwork: 'eip155:8453',
  },
  {
    title: 'Test Article 2',
    content:
      '<p>The art of sourdough baking has experienced a remarkable renaissance in recent years, connecting modern home bakers with ancient fermentation techniques that date back thousands of years. At its core, sourdough is a living ecosystem—a symbiotic relationship between wild yeast and lactobacilli bacteria that transforms simple flour and water into complex, flavorful bread.</p><p>What makes sourdough unique is its natural leavening process. Unlike commercial yeast breads, sourdough develops its characteristic tangy flavor and open crumb structure through slow fermentation, which not only enhances taste but also makes the bread more digestible and nutritious.</p><p>The ritual of maintaining a sourdough starter has become a meditative practice for many, offering a tangible connection to traditional foodways in our increasingly automated world. Each loaf tells a story of time, patience, and the invisible microorganisms that make it all possible.</p>',
    authorAddress: PLATFORM_BASE_ADDRESS,
    authorPrimaryNetwork: 'eip155:8453',
  },
  {
    title: 'Test Article 3',
    content:
      '<p>Large language models have rapidly transformed from experimental research projects into powerful tools that are reshaping how we interact with technology. These AI systems, trained on vast amounts of text data, can understand context, generate human-like responses, and assist with everything from writing code to analyzing complex documents.</p><p>The implications extend far beyond simple chatbots. Modern AI models are being integrated into software development workflows, content creation pipelines, and decision-making processes across industries. They serve as collaborative partners, augmenting human capabilities rather than simply replacing them.</p><p>As these technologies continue to evolve, questions around ethics, bias, and responsible deployment become increasingly important. The challenge lies not just in building more powerful models, but in ensuring they serve humanity in ways that are transparent, fair, and aligned with our values.</p>',
    authorAddress: PLATFORM_BASE_ADDRESS,
    authorPrimaryNetwork: 'eip155:8453',
  },
];

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function generatePreview(content: string): string {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, ' ');
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  return `${minutes} min read`;
}

async function populateDatabase() {
  const db = new Database();

  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    console.log('🚀 Starting x402 validation seed...\n');

    console.log('👥 Ensuring platform authors exist...');
    for (const author of SEED_AUTHORS) {
      await db.createOrUpdateAuthor({
        ...author,
        totalEarnings: 0,
        totalArticles: 0,
        totalViews: 0,
        totalPurchases: 0,
      });
      console.log(`   ↳ ${formatAddress(author.address)} (${author.primaryPayoutNetwork})`);
    }

    console.log('\n🧪 Creating fixed validation articles...\n');
    for (const config of VALIDATION_ARTICLES) {
      const timestamp = new Date().toISOString();
      const payload = {
        title: config.title,
        content: config.content,
        preview: generatePreview(config.content),
        price: VALIDATION_PRICE_USD,
        authorAddress: config.authorAddress,
        authorPrimaryNetwork: config.authorPrimaryNetwork,
        publishDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        views: 0,
        purchases: 0,
        earnings: 0,
        readTime: calculateReadTime(config.content),
        categories: [] ,
        likes: 0,
        popularityScore: 0,
      };

      const created = await db.createArticle(payload);
      console.log(
        `✅ Article "${config.title}" created (ID ${created.id}) for ${config.authorPrimaryNetwork.toUpperCase()}`
      );
    }

    console.log('\n✨ x402 validation seed complete!');
    console.log(`📊 Ensured ${SEED_AUTHORS.length} authors and ${VALIDATION_ARTICLES.length} articles exist.`);
  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    db.close();
  }
}

populateDatabase();
