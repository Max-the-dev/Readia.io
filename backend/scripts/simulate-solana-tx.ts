#!/usr/bin/env npx ts-node
/**
 * Solana Transaction Simulator + CDP Verify
 *
 * Usage:
 *   npx ts-node scripts/simulate-solana-tx.ts <base64_transaction> [network]
 *   npx ts-node scripts/simulate-solana-tx.ts --cdp <payment_header_base64> <payment_requirement_json>
 *
 * Examples:
 *   npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." mainnet
 *   npx ts-node scripts/simulate-solana-tx.ts --cdp "eyJ4NDAy..." '{"scheme":"exact",...}'
 *
 * Copy the RAW_SOLANA_TX from server logs and paste it as the first argument.
 */

import 'dotenv/config';
// @ts-ignore
import { generateJwt } from '@coinbase/cdp-sdk/auth';

// Simple base58 encoder for Solana addresses
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes: Buffer | Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = '';
  for (const byte of bytes) {
    if (byte === 0) result += '1';
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

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

    // Decode transaction structure to see signatures
    console.log('─── Transaction Structure ───\n');
    const numSignatures = txBuffer[0];
    console.log(`  Number of signatures: ${numSignatures}`);

    for (let i = 0; i < numSignatures; i++) {
      const sigStart = 1 + (i * 64);
      const sigEnd = sigStart + 64;
      const sig = txBuffer.slice(sigStart, sigEnd);
      const isZero = sig.every((b: number) => b === 0);
      console.log(`  Signature ${i}: ${isZero ? '❌ ALL ZEROS (not signed)' : '✅ HAS DATA'}`);
      if (!isZero) {
        console.log(`    First 8 bytes: [${Array.from(sig.slice(0, 8)).join(', ')}]`);
      }
    }

    // Decode message to see required signers
    const messageStart = 1 + (numSignatures * 64);
    const messageBytes = txBuffer.slice(messageStart);

    // Check if versioned (first byte has high bit set)
    const isVersioned = (messageBytes[0] & 0x80) !== 0;
    console.log(`  Transaction type: ${isVersioned ? 'Versioned (v0)' : 'Legacy'}`);

    let headerOffset = isVersioned ? 1 : 0; // Skip version prefix if versioned
    const numRequiredSigs = messageBytes[headerOffset];
    const numReadonlySigned = messageBytes[headerOffset + 1];
    const numReadonlyUnsigned = messageBytes[headerOffset + 2];

    console.log(`  Required signatures: ${numRequiredSigs}`);
    console.log(`  Read-only signed: ${numReadonlySigned}`);
    console.log(`  Read-only unsigned: ${numReadonlyUnsigned}`);

    // Get account keys
    const numAccounts = messageBytes[headerOffset + 3];
    console.log(`  Total accounts: ${numAccounts}`);

    const accountsStart = headerOffset + 4;
    console.log(`\n  Required signer accounts:`);
    for (let i = 0; i < numRequiredSigs && i < numAccounts; i++) {
      const keyStart = accountsStart + (i * 32);
      const keyBytes = messageBytes.slice(keyStart, keyStart + 32);
      const address = base58Encode(keyBytes);
      const sigStatus = i < numSignatures
        ? (txBuffer.slice(1 + i * 64, 1 + i * 64 + 64).every((b: number) => b === 0) ? '❌ NOT SIGNED' : '✅ SIGNED')
        : '⚠️ NO SLOT';
      console.log(`    [${i}] ${address}`);
      console.log(`        Status: ${sigStatus}`);
    }

    console.log('');

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

// CDP Verify function
async function verifyCDP(paymentPayloadB64: string, paymentRequirementJson: string) {
  console.log('\n🔐 Calling CDP Verify Endpoint...\n');

  const CDP_VERIFY_URL = 'https://api.cdp.coinbase.com/platform/v2/x402/verify';

  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
    console.error('❌ Missing CDP_API_KEY_ID or CDP_API_KEY_SECRET in .env');
    return;
  }

  try {
    // Decode the payment payload
    const paymentPayload = JSON.parse(Buffer.from(paymentPayloadB64, 'base64').toString('utf8'));
    const paymentRequirement = JSON.parse(paymentRequirementJson);

    console.log('Payment Payload (decoded):');
    console.log('  x402Version:', paymentPayload.x402Version);
    console.log('  resource:', paymentPayload.resource?.url);
    console.log('  accepted.scheme:', paymentPayload.accepted?.scheme);
    console.log('  accepted.network:', paymentPayload.accepted?.network);
    console.log('  payload keys:', Object.keys(paymentPayload.payload || {}));
    console.log('');

    // Generate JWT for CDP auth
    const token = await generateJwt({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.cdp.coinbase.com',
      requestPath: '/platform/v2/x402/verify',
      expiresIn: 120,
    });

    const requestBody = {
      x402Version: paymentPayload.x402Version,
      paymentPayload,
      paymentRequirements: paymentRequirement,
    };

    console.log('Sending to CDP verify...');
    console.log('Request body keys:', Object.keys(requestBody));
    console.log('');

    const response = await fetch(CDP_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    CDP VERIFY RESPONSE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('');

    // Log all response headers
    console.log('Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');

    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response Body:');
      console.log(JSON.stringify(responseJson, null, 2));
    } catch {
      console.log('Response Body (raw):');
      console.log(responseText);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('CDP verify failed:', error);
  }
}

// Parse CLI args
const args = process.argv.slice(2);

if (args[0] === '--cdp') {
  // CDP verify mode
  if (args.length < 3) {
    console.log(`
CDP Verify Mode

Usage:
  npx ts-node scripts/simulate-solana-tx.ts --cdp <payment_header_base64> <payment_requirement_json>

Get these from server logs:
  - payment_header_base64: The "Encoded x402 v2 payment header" value
  - payment_requirement_json: The paymentRequirement object logged during verify
`);
    process.exit(0);
  }
  verifyCDP(args[1], args[2]);
} else if (args.length === 0) {
  console.log(`
Solana Transaction Simulator

Usage:
  npx ts-node scripts/simulate-solana-tx.ts <base64_transaction> [network]
  npx ts-node scripts/simulate-solana-tx.ts --cdp <payment_header> <requirement_json>

Arguments:
  base64_transaction  The base64-encoded transaction (from RAW_SOLANA_TX log)
  network            'devnet' or 'mainnet' (default: mainnet)

Example:
  npx ts-node scripts/simulate-solana-tx.ts "AgAAAAAAAA..." mainnet
`);
  process.exit(0);
} else {
  const base64Tx = args[0];
  const network = args[1] || 'mainnet';
  simulateTransaction(base64Tx, network);
}
