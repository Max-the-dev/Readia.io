/* What it does:

1. Takes verified authorization payload
2. Submits it on-chain using platform wallet
3. Returns transaction hash
4. Handles errors (insufficient gas, network issues, etc.)

*/

import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { constrainedMemory } from 'process';
import { PaymentPayload, PaymentRequirements } from 'x402/types';
import { facilitator } from "@coinbase/x402"



interface SettleResponse {
  success: boolean;
  payer: string;
  transaction: string;
  network: string;
  errorReason?: string;
}

export async function settleAuthorization(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<{ txHash: string } | { error: string }> {
  try {
    console.log('🔧 Settling payment via CDP API...');
     console.log('🔧 SETTLEMENT DEBUG:');
    //console.log('📦 Full paymentPayload:', JSON.stringify(paymentPayload, null, 2));
    //console.log('📋 Full paymentRequirements:', JSON.stringify(paymentRequirements, null, 2));
       console.log('\n========== CDP SETTLEMENT REQUEST ==========');
    console.log('🔧 Network:', paymentPayload.network);
    console.log('📋 Scheme:', paymentPayload.scheme);
    
    console.log('\n--- AUTHORIZATION DETAILS ---');
    console.log('From (payer):', paymentPayload.payload.authorization.from);
    console.log('To (recipient):', paymentPayload.payload.authorization.to);
    console.log('Value (micro USDC):', paymentPayload.payload.authorization.value);
    console.log('Nonce:', paymentPayload.payload.authorization.nonce);
    
    console.log('\n--- TIME WINDOW ---');
    const validAfter = parseInt(paymentPayload.payload.authorization.validAfter, 10);
    const validBefore = parseInt(paymentPayload.payload.authorization.validBefore, 10);
    const windowSeconds = validBefore - validAfter;
    const maxTimeout = paymentRequirements.maxTimeoutSeconds || 0;
    const sdkPaddingSeconds = 600; // x402 client backdates validAfter by 10 minutes
    const allowedWindow = maxTimeout + sdkPaddingSeconds;

    console.log('ValidAfter:', validAfter, new Date(validAfter * 1000).toISOString());
    console.log('ValidBefore:', validBefore, new Date(validBefore * 1000).toISOString());
    console.log('Window Duration:', windowSeconds, 'seconds');
    console.log('Allowed Duration (incl. SDK padding):', allowedWindow, 'seconds');
    console.log('❌ VALIDATION:', windowSeconds <= allowedWindow ? '✅ PASS' : '❌ FAIL - Window too long!');
    console.log('\n--- SIGNATURE ---');
    console.log('Signature:', paymentPayload.payload.signature);
    
    console.log('\n--- PAYMENT REQUIREMENTS ---');
    console.log('Max Amount Required:', paymentRequirements.maxAmountRequired);
    console.log('Asset (USDC):', paymentRequirements.asset);
    console.log('PayTo:', paymentRequirements.payTo);
    console.log('Resource:', paymentRequirements.resource);
    /*
    console.log('\n--- FULL PAYLOAD (for manual testing) ---');
    console.log(JSON.stringify({
      x402Version: 1,
      paymentPayload,
      paymentRequirements
    }, null, 2));
    */
    console.log('\n========== CALLING CDP SETTLE ==========\n');
    
    const requestPath = '/platform/v2/x402/settle';
    const requestHost = 'api.cdp.coinbase.com';

    
    // Generate JWT using CDP SDK
    const token = await generateJwt({
      apiKeyId: process.env.CDP_API_KEY_ID!,
      apiKeySecret: process.env.CDP_API_KEY_SECRET!,
      requestMethod: 'POST',
      requestHost,
      requestPath,
      expiresIn: 120
    });
    
    console.log(`Bearer ${token}`);
    // Call CDP settle endpoint directly
    const response = await fetch(`https://${requestHost}${requestPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload,
        paymentRequirements
      })
    });
    
    const result = await response.json() as SettleResponse;
    
    if (response.ok && result.success) {
      console.log('✅ Settlement successful:', result.transaction);
      return { txHash: result.transaction };
    }
    
    console.error('❌ Settlement failed:', result);
    return { error: result.errorReason || 'Settlement failed' };
    
  } catch (error) {
    console.error('❌ Settlement error:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown settlement error' 
    };
  }
}
