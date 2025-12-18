import type { Transaction as KitTransaction } from '@solana/transactions';
import type { TransactionSigner } from '@solana/kit';
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

export function createSolanaTransactionSigner(
  provider?: SolanaWalletProvider | null
): TransactionSigner | undefined {
  if (!provider) {
    // console.warn('[SolanaSigner] No provider received');
    return undefined;
  }

  // console.log('[SolanaSigner] Provider keys:', Object.keys(provider));

  if (typeof (provider as TransactionSigner).signTransactions === 'function') {
    return provider as TransactionSigner;
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
    async signTransactions(transactions) {
      if (!transactions.length) {
        return [];
      }

      const deserialized = transactions.map(deserializeTransaction);

      const signedTransactions = provider.signAllTransactions
        ? await provider.signAllTransactions([...deserialized])
        : await Promise.all(deserialized.map((tx) => provider.signTransaction!(tx)));

      return signedTransactions.map((signedTx, index) =>
        buildSignatureDictionary(transactions[index], signedTx)
      );
    },
  };
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

function buildSignatureDictionary(
  transaction: KitTransaction,
  signedTransaction: Web3Transaction
): SignatureDictionary {
  const signerAddresses = Object.keys(transaction.signatures) as Address<string>[];
  const messageAccountKeys = getMessageAccountKeys(signedTransaction);
  const entries: [Address<string>, Uint8Array][] = [];

  // VERBOSE DEBUG LOGGING
  console.log('[SolanaSigner] ====== SIGNATURE DICTIONARY BUILD ======');
  console.log('[SolanaSigner] Original transaction.signatures keys:', signerAddresses);
  console.log('[SolanaSigner] Message account keys (full):');
  messageAccountKeys.forEach((key, i) => {
    console.log(`    [${i}] ${key}`);
  });

  // Log raw transaction bytes to compare with backend
  if (signedTransaction instanceof VersionedTransaction) {
    const serialized = signedTransaction.serialize();
    console.log('[SolanaSigner] Raw TX base64 (first 200 chars):', Buffer.from(serialized).toString('base64').slice(0, 200));
  }

  // Get number of signatures in signed transaction
  const numSignatures = signedTransaction instanceof VersionedTransaction
    ? signedTransaction.signatures.length
    : signedTransaction.signatures.length;
  console.log(`[SolanaSigner] Signed transaction has ${numSignatures} signature slots`);

  for (const address of signerAddresses) {
    console.log(`[SolanaSigner] Processing signer address: ${address}`);

    const signerIndex = messageAccountKeys.findIndex(
      (key) => key.toLowerCase() === address.toLowerCase()
    );
    console.log(`    Found at account index: ${signerIndex} (using toLowerCase comparison)`);

    // Also check exact match
    const exactIndex = messageAccountKeys.findIndex((key) => key === address);
    if (exactIndex !== signerIndex) {
      console.log(`    WARNING: Exact match index: ${exactIndex} differs from toLowerCase match!`);
    }

    if (signerIndex === -1) {
      console.log(`    SKIPPED: Address not found in message account keys`);
      continue;
    }

    const signatureBytes = extractSignatureBytes(signedTransaction, signerIndex);
    console.log(`    Extracted signature at index ${signerIndex}: ${signatureBytes ? 'found' : 'null'}`);

    if (!signatureBytes) {
      console.log(`    SKIPPED: No signature bytes at index ${signerIndex}`);
      continue;
    }

    // Skip empty signatures (fee payer slot)
    const isEmpty = signatureBytes.every((byte) => byte === 0);
    console.log(`    Signature empty? ${isEmpty}`);

    if (isEmpty) {
      console.log(`    SKIPPED: Empty signature (fee payer slot)`);
      continue;
    }

    console.log(`    ADDED: ${address} -> signature[0..8]: ${Array.from(signatureBytes.slice(0, 8)).join(',')}`);
    entries.push([address as Address<string>, signatureBytes]);
  }

  console.log(`[SolanaSigner] Final SignatureDictionary has ${entries.length} entries:`);
  entries.forEach(([addr, sig]) => {
    console.log(`    ${addr} -> ${sig.length} bytes`);
  });
  console.log('[SolanaSigner] ====== END SIGNATURE BUILD ======');

  return Object.freeze(Object.fromEntries(entries));
}

function getMessageAccountKeys(transaction: Web3Transaction): string[] {
  if (transaction instanceof VersionedTransaction) {
    return transaction.message.staticAccountKeys.map((key) => key.toBase58());
  }
  // LegacyTransaction
  return transaction.message.accountKeys.map((key) => key.toBase58());
}

function extractSignatureBytes(transaction: Web3Transaction, index: number): Uint8Array | null {
  if (transaction instanceof VersionedTransaction) {
    const signature = transaction.signatures[index];
    return signature ? new Uint8Array(signature) : null;
  }

  const entry = transaction.signatures[index];
  if (!entry || !entry.signature) {
    return null;
  }

  return new Uint8Array(entry.signature);
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
