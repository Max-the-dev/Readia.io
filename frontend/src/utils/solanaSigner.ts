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
    return undefined;
  }

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

      // Log BEFORE signing - this is what SDK built (should match test script: 7 accounts, 3 instructions)
      console.log('\n🔍 SOLANA TRANSACTION DEBUG - BEFORE PHANTOM SIGNING');
      deserialized.forEach((tx, i) => {
        logTransactionDetails(`Transaction ${i} - BEFORE Phantom`, tx);
      });

      const signedTransactions = provider.signAllTransactions
        ? await provider.signAllTransactions([...deserialized])
        : await Promise.all(deserialized.map((tx) => provider.signTransaction!(tx)));

      // Log AFTER signing - this is what Phantom returns (may have Lighthouse: 8 accounts, 4 instructions)
      console.log('\n🔍 SOLANA TRANSACTION DEBUG - AFTER PHANTOM SIGNING');
      signedTransactions.forEach((tx, i) => {
        logTransactionDetails(`Transaction ${i} - AFTER Phantom`, tx);
      });

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
  const result: Record<string, Uint8Array> = {};

  for (const address of signerAddresses) {
    const signerIndex = messageAccountKeys.findIndex(
      (key) => key === address
    );

    if (signerIndex === -1) {
      continue;
    }

    const signatureBytes = extractSignatureBytes(signedTransaction, signerIndex);

    if (!signatureBytes) {
      continue;
    }

    // Skip empty signatures (fee payer slot)
    const isEmpty = signatureBytes.every((byte) => byte === 0);
    if (isEmpty) {
      continue;
    }

    result[address] = signatureBytes;
  }

  return Object.freeze(result) as SignatureDictionary;
}

function getMessageAccountKeys(transaction: Web3Transaction): string[] {
  if (transaction instanceof VersionedTransaction) {
    return transaction.message.staticAccountKeys.map((key) => key.toBase58());
  }
  const legacyTx = transaction as LegacyTransaction;
  return legacyTx.message.accountKeys.map((key: { toBase58(): string }) => key.toBase58());
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

/**
 * Debug function to log transaction structure for comparison with test script.
 * Test script produces: 7 accounts, 3 instructions (2 ComputeBudget + 1 TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
 * Phantom may add Lighthouse: 8 accounts, 4 instructions
 */
function logTransactionDetails(label: string, transaction: Web3Transaction): void {
  console.log(`\n📋 ${label}`);
  console.log('='.repeat(60));

  if (transaction instanceof VersionedTransaction) {
    // Signatures
    console.log(`\nSignatures: ${transaction.signatures.length}`);
    transaction.signatures.forEach((sig, i) => {
      const isEmpty = sig.every((b) => b === 0);
      const preview = isEmpty ? '(empty - fee payer slot)' : btoa(String.fromCharCode(...sig.slice(0, 16))) + '...';
      console.log(`  [${i}] ${preview}`);
    });

    // Accounts
    const accountKeys = transaction.message.staticAccountKeys;
    console.log(`\nAccounts: ${accountKeys.length}`);
    accountKeys.forEach((key, i) => {
      console.log(`  [${i}] ${key.toBase58()}`);
    });

    // Instructions
    const instructions = transaction.message.compiledInstructions;
    console.log(`\nInstructions: ${instructions.length}`);
    instructions.forEach((ix, i) => {
      const programId = accountKeys[ix.programIdIndex];
      console.log(`  [${i}] Program: ${programId.toBase58()}`);
      console.log(`      Account indices: [${ix.accountKeyIndexes.join(', ')}]`);
      console.log(`      Data length: ${ix.data.length} bytes`);
    });
  } else {
    // Legacy transaction
    const legacyTx = transaction as LegacyTransaction;
    const accountKeys = legacyTx.message.accountKeys;
    console.log(`\nAccounts: ${accountKeys.length}`);
    accountKeys.forEach((key: { toBase58(): string }, i: number) => {
      console.log(`  [${i}] ${key.toBase58()}`);
    });

    console.log(`\nInstructions: ${legacyTx.message.instructions.length}`);
    legacyTx.message.instructions.forEach((ix: { programIdIndex: number }, i: number) => {
      const programId = accountKeys[ix.programIdIndex];
      console.log(`  [${i}] Program: ${programId.toBase58()}`);
    });
  }

  console.log('='.repeat(60));
}
