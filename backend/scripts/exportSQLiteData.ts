/**
 * Export SQLite Data to JSON
 *
 * Exports all data from the SQLite database to JSON files for migration to PostgreSQL.
 * Run this before migrating to Supabase to preserve all existing data.
 *
 * Usage:
 *   ts-node scripts/exportSQLiteData.ts
 *
 * Output:
 *   backend/data_export/authors.json
 *   backend/data_export/articles.json
 *   backend/data_export/user_likes.json
 *   backend/data_export/drafts.json
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../penny.db');
const EXPORT_DIR = path.join(__dirname, '../data_export');

interface SQLiteRow {
  [key: string]: any;
}

/**
 * Generic function to export a table to JSON
 */
async function exportTable(
  db: sqlite3.Database,
  tableName: string,
  outputFile: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows: SQLiteRow[]) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));
        console.log(`✅ Exported ${rows.length} rows from ${tableName}`);
        resolve(rows.length);
      } catch (writeError) {
        reject(writeError);
      }
    });
  });
}

/**
 * Main export function
 */
async function exportAllData() {
  console.log('📦 Starting SQLite data export...\n');

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ SQLite database not found at: ${DB_PATH}`);
    console.error('Please ensure penny.db exists before running export.');
    process.exit(1);
  }

  // Create export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`📁 Created export directory: ${EXPORT_DIR}\n`);
  }

  // Open SQLite database
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite database:', err);
      process.exit(1);
    }
  });

  try {
    // Export each table
    const tables = [
      { name: 'authors', file: 'authors.json' },
      { name: 'articles', file: 'articles.json' },
      { name: 'user_likes', file: 'user_likes.json' },
      { name: 'drafts', file: 'drafts.json' },
    ];

    let totalRows = 0;

    for (const table of tables) {
      const outputPath = path.join(EXPORT_DIR, table.file);
      const count = await exportTable(db, table.name, outputPath);
      totalRows += count;
    }

    console.log(`\n🎉 Export complete! ${totalRows} total rows exported.`);
    console.log(`📂 Export location: ${EXPORT_DIR}`);
    console.log('\nNext steps:');
    console.log('1. Review exported JSON files for accuracy');
    console.log('2. Apply schema migrations to Supabase');
    console.log('3. Run import script: ts-node scripts/importToPostgres.ts');

    // Close database
    db.close();
  } catch (error) {
    console.error('❌ Export failed:', error);
    db.close();
    process.exit(1);
  }
}

// Run export
exportAllData().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
