import Database from '../src/database';

async function main() {
  console.log('🚀 Initializing/Recalculating popularity scores for all articles...\n');

  const db = new Database();

  // Wait a bit for database to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    const result = await db.recalculateAllPopularityScores();

    console.log(`\n✅ Done!`);
    console.log(`   Articles updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

main();
