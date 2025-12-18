// @ts-ignore - Coinbase CDP SDK has type errors in v0.x
import { generateJwt } from '@coinbase/cdp-sdk/auth';

type SupportedKind = {
  scheme: string;
  network: string;
  extra?: { feePayer?: string; [key: string]: unknown };
};

// v2 response format: kinds is an object keyed by version number
type SupportedResponseV2 = {
  kinds: Record<string, SupportedKind[]>;
  signers?: Record<string, string[]>;
  extensions?: string[];
};

// v1 response format: kinds is an array (backwards compatibility)
type SupportedResponseV1 = { kinds: SupportedKind[] };

type SupportedResponse = SupportedResponseV1 | SupportedResponseV2;

const requestHost = 'api.cdp.coinbase.com';
const supportedPath = '/platform/v2/x402/supported';

let feePayerCache: Record<string, string> | null = null;
let hydratePromise: Promise<void> | null = null;

async function hydrateCache(): Promise<void> {
  const token = await generateJwt({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    requestMethod: 'GET',
    requestHost,
    requestPath: supportedPath,
    expiresIn: 120,
  });

  const response = await fetch(`https://${requestHost}${supportedPath}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to load facilitator support: ${response.status}`);
  }

  const payload = (await response.json()) as SupportedResponse;

  // Handle both v1 (array) and v2 (object keyed by version) response formats
  let allKinds: SupportedKind[];

  if (Array.isArray(payload.kinds)) {
    allKinds = payload.kinds;
  } else {
    // v2 format: kinds is an object keyed by version number {"1": [...], "2": [...]}
    const kindsObj = payload.kinds as Record<string, SupportedKind[]>;
    allKinds = kindsObj['2'] || Object.values(kindsObj).flat();
  }

  feePayerCache = allKinds.reduce<Record<string, string>>((acc, kind) => {
    if (kind.extra?.feePayer) {
      acc[kind.network] = kind.extra.feePayer;
    }
    return acc;
  }, {});

  // Debug: show what CDP returned for fee payers
  console.log('[CDP] Fee payer cache:', JSON.stringify(feePayerCache, null, 2));
}

export async function ensureFacilitatorSupportLoaded(): Promise<void> {
  if (feePayerCache) return;
  if (!hydratePromise) {
    hydratePromise = hydrateCache().catch(err => {
      hydratePromise = null;
      throw err;
    });
  }
  await hydratePromise;
}

export async function getFacilitatorFeePayer(network: string): Promise<string | undefined> {
  await ensureFacilitatorSupportLoaded();
  const feePayer = feePayerCache?.[network];
  if (!feePayer) {
    console.log(`⚠️ No feePayer found for network "${network}". Available keys:`, Object.keys(feePayerCache || {}));
  }
  return feePayer;
}
