const { pgPool } = require('../dist/supabaseClient.js');
const { getAddress } = require('ethers');

async function main() {
  console.log('🔄 Normalizing wallet address casing...');
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    const authorResult = await client.query(
      'SELECT address, created_at, total_earnings, total_articles, total_views, total_purchases FROM authors'
    );

    for (const row of authorResult.rows) {
      const current = row.address;
      const checksum = getAddress(current.toLowerCase());

      if (current === checksum) continue;

      console.log(`Fixing ${current} → ${checksum}`);

      await client.query(
        `INSERT INTO authors (address, created_at, total_earnings, total_articles, total_views, total_purchases)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (address) DO UPDATE
           SET created_at = LEAST(authors.created_at, EXCLUDED.created_at),
               total_earnings = GREATEST(authors.total_earnings, EXCLUDED.total_earnings),
               total_articles = GREATEST(authors.total_articles, EXCLUDED.total_articles),
               total_views = GREATEST(authors.total_views, EXCLUDED.total_views),
               total_purchases = GREATEST(authors.total_purchases, EXCLUDED.total_purchases)`,
        [
          checksum,
          row.created_at,
          row.total_earnings,
          row.total_articles,
          row.total_views,
          row.total_purchases,
        ]
      );

      const relatedTables = [
        { table: 'articles', column: 'author_address' },
        { table: 'drafts', column: 'author_address' },
      ];

      for (const { table, column } of relatedTables) {
        await client.query(
          `UPDATE ${table} SET ${column} = $2 WHERE ${column} = $1`,
          [current, checksum]
        );
      }

      await client.query('DELETE FROM authors WHERE address = $1', [current]);
    }

    const genericColumns = [
      { table: 'payments', column: 'user_address' },
      { table: 'user_likes', column: 'user_address' },
    ];

    for (const { table, column } of genericColumns) {
      const { rows } = await client.query(
        `SELECT DISTINCT ${column} AS addr FROM ${table} WHERE ${column} IS NOT NULL`
      );

      for (const { addr } of rows) {
        try {
          const checksum = getAddress(addr.toLowerCase());
          if (checksum === addr) continue;

          console.log(`Updating ${table}.${column}: ${addr} → ${checksum}`);
          await client.query(
            `UPDATE ${table} SET ${column} = $2 WHERE ${column} = $1`,
            [addr, checksum]
          );
        } catch {
          // Skip invalid or placeholder values like 'unknown'
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Address casing updated.');
  } catch (err) {
         await client.query('ROLLBACK');
         console.error('❌ Update failed:', err);
       } finally {
         client.release();
         await pgPool.end();
       }
     }

     main().catch((err) => {
       console.error('Script error:', err);
     });
