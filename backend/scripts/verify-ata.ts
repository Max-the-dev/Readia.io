import { PublicKey } from '@solana/web3.js';

// Manual ATA derivation - same as getAssociatedTokenAddressSync
function getATA(mint: PublicKey, owner: PublicKey): PublicKey {
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

// From mainnet logs
const PAYER = new PublicKey('cAXdcMFHK6y9yTP7AMETzXC7zvTeDBbQ5f4nvSWDx51');
const RECIPIENT = new PublicKey('2hJFxyn5rJdyReLMSm1yo2uJAMQEuXUrLM6aDWCGFHuQ');
const MAINNET_USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// From decode-accounts.ts output for mainnet tx
const TX_ACCOUNT_2 = '82UCWj35ou7iLSchsy81inLM42ZBbQ1Fv2m8o1ED1GUm';
const TX_ACCOUNT_3 = 'FhPAKogG9i8i6RGKrh1PbrhmnKQdpEL33asgfaZsQuD7';

// Derive expected ATAs
const expectedPayerATA = getATA(MAINNET_USDC, PAYER);
const expectedRecipientATA = getATA(MAINNET_USDC, RECIPIENT);

console.log('=== MAINNET ATA VERIFICATION ===\n');
console.log('Expected Payer ATA:    ', expectedPayerATA.toBase58());
console.log('Expected Recipient ATA:', expectedRecipientATA.toBase58());
console.log('');
console.log('TX Account [2]:        ', TX_ACCOUNT_2);
console.log('TX Account [3]:        ', TX_ACCOUNT_3);
console.log('');

const payerMatch = expectedPayerATA.toBase58() === TX_ACCOUNT_2 || expectedPayerATA.toBase58() === TX_ACCOUNT_3;
const recipientMatch = expectedRecipientATA.toBase58() === TX_ACCOUNT_2 || expectedRecipientATA.toBase58() === TX_ACCOUNT_3;

console.log('Payer ATA in TX?:      ', payerMatch ? '✅ YES' : '❌ NO');
console.log('Recipient ATA in TX?:  ', recipientMatch ? '✅ YES' : '❌ NO');

if (!payerMatch || !recipientMatch) {
  console.log('\n⚠️  MISMATCH DETECTED - ATAs in transaction do not match expected!');
}
