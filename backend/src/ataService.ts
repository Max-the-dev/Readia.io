import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  SystemProgram,
} from '@solana/web3.js';
import { pgPool } from './supabaseClient';
import { SupportedAuthorNetwork } from './types';

// Program IDs
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Solana mainnet only - devnet doesn't need ATAs
const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// USDC mint address (mainnet only)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// RPC endpoint (mainnet only)
const RPC_ENDPOINT = process.env.SOLANA_MAINNET_RPC || clusterApiUrl('mainnet-beta');

type TriggerSource = 'auth' | 'secondary_wallet' | 'backfill';

interface AtaCreationResult {
  success: boolean;
  ataAddress?: string;
  txSignature?: string;
  alreadyExists?: boolean;
  error?: string;
}

interface AtaCreationLog {
  walletAddress: string;
  ataAddress: string;
  network: SupportedAuthorNetwork;
  mintAddress: string;
  txSignature: string;
  feePayer: string;
  feeLamports: number;
  triggerSource: TriggerSource;
}

// Base58 alphabet for decoding
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(input: string): Uint8Array {
  const bytes: number[] = [];

  // Count leading '1's (zeros in base58)
  let leadingZeros = 0;
  for (const char of input) {
    if (char === '1') leadingZeros++;
    else break;
  }

  // Convert base58 to big integer
  let num = BigInt(0);
  for (const char of input) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * BigInt(58) + BigInt(index);
  }

  // Convert big integer to bytes
  let hex = num.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }

  // Add leading zeros back
  for (let i = 0; i < leadingZeros; i++) {
    bytes.unshift(0);
  }

  return Uint8Array.from(bytes);
}

function getFeePayer(): Keypair {
  const privateKeyBase58 = process.env.UTILITY_WALLET_PRIVATE_KEY;
  if (!privateKeyBase58) {
    throw new Error('UTILITY_WALLET_PRIVATE_KEY environment variable is required for ATA creation');
  }

  try {
    const privateKeyBytes = decodeBase58(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error('Invalid UTILITY_WALLET_PRIVATE_KEY format - must be base58 encoded');
  }
}

function isSolanaMainnet(network: string): boolean {
  return network === SOLANA_MAINNET;
}

function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, 'confirmed');
}

// Derive ATA address (same as getAssociatedTokenAddressSync)
function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

// Create the instruction to create an ATA (same as createAssociatedTokenAccountInstruction)
function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0), // No data needed for create ATA instruction
  });
}

async function logAtaCreation(log: AtaCreationLog): Promise<void> {
  try {
    await pgPool.query(
      `INSERT INTO ata_creations
       (wallet_address, ata_address, network, mint_address, tx_signature, fee_payer, fee_lamports, trigger_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (wallet_address, network, mint_address) DO NOTHING`,
      [
        log.walletAddress,
        log.ataAddress,
        log.network,
        log.mintAddress,
        log.txSignature,
        log.feePayer,
        log.feeLamports,
        log.triggerSource,
      ]
    );
  } catch (error) {
    console.error('[ataService] Failed to log ATA creation:', error);
    // Don't throw - logging failure shouldn't fail the operation
  }
}

async function checkAtaExists(
  connection: Connection,
  ataAddress: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(ataAddress);
    return accountInfo !== null;
  } catch (error) {
    console.error('[ataService] Error checking ATA existence:', error);
    return false;
  }
}

async function createAta(
  connection: Connection,
  feePayer: Keypair,
  walletAddress: PublicKey,
  mint: PublicKey
): Promise<{ ataAddress: PublicKey; txSignature: string; feeLamports: number }> {
  const ataAddress = getAssociatedTokenAddress(mint, walletAddress);

  const instruction = createAssociatedTokenAccountInstruction(
    feePayer.publicKey,
    ataAddress,
    walletAddress,
    mint
  );

  const transaction = new Transaction().add(instruction);

  // Get fee estimate before sending
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer.publicKey;

  const feeEstimate = await connection.getFeeForMessage(
    transaction.compileMessage(),
    'confirmed'
  );
  const feeLamports = feeEstimate.value || 5000; // fallback to 5000 lamports

  const txSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [feePayer],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  return { ataAddress, txSignature, feeLamports };
}

export async function ensureSolanaUsdcAta(
  walletAddress: string,
  network: SupportedAuthorNetwork,
  triggerSource: TriggerSource
): Promise<AtaCreationResult> {
  // Only process Solana mainnet - skip devnet and other networks
  if (!isSolanaMainnet(network)) {
    return { success: true, alreadyExists: true };
  }

  // Check if fee payer is configured
  if (!process.env.UTILITY_WALLET_PRIVATE_KEY) {
    console.warn('[ataService] UTILITY_WALLET_PRIVATE_KEY not configured - skipping ATA creation');
    return { success: false, error: 'Fee payer not configured' };
  }

  try {
    const connection = getConnection();
    const walletPubkey = new PublicKey(walletAddress);
    const ataAddress = getAssociatedTokenAddress(USDC_MINT, walletPubkey);

    // Check if ATA already exists
    const exists = await checkAtaExists(connection, ataAddress);
    if (exists) {
      console.log(`[ataService] ATA already exists for ${walletAddress} on ${network}`);
      return {
        success: true,
        ataAddress: ataAddress.toBase58(),
        alreadyExists: true,
      };
    }

    // Create the ATA
    console.log(`[ataService] Creating ATA for ${walletAddress} on Solana mainnet`);
    const feePayer = getFeePayer();

    const { ataAddress: newAtaAddress, txSignature, feeLamports } = await createAta(
      connection,
      feePayer,
      walletPubkey,
      USDC_MINT
    );

    // Log the creation to database
    await logAtaCreation({
      walletAddress,
      ataAddress: newAtaAddress.toBase58(),
      network,
      mintAddress: USDC_MINT.toBase58(),
      txSignature,
      feePayer: feePayer.publicKey.toBase58(),
      feeLamports,
      triggerSource,
    });

    // Backend console log
    console.log('[ataService] ✅ ATA Created:');
    console.log(`  Wallet:    ${walletAddress}`);
    console.log(`  ATA:       ${newAtaAddress.toBase58()}`);
    console.log(`  Network:   Solana Mainnet`);
    console.log(`  Mint:      ${USDC_MINT.toBase58()}`);
    console.log(`  TX:        ${txSignature}`);
    console.log(`  Fee:       ${feeLamports} lamports`);
    console.log(`  Trigger:   ${triggerSource}`);

    return {
      success: true,
      ataAddress: newAtaAddress.toBase58(),
      txSignature,
      alreadyExists: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ataService] Failed to ensure ATA for ${walletAddress} on ${network}:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

