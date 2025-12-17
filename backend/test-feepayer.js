require('dotenv').config();
const { generateJwt } = require('@coinbase/cdp-sdk/auth');

async function testFeePayerEndpoint() {
  console.log('=== Testing CDP /supported endpoint ===\n');

  const host = 'api.cdp.coinbase.com';
  const path = '/platform/v2/x402/supported';

  console.log('Endpoint:', `https://${host}${path}`);
  console.log('API Key ID:', process.env.CDP_API_KEY_ID?.slice(0, 10) + '...');

  const token = await generateJwt({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    requestMethod: 'GET',
    requestHost: host,
    requestPath: path,
    expiresIn: 120,
  });

  const res = await fetch(`https://${host}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('\nResponse status:', res.status);

  const data = await res.json();

  console.log('\n=== Full Response ===');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n=== Summary ===');
  console.log('kinds format:', Array.isArray(data.kinds) ? 'ARRAY (v1 style)' : 'OBJECT (v2 style)');

  if (data.signers) {
    console.log('signers.solana:*:', data.signers['solana:*']);
  }

  // Find Solana fee payers
  const solanaKinds = Array.isArray(data.kinds)
    ? data.kinds.filter(k => k.network?.startsWith('solana:'))
    : [];

  console.log('\nSolana fee payers found:');
  solanaKinds.forEach(k => {
    console.log(`  ${k.network}: ${k.extra?.feePayer || 'NO FEE PAYER'}`);
  });
}

testFeePayerEndpoint().catch(console.error);
