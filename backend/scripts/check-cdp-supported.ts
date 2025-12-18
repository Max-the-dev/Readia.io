#!/usr/bin/env npx ts-node
import 'dotenv/config';
// @ts-ignore
import { generateJwt } from '@coinbase/cdp-sdk/auth';

async function checkSupported() {
  const token = await generateJwt({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    requestMethod: 'GET',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/x402/supported',
    expiresIn: 120,
  });

  const response = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/supported', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
  });

  const data = await response.json() as any;

  // Print raw response
  console.log('CDP /supported response:');
  console.log(JSON.stringify(data, null, 2));
}

checkSupported().catch(console.error);
