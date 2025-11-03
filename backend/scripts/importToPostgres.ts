/**
 * Import Data from SQLite Export to PostgreSQL
 *
 * Imports JSON data exported from SQLite into Supabase PostgreSQL.
 * Handles type conversions and field name mappings.
 *
 * Prerequisites:
 * 1. Run exportSQLiteData.ts first
 * 2. Apply schema migrations to Supabase
 * 3. Fill in .env with Supabase credentials
 *
 * Usage:
 *   ts-node scripts/importToPostgres.ts
 */

import { supabase, pgPool } from '../src/supabaseClient';
import fs from 'fs';
import path from 'path';

const EXPORT_DIR = path.join(__dirname, '../data_export');

interface SQLiteAuthor {
  address: string;
  displayName?: string;
  createdAt: string;
  totalEarnings: number;
  totalArticles: number;
  totalViews: number;
  totalPurchases: number;
}

interface SQLiteArticle {
  id: number;
  title: string;
  content: string;
  preview: string;
  price: number;
  authorAddress: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
  earnings: number;
  readTime: string;
  categories: string; // JSON string in SQLite
  likes: number;
  popularityScore?: number;
}

interface SQLiteUserLike {
  id: number;
  articleId: number;
  userAddress: string;
  createdAt: string;
}

interface SQLiteDraft {
  id: number;
  title: string;
  content: string;
  price: number;
  authorAddress: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Import authors (must be first due to foreign key constraints)
 */
async function importAuthors(authors: SQLiteAuthor[]): Promise<void> {
  console.log(`\n📥 Importing ${authors.length} authors...`);

  const { data, error } = await supabase.from('authors').insert(
    authors.map((a) => ({
      address: a.address,
      display_name: a.displayName || null,
      created_at: a.createdAt,
      total_earnings: a.totalEarnings || 0,
      total_articles: a.totalArticles || 0,
      total_views: a.totalViews || 0,
      total_purchases: a.totalPurchases || 0,
    }))
  );

  if (error) {
    throw new Error(`Author import failed: ${error.message}`);
  }

  console.log(`✅ Imported ${authors.length} authors`);
}

/**
 * Import articles
 */
async function importArticles(articles: SQLiteArticle[]): Promise<void> {
  console.log(`\n📥 Importing ${articles.length} articles...`);

  // Import in batches of 100 to avoid payload limits
  const batchSize = 100;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);

    const { data, error } = await supabase.from('articles').insert(
      batch.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        preview: a.preview,
        price: a.price,
        author_address: a.authorAddress,
        publish_date: a.publishDate,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
        views: a.views || 0,
        purchases: a.purchases || 0,
        earnings: a.earnings || 0,
        read_time: a.readTime,
        categories: JSON.parse(a.categories || '[]'), // Convert TEXT to JSONB
        likes: a.likes || 0,
        popularity_score: a.popularityScore || 0,
      }))
    );

    if (error) {
      throw new Error(`Article import failed (batch ${i / batchSize + 1}): ${error.message}`);
    }

    console.log(`  ✓ Imported batch ${i / batchSize + 1} (${batch.length} articles)`);
  }

  // Reset article ID sequence to max ID + 1
  const maxId = Math.max(...articles.map((a) => a.id), 0);
  await resetSequence('articles_id_seq', maxId);

  console.log(`✅ Imported ${articles.length} articles`);
}

/**
 * Import user likes
 */
async function importUserLikes(likes: SQLiteUserLike[]): Promise<void> {
  if (likes.length === 0) {
    console.log('\n⏭️  No likes to import');
    return;
  }

  console.log(`\n📥 Importing ${likes.length} likes...`);

  // Import in batches
  const batchSize = 500;
  for (let i = 0; i < likes.length; i += batchSize) {
    const batch = likes.slice(i, i + batchSize);

    const { data, error } = await supabase.from('user_likes').insert(
      batch.map((l) => ({
        article_id: l.articleId,
        user_address: l.userAddress,
        created_at: l.createdAt,
      }))
    );

    if (error) {
      throw new Error(`User likes import failed (batch ${i / batchSize + 1}): ${error.message}`);
    }

    console.log(`  ✓ Imported batch ${i / batchSize + 1} (${batch.length} likes)`);
  }

  console.log(`✅ Imported ${likes.length} likes`);
}

/**
 * Import drafts
 */
async function importDrafts(drafts: SQLiteDraft[]): Promise<void> {
  if (drafts.length === 0) {
    console.log('\n⏭️  No drafts to import');
    return;
  }

  console.log(`\n📥 Importing ${drafts.length} drafts...`);

  const { data, error } = await supabase.from('drafts').insert(
    drafts.map((d) => ({
      title: d.title,
      content: d.content,
      price: d.price,
      author_address: d.authorAddress,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
      expires_at: d.expiresAt,
    }))
  );

  if (error) {
    throw new Error(`Drafts import failed: ${error.message}`);
  }

  console.log(`✅ Imported ${drafts.length} drafts`);
}

/**
 * Reset PostgreSQL sequence to max ID + 1
 */
async function resetSequence(sequenceName: string, maxId: number): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`SELECT setval('${sequenceName}', $1, true)`, [maxId]);
    console.log(`  ✓ Reset sequence ${sequenceName} to ${maxId + 1}`);
  } finally {
    client.release();
  }
}

/**
 * Verify data integrity after import
 */
async function verifyImport(): Promise<void> {
  console.log('\n🔍 Verifying data integrity...');

  const client = await pgPool.connect();
  try {
    // Check table counts
    const tables = ['authors', 'articles', 'user_likes', 'drafts'];
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ✓ ${table}: ${result.rows[0].count} rows`);
    }

    // Verify foreign key integrity
    const orphanedArticles = await client.query(`
      SELECT COUNT(*) FROM articles
      WHERE author_address NOT IN (SELECT address FROM authors)
    `);

    if (parseInt(orphanedArticles.rows[0].count) > 0) {
      console.warn(`  ⚠️  Found ${orphanedArticles.rows[0].count} orphaned articles`);
    } else {
      console.log('  ✓ All articles have valid authors');
    }

    // Verify like counts match
    const likeMismatch = await client.query(`
      SELECT COUNT(*) FROM articles a
      WHERE a.likes != (
        SELECT COUNT(*) FROM user_likes WHERE article_id = a.id
      )
    `);

    if (parseInt(likeMismatch.rows[0].count) > 0) {
      console.warn(`  ⚠️  Found ${likeMismatch.rows[0].count} articles with mismatched like counts`);
    } else {
      console.log('  ✓ All like counts match');
    }
  } finally {
    client.release();
  }
}

/**
 * Main import function
 */
async function importAllData() {
  console.log('📦 Starting PostgreSQL data import...');

  // Check if export directory exists
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    console.error('Please run exportSQLiteData.ts first.');
    process.exit(1);
  }

  try {
    // Load JSON files
    const authors: SQLiteAuthor[] = JSON.parse(
      fs.readFileSync(path.join(EXPORT_DIR, 'authors.json'), 'utf-8')
    );
    const articles: SQLiteArticle[] = JSON.parse(
      fs.readFileSync(path.join(EXPORT_DIR, 'articles.json'), 'utf-8')
    );
    const likes: SQLiteUserLike[] = JSON.parse(
      fs.readFileSync(path.join(EXPORT_DIR, 'user_likes.json'), 'utf-8')
    );
    const drafts: SQLiteDraft[] = JSON.parse(
      fs.readFileSync(path.join(EXPORT_DIR, 'drafts.json'), 'utf-8')
    );

    console.log('\n📊 Data summary:');
    console.log(`  - Authors: ${authors.length}`);
    console.log(`  - Articles: ${articles.length}`);
    console.log(`  - Likes: ${likes.length}`);
    console.log(`  - Drafts: ${drafts.length}`);

    // Import in order (respecting foreign key constraints)
    await importAuthors(authors);
    await importArticles(articles);
    await importUserLikes(likes);
    await importDrafts(drafts);

    // Verify
    await verifyImport();

    console.log('\n🎉 Import complete!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Supabase dashboard');
    console.log('2. Test API endpoints with PostgreSQL backend');
    console.log('3. Update backend code to use Supabase client');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run import
importAllData().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
