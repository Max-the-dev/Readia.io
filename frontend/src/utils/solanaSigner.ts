import type { Transaction as KitTransaction } from '@solana/transactions';
import type { TransactionSigner, TransactionModifyingSigner } from '@solana/kit';
import type { SignatureDictionary } from '@solana/signers';
import type { Address } from '@solana/addresses';
import {
  VersionedTransaction,
  Transaction as LegacyTransaction,
  VersionedMessage,
  Message,
} from '@solana/web3.js';

type SolanaWalletProvider = {
  publicKey?: { toBase58(): string } | { toString(): string } | string | null;
  address?: string;
  accounts?: Array<{ address?: string; publicKey?: { toBase58(): string } | string | null }>;
  signTransaction?: (
    transaction: VersionedTransaction | LegacyTransaction
  ) => Promise<VersionedTransaction | LegacyTransaction>;
  signAllTransactions?: (
    transactions: (VersionedTransaction | LegacyTransaction)[]
  ) => Promise<(VersionedTransaction | LegacyTransaction)[]>;
};

type Web3Transaction = VersionedTransaction | LegacyTransaction;

/**
 * Creates a Solana TransactionModifyingSigner from a wallet provider.
 *
 * IMPORTANT: We use TransactionModifyingSigner instead of TransactionPartialSigner because
 * Phantom wallet on mainnet injects the Lighthouse program into transactions, modifying them.
 * A partial signer only returns signatures, but the SDK then applies those signatures to the
 * ORIGINAL transaction (without Lighthouse). This causes signature mismatch errors.
 *
 * With TransactionModifyingSigner, we return the FULL transaction from the wallet (including
 * any modifications like Lighthouse), ensuring the signature matches the actual message bytes.
 */
export function createSolanaTransactionSigner(
  provider?: SolanaWalletProvider | null
): TransactionModifyingSigner | undefined {
  if (!provider) {
    return undefined;
  }

  // If provider already implements the right interface, use it directly
  if (typeof (provider as TransactionModifyingSigner).modifyAndSignTransactions === 'function') {
    return provider as TransactionModifyingSigner;
  }

  if (typeof provider.signTransaction !== 'function') {
    return undefined;
  }

  const address = extractAddress(provider);
  if (!address) {
    return undefined;
  }

  return {
    address: address as Address<string>,
    /**
     * TransactionModifyingSigner interface: returns full transactions (not just signatures).
     * This allows us to return Phantom's modified transaction with Lighthouse program injected.
     */
    async modifyAndSignTransactions<T extends KitTransaction>(transactions: readonly T[]): Promise<T[]> {
      if (!transactions.length) {
        return [];
      }

      console.log('[SolanaSigner] ====== MODIFY AND SIGN TRANSACTIONS ======');
      console.log(`[SolanaSigner] Processing ${transactions.length} transaction(s)`);

      // Deserialize SDK transactions to web3.js format for wallet signing
      const deserialized = transactions.map(deserializeTransaction);

      // Log original transaction structure
      if (deserialized[0] instanceof VersionedTransaction) {
        const original = deserialized[0];
        console.log('[SolanaSigner] Original TX (before wallet):', {
          numAccounts: original.message.staticAccountKeys.length,
          headerPrefix: Array.from(original.serialize().slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join('')
        });
      }

      // Pass to wallet for signing (wallet may modify transaction on mainnet)
      const signedTransactions = provider.signAllTransactions
        ? await provider.signAllTransactions([...deserialized])
        : await Promise.all(deserialized.map((tx) => provider.signTransaction!(tx)));

      // Log what wallet returned (may have modifications like Lighthouse)
      if (signedTransactions[0] instanceof VersionedTransaction) {
        const signed = signedTransactions[0] as VersionedTransaction;
        console.log('[SolanaSigner] Signed TX (from wallet):', {
          numAccounts: signed.message.staticAccountKeys.length,
          headerPrefix: Array.from(signed.serialize().slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join('')
        });
      }

      // Convert wallet's signed transactions back to SDK format
      // This preserves any modifications the wallet made (e.g., Lighthouse on mainnet)
      const result = signedTransactions.map((signedTx, index) => {
        return rebuildKitTransaction(transactions[index], signedTx);
      });

      console.log('[SolanaSigner] ====== END MODIFY AND SIGN ======');

      return result as T[];
    },
  };
}

/**
 * Rebuilds a KitTransaction from a signed web3.js transaction.
 * This captures both the (potentially modified) message bytes AND the signatures.
 */
function rebuildKitTransaction<T extends KitTransaction>(
  originalTx: T,
  signedTx: Web3Transaction
): T {
  let messageBytes: Uint8Array;
  const signatures: Record<string, Uint8Array> = {};

  if (signedTx instanceof VersionedTransaction) {
    // Get the message bytes from the signed transaction (includes any modifications)
    messageBytes = signedTx.message.serialize();

    // Extract signatures paired with account keys
    const accountKeys = signedTx.message.staticAccountKeys;
    signedTx.signatures.forEach((sig, index) => {
      if (sig && index < accountKeys.length) {
        const sigBytes = new Uint8Array(sig);
        // Only include non-empty signatures (skip fee payer slot which CDP fills)
        if (!sigBytes.every(b => b === 0)) {
          const addr = accountKeys[index].toBase58();
          signatures[addr] = sigBytes;
          console.log(`[SolanaSigner] Captured signature for ${addr}`);
        }
      }
    });
  } else {
    // Legacy transaction
    messageBytes = signedTx.serializeMessage();

    const accountKeys = signedTx.message.accountKeys;
    signedTx.signatures.forEach((entry, index) => {
      if (entry?.signature && index < accountKeys.length) {
        const sigBytes = new Uint8Array(entry.signature);
        if (!sigBytes.every(b => b === 0)) {
          const addr = accountKeys[index].toBase58();
          signatures[addr] = sigBytes;
          console.log(`[SolanaSigner] Captured signature for ${addr}`);
        }
      }
    });
  }

  // Return a new transaction object with the wallet's message bytes and signatures
  // This ensures the signature matches the actual message (including Lighthouse if added)
  const rebuilt = {
    ...originalTx,
    messageBytes: messageBytes,
    signatures: Object.freeze(signatures) as SignatureDictionary,
  } as T;

  console.log('[SolanaSigner] Rebuilt transaction:', {
    messageBytesLength: messageBytes.length,
    numSignatures: Object.keys(signatures).length
  });

  return rebuilt;
}

function extractAddress(provider: SolanaWalletProvider): string | undefined {
  const possibleKeys = [
    provider.publicKey,
    provider.address,
    provider.accounts?.[0]?.address,
    provider.accounts?.[0]?.publicKey,
  ];

  for (const key of possibleKeys) {
    if (!key) continue;
    if (typeof key === 'string') {
      return key;
    }
    if (typeof key === 'object' && 'toBase58' in key && typeof key.toBase58 === 'function') {
      return key.toBase58();
    }
    if (typeof key === 'object' && 'toString' in key && typeof key.toString === 'function') {
      return key.toString();
    }
  }

  return undefined;
}

function deserializeTransaction(transaction: KitTransaction): Web3Transaction {
  const messageBytes = toUint8Array(transaction.messageBytes);
  const isVersioned = (messageBytes[0] & 0x80) !== 0;

  if (isVersioned) {
    const message = VersionedMessage.deserialize(messageBytes);
    return new VersionedTransaction(message);
  }

  const legacyMessage = Message.from(messageBytes);
  const legacyTx = LegacyTransaction.populate(legacyMessage, []);
  return legacyTx;
}

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value as number[]);
  }
  if (typeof value === 'string') {
    try {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      throw new Error('Invalid base64 string for transaction bytes');
    }
  }
  throw new Error('Unsupported transaction bytes format');
}
