import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_POOLER_URL: process.env.DATABASE_POOLER_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
    'Please check your .env file and ensure all Supabase credentials are set.'
  );
}

/**
 * Supabase Client
 *
 * High-level API for most database operations:
 * - supabase.from('articles').select()
 * - supabase.from('articles').insert()
 * - supabase.storage.from('article-images').upload()
 *
 * Uses service_role key to bypass Row Level Security (RLS)
 * since we're in a trusted backend environment.
 */
export const supabase = createClient(
  requiredEnvVars.SUPABASE_URL!,
  requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * PostgreSQL Connection Pool
 *
 * Direct database access for:
 * - Complex queries not easily expressed in Supabase client
 * - Transactions requiring multiple operations
 * - Raw SQL when needed
 *
 * Configuration:
 * - max: 20 connections (adjust based on your Supabase plan)
 * - idleTimeoutMillis: Close idle connections after 30s
 * - connectionTimeoutMillis: Fail fast if can't connect in 2s
 *
 * Uses Transaction Mode pooler (port 6543) for better serverless performance.
 */
export const pgPool = new Pool({
  connectionString: requiredEnvVars.DATABASE_POOLER_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase uses valid SSL certs
  },
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Fail after 2 seconds if can't connect
});

// Test connection on startup
pgPool.on('connect', () => {
  console.log('✅ PostgreSQL pool connected to Supabase');
});

pgPool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
});

// Graceful shutdown
let isClosing = false;

const closePool = async () => {
  if (isClosing) return;
  isClosing = true;
  console.log('Closing PostgreSQL pool...');
  try {
    await pgPool.end();
  } catch (err) {
    // Ignore "already closed" errors
  }
};

process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

/**
 * Helper function to test database connection
 * Call this on server startup to verify Supabase connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Test Supabase client
    const { data, error } = await supabase
      .from('articles')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // Ignore "table not found" during initial setup
      console.error('❌ Supabase client test failed:', error);
      return false;
    }

    // Test PostgreSQL pool
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}
