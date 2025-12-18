#!/usr/bin/env npx ts-node
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes: Buffer | Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = '';
  for (const byte of bytes) {
    if (byte === 0) result += '1';
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

function decodeAccounts(base64Tx: string, label: string) {
  const txBuffer = Buffer.from(base64Tx, 'base64');
  const numSignatures = txBuffer[0];
  const messageStart = 1 + (numSignatures * 64);
  const messageBytes = txBuffer.slice(messageStart);
  const isVersioned = (messageBytes[0] & 0x80) !== 0;
  const headerOffset = isVersioned ? 1 : 0;
  const numAccounts = messageBytes[headerOffset + 3];
  const accountsStart = headerOffset + 4;

  console.log(`\n=== ${label} ===`);
  console.log(`Accounts (${numAccounts}):`);
  for (let i = 0; i < numAccounts; i++) {
    const keyStart = accountsStart + (i * 32);
    const keyBytes = messageBytes.slice(keyStart, keyStart + 32);
    const address = base58Encode(keyBytes);
    console.log(`  [${i}] ${address}`);
  }
}

// Devnet (success)
decodeAccounts(
  "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADtIMZbkZ7ZZgg1b3jTXdy3GRjTAuffYe0GZ29FrnBQ9qzQhIuqtJ61giHe/q860Bd0oMmhtiUI8KP1evr8B0YNgAIBAwcE4qLWUrwsdTGoe08xph+dVWqFvQXHygUxh6Vq1Z5C9QkCGg+wT9cv3pXCm+1sti9gzNxV/Ov0kZZp2C3lY0+0YFAChPE+HoYEyEiobgaqS5Hd7X93X/H+7yFgcWe60OfoboplqcY0nXNKw1Q2DBD6hj77BoBr7TUU7430oZuqeztELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqfClobuiqNcFL3tA1ya5asn7ZVST0mnmtY8Zg5mNGlibAwUABQJkGQAABQAJAwEAAAAAAAAABgQDBAIBCgxQwwAAAAAAAAYA",
  "DEVNET (SUCCESS)"
);

// Mainnet (failure)
decodeAccounts(
  "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKrphSnoFJxMnzDuEWCTa/HojAqvDz8XXeLHqVroSLd8jKKl3VS776uaE/6xeNgDgrjpQQ1Ea+eoZEL8It7tIDgAIBAwcE4qLWUrwsdTGoe08xph+dVWqFvQXHygUxh6Vq1Z5C9QkCGg+wT9cv3pXCm+1sti9gzNxV/Ov0kZZp2C3lY0+0aGIkiawARiKsSDReRetHNqDrIdml7AQnH6W/U8sZL0baW+gWAzaA3wJWMR1iQx2VXOvCAyz5wyGhKrNBqY51BgMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAAxvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWEG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqQk4m497a1WamP01X9/5XtjZ5PTZFe4swSrsIg/+8Zi3AwQABQJkGQAABAAJAwEAAAAAAAAABgQCBQMBCgxQwwAAAAAAAAYA",
  "MAINNET (FAILURE)"
);
