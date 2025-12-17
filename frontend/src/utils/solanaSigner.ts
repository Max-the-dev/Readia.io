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

  // Get the actual account keys from the transaction message to find correct signature positions
  const messageAccountKeys = getMessageAccountKeys(signedTransaction);

  // DEBUG: Log what we're working with
  console.log('[SolanaSigner] Building signature dictionary:');
  console.log('  signerAddresses:', signerAddresses);
  console.log('  messageAccountKeys:', messageAccountKeys);
  console.log('  signedTransaction signatures count:',
    signedTransaction instanceof VersionedTransaction
      ? signedTransaction.signatures.length
      : signedTransaction.signatures.length
  );

  const entries = signerAddresses.map((address) => {
    // Find the actual position of this signer in the transaction message
    const signerIndex = messageAccountKeys.findIndex(
      (key) => key.toLowerCase() === address.toLowerCase()
    );

    console.log(`  Looking for ${address} → found at index ${signerIndex}`);

    if (signerIndex === -1) {
      console.warn(`[SolanaSigner] Signer ${address} not found in message accounts, trying position 0`);
      // Fallback: if not found, this might be a partial signer scenario
      const signatureBytes = extractSignatureBytes(signedTransaction, 0);
      if (!signatureBytes) {
        throw new Error(`Missing signature for signer ${address}`);
      }
      console.log(`  Extracted signature from position 0:`, signatureBytes.slice(0, 8), '...');
      return [address, signatureBytes] as const;
    }

    const signatureBytes = extractSignatureBytes(signedTransaction, signerIndex);
    if (!signatureBytes) {
      throw new Error(`Missing signature for signer ${address} at index ${signerIndex}`);
    }
    console.log(`  Extracted signature from position ${signerIndex}:`, signatureBytes.slice(0, 8), '...');
    return [address, signatureBytes] as const;
  });

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
