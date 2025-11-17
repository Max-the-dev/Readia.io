import { SiweMessage } from 'siwe';
import { Wallet } from 'ethers';

const API_URL = 'http://localhost:3001';
const NETWORK = 'base'; // change to solana/solana-devnet if testing Solana

type ApiResponse<T> = { success: boolean; data: T; error?: string };

async function main() {
  const pk = process.env.TEST_PRIVATE_KEY;
  if (!pk) throw new Error('TEST_PRIVATE_KEY missing');

  const wallet = new Wallet(pk);
  console.log(`Using wallet: ${wallet.address}`);

  // 1) Request nonce
  const nonceRes = await fetch(`${API_URL}/api/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet.address, network: NETWORK }),
  });

  const noncePayload = (await nonceRes.json()) as ApiResponse<{
    nonce: string;
    network: string;
    domain: string;
    uri: string;
    expiresAt: string;
  }>;

  if (!noncePayload.success) {
    throw new Error(`Nonce failed: ${JSON.stringify(noncePayload)}`);
  }
  const nonceData = noncePayload.data;

  console.log('Received nonce:', nonceData.nonce);

  // 2) Build SIWE message
  const siweMessage = new SiweMessage({
    domain: nonceData.domain,
    address: wallet.address,
    statement: 'Sign in to Penny.io',
    uri: nonceData.uri,
    version: '1',
    chainId: 84532, // Base Sepolia; use 8453 for Base mainnet
    nonce: nonceData.nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
  const message = siweMessage.prepareMessage();

  // 3) Sign
  const signature = await wallet.signMessage(message);
  console.log('Signature generated');

  // 4) Verify
  const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature, nonce: nonceData.nonce }),
  });

  const verifyPayload = (await verifyRes.json()) as ApiResponse<{
    token: string;
    session: {
      id: string;
      walletAddress: string;
      authorUuid: string;
      network: string;
      expiresAt: string;
    };
  }>;

  if (!verifyPayload.success) {
    throw new Error(`Verify failed: ${JSON.stringify(verifyPayload)}`);
  }

  console.log('Verify response:', verifyPayload.data);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
