/**
 * Test script to verify x402 Solana mainnet TIP flow using private keys.
 * This bypasses browser wallets (Phantom) to isolate if the issue is wallet-side.
 * Uses tip endpoint (repeatable) instead of purchase (one-time).
 *
 * Usage:
 *   npx ts-node scripts/test-x402-purchase.ts
 *
 * Required environment variables:
 *   SVM_PRIVATE_KEY - Base58 encoded Solana private key (64 bytes)
 */

import { config } from "dotenv";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { Keypair } from "@solana/web3.js";

config();

// Use web3.js Keypair for base58 decoding (CommonJS compatible)
function decodeBase58PrivateKey(base58Key: string): Uint8Array {
  // Keypair.fromSecretKey expects 64 bytes, so we can use it to validate
  // and convert the key. The secretKey getter returns the same bytes.
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(Buffer.from(base58Key, 'base64').length === 64
      ? Buffer.from(base58Key, 'base64')
      : (() => {
          // Decode base58 manually using Keypair
          const decoded: number[] = [];
          const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
          let num = BigInt(0);
          for (const char of base58Key) {
            const index = alphabet.indexOf(char);
            if (index === -1) throw new Error(`Invalid base58 character: ${char}`);
            num = num * BigInt(58) + BigInt(index);
          }
          let hex = num.toString(16);
          if (hex.length % 2) hex = '0' + hex;
          for (let i = 0; i < hex.length; i += 2) {
            decoded.push(parseInt(hex.slice(i, i + 2), 16));
          }
          // Handle leading zeros
          for (const char of base58Key) {
            if (char === '1') decoded.unshift(0);
            else break;
          }
          return decoded;
        })()
    )
  );
  return keypair.secretKey;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const svmPrivateKey = process.env.SVM_PRIVATE_KEY as string;

// Using staging API with full CAIP-2 network identifier
// TIP endpoint - can be called multiple times (unlike purchase which is one-time)
const TIP_URL = "https://api-staging.readia.io/api/articles/264/tip?network=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

// ============================================================================
// HELPERS
// ============================================================================

function logStep(step: number, title: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`STEP ${step}: ${title}`);
  console.log("=".repeat(70));
}

function logDetail(label: string, value: any) {
  if (typeof value === "object") {
    console.log(`\n${label}:`);
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(`${label}: ${value}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log("\n" + "█".repeat(70));
  console.log("  X402 SOLANA MAINNET TIP TEST (Private Key Signer)");
  console.log("█".repeat(70));

  // -------------------------------------------------------------------------
  // STEP 1: Validate environment
  // -------------------------------------------------------------------------
  logStep(1, "VALIDATE ENVIRONMENT");

  if (!svmPrivateKey) {
    console.error("❌ Missing SVM_PRIVATE_KEY environment variable");
    console.error("   Export your Solana private key (base58 encoded, 64 bytes)");
    process.exit(1);
  }
  console.log("✅ SVM_PRIVATE_KEY is set");
  logDetail("Target URL", TIP_URL);

  // -------------------------------------------------------------------------
  // STEP 2: Create keypair signer
  // -------------------------------------------------------------------------
  logStep(2, "CREATE KEYPAIR SIGNER");

  let svmSigner;
  try {
    const keyBytes = decodeBase58PrivateKey(svmPrivateKey);
    console.log(`Key bytes length: ${keyBytes.length} (expected: 64)`);

    svmSigner = await createKeyPairSignerFromBytes(keyBytes);
    console.log(`✅ Signer created successfully`);
    logDetail("Signer address", svmSigner.address);
  } catch (error: any) {
    console.error("❌ Failed to create signer:", error.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // STEP 3: Create x402 client and register SVM scheme
  // -------------------------------------------------------------------------
  logStep(3, "CREATE X402 CLIENT");

  const client = new x402Client();
  registerExactSvmScheme(client, { signer: svmSigner });
  console.log("✅ x402Client created");
  console.log("✅ ExactSvmScheme registered for solana:*");

  const httpClient = new x402HTTPClient(client);

  // -------------------------------------------------------------------------
  // STEP 4: Make initial request (expect 402)
  // -------------------------------------------------------------------------
  logStep(4, "INITIAL REQUEST (Expecting 402)");

  const tipAmount = 0.01; // $0.01 tip
  let paymentRequired: any;

  try {
    console.log(`\nPOST ${TIP_URL}`);
    console.log(`Tip amount: $${tipAmount}`);

    const initialResponse = await fetch(TIP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: tipAmount }),
    });

    logDetail("Response status", initialResponse.status);
    logDetail("Response statusText", initialResponse.statusText);

    if (initialResponse.status !== 402) {
      const body = await initialResponse.json();
      console.log("\n⚠️  Did not receive 402 Payment Required");
      logDetail("Response body", body);
      process.exit(1);
    }

    console.log("✅ Received 402 Payment Required");

    // Parse the 402 response
    const responseBody = await initialResponse.json();
    logDetail("402 Response Body", responseBody);

    // Extract payment required using SDK helper
    paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => initialResponse.headers.get(name),
      responseBody
    );
    logDetail("Parsed PaymentRequired", paymentRequired);

  } catch (error: any) {
    console.error("❌ Initial request failed:", error.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // STEP 5: Create payment payload
  // -------------------------------------------------------------------------
  logStep(5, "CREATE PAYMENT PAYLOAD");

  let paymentPayload: any;

  try {
    console.log("Creating payment payload from requirements...");
    console.log("(This is where the SDK builds and signs the Solana transaction)");

    paymentPayload = await client.createPaymentPayload(paymentRequired);

    console.log("✅ Payment payload created");
    logDetail("Payment Payload", {
      x402Version: paymentPayload.x402Version,
      hasPayload: !!paymentPayload.payload,
      payloadKeys: paymentPayload.payload ? Object.keys(paymentPayload.payload) : [],
      // Show first 100 chars of transaction if present
      transactionPreview: paymentPayload.payload?.transaction
        ? paymentPayload.payload.transaction.substring(0, 100) + "..."
        : "N/A"
    });

  } catch (error: any) {
    console.error("❌ Failed to create payment payload:", error.message);
    if (error.cause) {
      console.error("   Cause:", error.cause);
    }
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // STEP 6: Encode payment header
  // -------------------------------------------------------------------------
  logStep(6, "ENCODE PAYMENT HEADER");

  let paymentHeaders: Record<string, string>;

  try {
    paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
    console.log("✅ Payment header encoded");
    logDetail("Header name", Object.keys(paymentHeaders)[0]);
    logDetail("Header value (first 100 chars)",
      Object.values(paymentHeaders)[0].substring(0, 100) + "...");

  } catch (error: any) {
    console.error("❌ Failed to encode payment header:", error.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // STEP 7: Make payment request
  // -------------------------------------------------------------------------
  logStep(7, "PAYMENT REQUEST (With signature)");

  try {
    console.log(`\nPOST ${TIP_URL}`);
    console.log("Headers: Content-Type, PAYMENT-SIGNATURE");

    const paymentResponse = await fetch(TIP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...paymentHeaders,
      },
      body: JSON.stringify({ amount: tipAmount }),
    });

    logDetail("Response status", paymentResponse.status);
    logDetail("Response statusText", paymentResponse.statusText);

    // Log all response headers
    console.log("\nResponse headers:");
    paymentResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value.substring(0, 80)}${value.length > 80 ? "..." : ""}`);
    });

    const responseBody = await paymentResponse.json() as { success?: boolean; error?: string; details?: unknown };
    logDetail("Response body", responseBody);

    // -------------------------------------------------------------------------
    // STEP 8: Evaluate result
    // -------------------------------------------------------------------------
    logStep(8, "RESULT");

    if (paymentResponse.ok && responseBody.success) {
      console.log("🎉 SUCCESS! Payment completed.");

      // Try to parse settlement response
      try {
        const settleResponse = httpClient.getPaymentSettleResponse(
          (name) => paymentResponse.headers.get(name)
        );
        logDetail("Settlement response", settleResponse);
      } catch (e) {
        console.log("(No settlement header parsed)");
      }
    } else {
      console.log("❌ FAILED");
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Error: ${responseBody.error || "Unknown error"}`);

      if (responseBody.details) {
        logDetail("Error details", responseBody.details);
      }
    }

  } catch (error: any) {
    console.error("❌ Payment request failed:", error.message);
    process.exit(1);
  }

  console.log("\n" + "█".repeat(70));
  console.log("  TEST COMPLETE");
  console.log("█".repeat(70) + "\n");
}

main().catch((error) => {
  console.error("\nUnhandled error:", error);
  process.exit(1);
});
