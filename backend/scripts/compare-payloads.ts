#!/usr/bin/env npx ts-node
// Compare devnet vs mainnet paymentPayloads

const devnetPayload = {
  "x402Version": 2,
  "payload": {
    "transaction": "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADtIMZbkZ7ZZgg1b3jTXdy3GRjTAuffYe0GZ29FrnBQ9qzQhIuqtJ61giHe/q860Bd0oMmhtiUI8KP1evr8B0YNgAIBAwcE4qLWUrwsdTGoe08xph+dVWqFvQXHygUxh6Vq1Z5C9QkCGg+wT9cv3pXCm+1sti9gzNxV/Ov0kZZp2C3lY0+0YFAChPE+HoYEyEiobgaqS5Hd7X93X/H+7yFgcWe60OfoboplqcY0nXNKw1Q2DBD6hj77BoBr7TUU7430oZuqeztELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqfClobuiqNcFL3tA1ya5asn7ZVST0mnmtY8Zg5mNGlibAwUABQJkGQAABQAJAwEAAAAAAAAABgQDBAIBCgxQwwAAAAAAAAYA"
  },
  "resource": {
    "url": "https://api-staging.readia.io/api/articles/268/purchase?network=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    "description": "Purchase access to: devnet validation 2",
    "mimeType": "application/json"
  },
  "accepted": {
    "scheme": "exact",
    "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "amount": "50000",
    "payTo": "GN5WAKRAckXoPmkcYCvFmLqs1tTTgEKhgzdekFaxmGaJ",
    "maxTimeoutSeconds": 900,
    "extra": {
      "feePayer": "L54zkaPQFeTn1UsEqieEXBqWrPShiaZEPD7mS5WXfQg"
    }
  }
};

const mainnetPayload = {
  "x402Version": 2,
  "payload": {
    "transaction": "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKrphSnoFJxMnzDuEWCTa/HojAqvDz8XXeLHqVroSLd8jKKl3VS776uaE/6xeNgDgrjpQQ1Ea+eoZEL8It7tIDgAIBAwcE4qLWUrwsdTGoe08xph+dVWqFvQXHygUxh6Vq1Z5C9QkCGg+wT9cv3pXCm+1sti9gzNxV/Ov0kZZp2C3lY0+0aGIkiawARiKsSDReRetHNqDrIdml7AQnH6W/U8sZL0baW+gWAzaA3wJWMR1iQx2VXOvCAyz5wyGhKrNBqY51BgMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAAxvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWEG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqQk4m497a1WamP01X9/5XtjZ5PTZFe4swSrsIg/+8Zi3AwQABQJkGQAABAAJAwEAAAAAAAAABgQCBQMBCgxQwwAAAAAAAAYA"
  },
  "resource": {
    "url": "https://api-staging.readia.io/api/articles/257/purchase?network=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "description": "Purchase access to: Daily AI Dose #11 - The AI Agent Stack That Replaced an Entire Junior Dev Team",
    "mimeType": "application/json"
  },
  "accepted": {
    "scheme": "exact",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "50000",
    "payTo": "2hJFxyn5rJdyReLMSm1yo2uJAMQEuXUrLM6aDWCGFHuQ",
    "maxTimeoutSeconds": 900,
    "extra": {
      "feePayer": "L54zkaPQFeTn1UsEqieEXBqWrPShiaZEPD7mS5WXfQg"
    }
  }
};

// Compare structure (ignoring expected differences)
console.log('=== Comparing PaymentPayload Structures ===\n');

console.log('x402Version:', devnetPayload.x402Version === mainnetPayload.x402Version ? '✅ MATCH' : '❌ DIFFER');
console.log('payload keys:', JSON.stringify(Object.keys(devnetPayload.payload)), '===', JSON.stringify(Object.keys(mainnetPayload.payload)));
console.log('resource keys:', JSON.stringify(Object.keys(devnetPayload.resource)), '===', JSON.stringify(Object.keys(mainnetPayload.resource)));
console.log('accepted keys:', JSON.stringify(Object.keys(devnetPayload.accepted)), '===', JSON.stringify(Object.keys(mainnetPayload.accepted)));
console.log('extra keys:', JSON.stringify(Object.keys(devnetPayload.accepted.extra)), '===', JSON.stringify(Object.keys(mainnetPayload.accepted.extra)));

console.log('\n=== Transaction Length ===');
console.log('Devnet transaction base64 length:', devnetPayload.payload.transaction.length);
console.log('Mainnet transaction base64 length:', mainnetPayload.payload.transaction.length);

// Decode transactions to compare structure
const devnetTx = Buffer.from(devnetPayload.payload.transaction, 'base64');
const mainnetTx = Buffer.from(mainnetPayload.payload.transaction, 'base64');

console.log('Devnet transaction byte length:', devnetTx.length);
console.log('Mainnet transaction byte length:', mainnetTx.length);

console.log('\n=== Transaction Header Comparison ===');
console.log('Devnet  - signatures:', devnetTx[0], '| message bytes[0-4]:', Array.from(devnetTx.slice(129, 134)));
console.log('Mainnet - signatures:', mainnetTx[0], '| message bytes[0-4]:', Array.from(mainnetTx.slice(129, 134)));

// Decode instructions
const decodeInstructions = (tx: Buffer, label: string) => {
  const messageStart = 1 + (tx[0] * 64);
  const message = tx.slice(messageStart);
  const isVersioned = (message[0] & 0x80) !== 0;
  const offset = isVersioned ? 1 : 0;
  const numAccounts = message[offset + 3];
  const accountsEnd = offset + 4 + (numAccounts * 32);

  // Recent blockhash is next 32 bytes
  const blockhash = message.slice(accountsEnd, accountsEnd + 32);
  console.log(`\n${label} Blockhash (first 8 bytes):`, Array.from(blockhash.slice(0, 8)));

  // Instructions follow
  const instrStart = accountsEnd + 32;
  const numInstructions = message[instrStart];
  console.log(`${label} Number of instructions:`, numInstructions);

  // Decode each instruction briefly
  let instrOffset = instrStart + 1;
  for (let i = 0; i < numInstructions; i++) {
    const programIndex = message[instrOffset];
    const numAccountsForInstr = message[instrOffset + 1];
    const accountIndices = Array.from(message.slice(instrOffset + 2, instrOffset + 2 + numAccountsForInstr));
    const dataLen = message[instrOffset + 2 + numAccountsForInstr];
    const data = message.slice(instrOffset + 3 + numAccountsForInstr, instrOffset + 3 + numAccountsForInstr + dataLen);

    console.log(`  Instruction ${i}: program[${programIndex}], accounts=${JSON.stringify(accountIndices)}, dataLen=${dataLen}`);
    instrOffset = instrOffset + 3 + numAccountsForInstr + dataLen;
  }
};

decodeInstructions(devnetTx, 'Devnet');
decodeInstructions(mainnetTx, 'Mainnet');

console.log('\n=== Key Comparison ===');

// Decode transfer instruction data
const decodeTransferData = (tx: Buffer, label: string) => {
  const messageStart = 1 + (tx[0] * 64);
  const message = tx.slice(messageStart);
  const isVersioned = (message[0] & 0x80) !== 0;
  const offset = isVersioned ? 1 : 0;
  const numAccounts = message[offset + 3];
  const accountsEnd = offset + 4 + (numAccounts * 32);
  const instrStart = accountsEnd + 32;
  const numInstructions = message[instrStart];

  // Find the token transfer instruction (last one, uses Token program)
  let instrOffset = instrStart + 1;
  for (let i = 0; i < numInstructions; i++) {
    const programIndex = message[instrOffset];
    const numAccountsForInstr = message[instrOffset + 1];
    const accountIndices = Array.from(message.slice(instrOffset + 2, instrOffset + 2 + numAccountsForInstr));
    const dataLen = message[instrOffset + 2 + numAccountsForInstr];
    const data = message.slice(instrOffset + 3 + numAccountsForInstr, instrOffset + 3 + numAccountsForInstr + dataLen);

    if (i === 2) { // Token transfer is the 3rd instruction
      console.log(`\n${label} Transfer Instruction Details:`);
      console.log(`  Program index: ${programIndex}`);
      console.log(`  Account indices: ${JSON.stringify(accountIndices)}`);
      console.log(`  Instruction data: [${Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);

      // Decode TransferChecked data: discriminator(1) + amount(8) + decimals(1)
      const discriminator = data[0];
      const amount = data.slice(1, 9);
      const amountValue = Buffer.from(amount).readBigUInt64LE();
      const decimals = data[9];
      console.log(`  Discriminator: ${discriminator} (12 = TransferChecked)`);
      console.log(`  Amount: ${amountValue} (${Number(amountValue) / 1_000_000} USDC)`);
      console.log(`  Decimals: ${decimals}`);
    }
    instrOffset = instrOffset + 3 + numAccountsForInstr + dataLen;
  }
};

decodeTransferData(devnetTx, 'Devnet');
decodeTransferData(mainnetTx, 'Mainnet');

console.log('\n=== CRITICAL FINDING ===');
console.log('Transfer instruction account order:');
console.log('  Devnet:  [3,4,2,1] = [destination, mint, source, authority]');
console.log('  Mainnet: [2,5,3,1] = [source, mint, destination, authority]');
console.log('\nSPL Token TransferChecked expects: [source, mint, destination, authority]');
console.log('Mainnet has CORRECT order, Devnet has WRONG order - but devnet works?!');
