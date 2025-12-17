#!/usr/bin/env npx ts-node
/**
 * Solana Transaction Simulator
 *
 * Usage:
 *   npx ts-node scripts/simulate-solana-tx.ts <base64_transaction> [network]
 *
 * Examples:
 *   npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." mainnet
 *   npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." devnet
 *
 * Copy the RAW_SOLANA_TX from server logs and paste it as the first argument.
 */

import 'dotenv/config';

const NETWORKS: Record<string, string> = {
  devnet: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
  mainnet: process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

interface SimulationResult {
  err: unknown;
  logs?: string[];
  unitsConsumed?: number;
  returnData?: unknown;
}

interface RpcResponse {
  error?: { code: number; message: string };
  result?: SimulationResult;
}

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
    const txBuffer = Buffer.from(base64Tx, 'base64');
    console.log(`📦 Transaction size: ${txBuffer.length} bytes\n`);

    // First try WITHOUT signature verification (tests transaction logic)
    console.log('─── Test 1: Without signature verification ───\n');
    const simResponse1 = await fetch(rpcUrl, {
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
            sigVerify: false,
          }
        ]
      })
    });
    const result1: RpcResponse = await simResponse1.json() as RpcResponse;
    if (result1.error) {
      console.log('❌ RPC Error:', JSON.stringify(result1.error, null, 2));
    } else if (result1.result?.err) {
      console.log('❌ Logic FAILED:', JSON.stringify(result1.result.err, null, 2));
    } else {
      console.log('✅ Logic OK (sigVerify=false)\n');
    }

    // Then try WITH signature verification (tests if signatures are valid)
    console.log('─── Test 2: With signature verification ───\n');
    const simResponse2 = await fetch(rpcUrl, {
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
            replaceRecentBlockhash: false,  // Need original blockhash for sig verify
            sigVerify: true,
          }
        ]
      })
    });
    const result2: RpcResponse = await simResponse2.json() as RpcResponse;
    if (result2.error) {
      console.log('❌ RPC Error:', JSON.stringify(result2.error, null, 2));
    } else if (result2.result?.err) {
      console.log('❌ Signature FAILED:', JSON.stringify(result2.result.err, null, 2));
      if (result2.result.logs) {
        console.log('\nLogs:');
        result2.result.logs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`));
      }
    } else {
      console.log('✅ Signature OK (sigVerify=true)\n');
    }

    // Use first result for detailed output
    const result: RpcResponse = result1;

    if (result.error) {
      console.error('❌ RPC Error:', JSON.stringify(result.error, null, 2));
      return;
    }

    if (!result.result) {
      console.error('❌ No result returned from RPC');
      return;
    }

    const simResult: SimulationResult = result.result;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    SIMULATION RESULT');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (simResult.err) {
      console.log('❌ SIMULATION FAILED\n');
      console.log('Error:', JSON.stringify(simResult.err, null, 2));
    } else {
      console.log('✅ SIMULATION SUCCEEDED\n');
    }

    console.log(`Units consumed: ${simResult.unitsConsumed ?? 'N/A'}`);
    console.log(`Return data: ${simResult.returnData ? JSON.stringify(simResult.returnData) : 'N/A'}`);

    if (simResult.logs && simResult.logs.length > 0) {
      console.log('\n───────────────────────────────────────────────────────────');
      console.log('                     PROGRAM LOGS');
      console.log('───────────────────────────────────────────────────────────\n');
      simResult.logs.forEach((log: string, i: number) => {
        if (log.includes('failed') || log.includes('Error') || log.includes('error')) {
          console.log(`  ${i + 1}. ❌ ${log}`);
        } else if (log.includes('success') || log.includes('Success')) {
          console.log(`  ${i + 1}. ✅ ${log}`);
        } else {
          console.log(`  ${i + 1}. ${log}`);
        }
      });
    }

    if (simResult.err && typeof simResult.err === 'object') {
      const errObj = simResult.err as Record<string, unknown>;

      console.log('\n───────────────────────────────────────────────────────────');
      console.log('                   ERROR ANALYSIS');
      console.log('───────────────────────────────────────────────────────────\n');

      if ('InstructionError' in errObj && Array.isArray(errObj.InstructionError)) {
        const [instructionIndex, errorDetail] = errObj.InstructionError;
        console.log(`  Instruction index: ${instructionIndex}`);
        console.log(`  Error type: ${JSON.stringify(errorDetail)}`);

        if (typeof errorDetail === 'object' && errorDetail !== null && 'Custom' in errorDetail) {
          const customErr = errorDetail as { Custom: number };
          console.log(`\n  Custom error code: ${customErr.Custom}`);
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
  network            'devnet' or 'mainnet' (default: mainnet)

Example:
  npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." mainnet
`);
  process.exit(0);
}

const base64Tx = args[0];
const network = args[1] || 'mainnet';

simulateTransaction(base64Tx, network);
