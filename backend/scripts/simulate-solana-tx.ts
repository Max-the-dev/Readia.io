#!/usr/bin/env npx ts-node
/**
 * Solana Transaction Simulator
 *
 * Usage:
 *   npx ts-node scripts/simulate-solana-tx.ts <base64_transaction> [network]
 *
 * Examples:
 *   npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." devnet
 *   npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." mainnet
 *
 * Copy the RAW_SOLANA_TX from server logs and paste it as the first argument.
 */

import 'dotenv/config';

const NETWORKS: Record<string, string> = {
  devnet: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
  mainnet: process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

async function simulateTransaction(base64Tx: string, network: string) {
  const rpcUrl = NETWORKS[network];
  if (!rpcUrl) {
    console.error(`Unknown network: ${network}. Use 'devnet' or 'mainnet'`);
    process.exit(1);
  }

  console.log(`\n🔍 Simulating transaction on ${network}`);
  console.log(`   RPC: ${rpcUrl}`);
  console.log(`   TX length: ${base64Tx.length} chars\n`);

  try {
    // First, decode and inspect the transaction
    const txBuffer = Buffer.from(base64Tx, 'base64');
    console.log(`📦 Transaction size: ${txBuffer.length} bytes\n`);

    // Simulate with replaceRecentBlockhash to handle stale blockhash
    const simResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateTransaction',
        params: [
          base64Tx,
          {
            encoding: 'base64',
            commitment: 'confirmed',
            replaceRecentBlockhash: true,
            sigVerify: false,  // Skip signature verification for simulation
          }
        ]
      })
    });

    const result = await simResponse.json();

    if (result.error) {
      console.error('❌ RPC Error:', JSON.stringify(result.error, null, 2));
      return;
    }

    const simResult = result.result;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    SIMULATION RESULT');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (simResult.err) {
      console.log('❌ SIMULATION FAILED\n');
      console.log('Error:', JSON.stringify(simResult.err, null, 2));
    } else {
      console.log('✅ SIMULATION SUCCEEDED\n');
    }

    console.log(`Units consumed: ${simResult.unitsConsumed || 'N/A'}`);
    console.log(`Return data: ${simResult.returnData ? JSON.stringify(simResult.returnData) : 'N/A'}`);

    if (simResult.logs && simResult.logs.length > 0) {
      console.log('\n───────────────────────────────────────────────────────────');
      console.log('                     PROGRAM LOGS');
      console.log('───────────────────────────────────────────────────────────\n');
      simResult.logs.forEach((log: string, i: number) => {
        // Highlight errors
        if (log.includes('failed') || log.includes('Error') || log.includes('error')) {
          console.log(`  ${i + 1}. ❌ ${log}`);
        } else if (log.includes('success') || log.includes('Success')) {
          console.log(`  ${i + 1}. ✅ ${log}`);
        } else {
          console.log(`  ${i + 1}. ${log}`);
        }
      });
    }

    // Also try to get account info for accounts in the error
    if (simResult.err && typeof simResult.err === 'object') {
      console.log('\n───────────────────────────────────────────────────────────');
      console.log('                   ERROR ANALYSIS');
      console.log('───────────────────────────────────────────────────────────\n');

      if ('InstructionError' in simResult.err) {
        const [instructionIndex, errorDetail] = simResult.err.InstructionError;
        console.log(`  Instruction index: ${instructionIndex}`);
        console.log(`  Error type: ${JSON.stringify(errorDetail)}`);

        if (typeof errorDetail === 'object' && 'Custom' in errorDetail) {
          console.log(`\n  Custom error code: ${errorDetail.Custom}`);
          console.log('  (Check the program source for what this error code means)');
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Failed to simulate transaction:', error);
  }
}

// Parse CLI args
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Solana Transaction Simulator

Usage:
  npx ts-node scripts/simulate-solana-tx.ts <base64_transaction> [network]

Arguments:
  base64_transaction  The base64-encoded transaction (from RAW_SOLANA_TX log)
  network            'devnet' or 'mainnet' (default: devnet)

Example:
  npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." devnet
`);
  process.exit(0);
}

const base64Tx = args[0];
const network = args[1] || 'mainnet';

simulateTransaction(base64Tx, network);
