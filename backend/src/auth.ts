import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { SiweMessage, generateNonce as generateSiweNonce } from 'siwe';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import Database from './database';
import { pgPool } from './supabaseClient';
import {
  normalizeAddress,
  normalizeSolanaAddress,
  tryNormalizeFlexibleAddress,
  tryNormalizeAddress,
  tryNormalizeSolanaAddress
} from './utils/address';
import { Author, SupportedAuthorNetwork } from './types';

type NetworkGroup = 'evm' | 'solana';

interface SessionTokenPayload extends JwtPayload {
  sessionId: string;
  address: string;
  authorUuid?: string | null;
  network: SupportedAuthorNetwork;
}

export interface AuthenticatedRequest extends Request {
  auth?: {
    address: string;
    authorUuid?: string | null;
    sessionId: string;
    network: NetworkGroup;
  };
}

interface NonceRecord {
  nonce: string;
  wallet_address: string;
  author_uuid: string | null;
  network: SupportedAuthorNetwork;
  expires_at: string;
}

const authRouter = express.Router();
const db = new Database();
const textEncoder = new TextEncoder();

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: jwt.Secret = rawJwtSecret;

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10);
const NONCE_EXPIRY_MINUTES = parseInt(process.env.AUTH_NONCE_EXPIRY_MINUTES || '5', 10);
const NONCE_TTL_MS = NONCE_EXPIRY_MINUTES * 60 * 1000;

const SUPPORTED_NETWORKS: SupportedAuthorNetwork[] = ['base', 'base-sepolia', 'solana', 'solana-devnet'];
const SOLANA_NETWORKS: SupportedAuthorNetwork[] = ['solana', 'solana-devnet'];

const DEFAULT_X402_NETWORK: SupportedAuthorNetwork =
  SUPPORTED_NETWORKS.includes((process.env.X402_NETWORK || '') as SupportedAuthorNetwork)
    ? (process.env.X402_NETWORK as SupportedAuthorNetwork)
    : 'base-sepolia';

const DEFAULT_EVM_PAYOUT_NETWORK: SupportedAuthorNetwork =
  DEFAULT_X402_NETWORK === 'base' || DEFAULT_X402_NETWORK === 'base-sepolia'
    ? DEFAULT_X402_NETWORK
    : 'base';

const DEFAULT_SOLANA_PAYOUT_NETWORK: SupportedAuthorNetwork =
  DEFAULT_X402_NETWORK === 'solana-devnet' ? 'solana-devnet' : 'solana';

const SIWE_DOMAIN = deriveDomain();
const SIWE_URI = process.env.SIWE_URI || process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const nonceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function deriveDomain(): string {
  if (process.env.SIWE_DOMAIN) {
    return process.env.SIWE_DOMAIN;
  }

  const source =
    process.env.PUBLIC_API_HOST ||
    process.env.FRONTEND_ORIGIN ||
    'http://localhost:3000';

  try {
    const url = new URL(source);
    return url.host;
  } catch {
    return source.replace(/^https?:\/\//, '');
  }
}

function getNetworkGroup(network: SupportedAuthorNetwork): NetworkGroup {
  return SOLANA_NETWORKS.includes(network) ? 'solana' : 'evm';
}

function normalizeForNetwork(address: string, network: SupportedAuthorNetwork): string {
  return SOLANA_NETWORKS.includes(network)
    ? normalizeSolanaAddress(address)
    : normalizeAddress(address);
}

function mapChainIdToNetwork(chainId?: number): SupportedAuthorNetwork {
  if (chainId === 8453) {
    return 'base';
  }
  if (chainId === 84532) {
    return 'base-sepolia';
  }
  return DEFAULT_EVM_PAYOUT_NETWORK;
}

async function ensureAuthorForWallet(address: string, network: SupportedAuthorNetwork): Promise<Author> {
  const normalizedAddress = normalizeForNetwork(address, network);

  const existing = await db.getAuthorByWallet(normalizedAddress);
  if (existing) {
    const alreadyTracked = existing.wallets?.some(wallet => wallet.address === normalizedAddress);
    if (!alreadyTracked && existing.authorUuid) {
      await db.setAuthorWallet({
        authorUuid: existing.authorUuid,
        address: normalizedAddress,
        network,
        isPrimary: existing.primaryPayoutAddress === normalizedAddress,
      });
      const refreshed = await db.getAuthorByUuid(existing.authorUuid);
      if (refreshed) {
        return refreshed;
      }
    }
    return existing;
  }

  const now = new Date().toISOString();
  const newAuthor: Author = {
    address: normalizedAddress,
    primaryPayoutNetwork: network,
    createdAt: now,
    totalArticles: 0,
    totalEarnings: 0,
    totalViews: 0,
    totalPurchases: 0,
  };

  const savedAuthor = await db.createOrUpdateAuthor(newAuthor);
  if (savedAuthor.authorUuid) {
    await db.setAuthorWallet({
      authorUuid: savedAuthor.authorUuid,
      address: normalizedAddress,
      network,
      isPrimary: true,
    });
    const refreshed = await db.getAuthorByUuid(savedAuthor.authorUuid);
    if (refreshed) {
      return refreshed;
    }
  }
  return savedAuthor;
}

async function getNonceRecord(nonce: string): Promise<NonceRecord | null> {
  const { rows } = await pgPool.query<NonceRecord>(
    'SELECT nonce, wallet_address, author_uuid, network, expires_at FROM auth_nonces WHERE nonce = $1 LIMIT 1',
    [nonce]
  );
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

async function deleteNonce(nonce: string): Promise<void> {
  await pgPool.query('DELETE FROM auth_nonces WHERE nonce = $1', [nonce]);
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.socket.remoteAddress || null;
}

function getSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

authRouter.post('/nonce', nonceLimiter, async (req: Request, res: Response) => {
  try {
    const { address, network }: { address?: string; network?: SupportedAuthorNetwork } = req.body || {};
    if (!address) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    const resolvedNetwork: SupportedAuthorNetwork = network && SUPPORTED_NETWORKS.includes(network)
      ? network
      : DEFAULT_EVM_PAYOUT_NETWORK;

    let normalizedAddress: string;
    if (SOLANA_NETWORKS.includes(resolvedNetwork)) {
      const maybeSol = tryNormalizeSolanaAddress(address);
      if (!maybeSol) {
        return res.status(400).json({ success: false, error: 'Invalid Solana address' });
      }
      normalizedAddress = maybeSol;
    } else {
      const maybeEvm = tryNormalizeAddress(address);
      if (!maybeEvm) {
        return res.status(400).json({ success: false, error: 'Invalid EVM address' });
      }
      normalizedAddress = maybeEvm;
    }

    const nonce = generateSiweNonce();
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

    const { rows } = await pgPool.query(
      `INSERT INTO auth_nonces (nonce, wallet_address, author_uuid, network, expires_at)
       VALUES ($1, $2, (SELECT author_uuid FROM author_wallets WHERE address = $2 LIMIT 1), $3, $4)
       RETURNING nonce`,
      [nonce, normalizedAddress, resolvedNetwork, expiresAt.toISOString()]
    );

    if (rows.length === 0) {
      throw new Error('Failed to create nonce');
    }

    return res.json({
      success: true,
      data: {
        nonce,
        network: resolvedNetwork,
        expiresAt: expiresAt.toISOString(),
        domain: SIWE_DOMAIN,
        uri: SIWE_URI,
      },
    });
  } catch (error) {
    console.error('[auth] Failed to generate nonce', error);
    return res.status(500).json({ success: false, error: 'Failed to create nonce' });
  }
});

authRouter.post('/verify', verifyLimiter, async (req: Request, res: Response) => {
  try {
    const { message, signature, nonce }: { message?: string; signature?: string; nonce?: string } = req.body || {};
    if (!message || !signature) {
      return res.status(400).json({ success: false, error: 'Message and signature are required' });
    }

    let resolvedNonce = nonce;
    let siweMessage: SiweMessage | null = null;

    if (!resolvedNonce) {
      try {
        siweMessage = new SiweMessage(message);
        resolvedNonce = siweMessage.nonce;
      } catch {
        return res.status(400).json({ success: false, error: 'Nonce is required' });
      }
    }

    if (!resolvedNonce) {
      return res.status(400).json({ success: false, error: 'Nonce is required' });
    }

    const nonceRecord = await getNonceRecord(resolvedNonce);
    if (!nonceRecord) {
      return res.status(409).json({ success: false, error: 'Nonce expired or already used' });
    }

    if (new Date(nonceRecord.expires_at).getTime() < Date.now()) {
      await deleteNonce(resolvedNonce);
      return res.status(409).json({ success: false, error: 'Nonce expired' });
    }

    let walletAddress = nonceRecord.wallet_address;
    let resolvedNetwork = nonceRecord.network;
    const networkGroup = getNetworkGroup(resolvedNetwork);

    if (networkGroup === 'evm') {
      try {
        siweMessage = siweMessage || new SiweMessage(message);
        const result = await siweMessage.verify({
          signature,
          nonce: resolvedNonce,
          domain: SIWE_DOMAIN,
        });
        walletAddress = normalizeAddress(result.data.address);
        const chainNetwork = mapChainIdToNetwork(result.data.chainId);
        resolvedNetwork = chainNetwork;
      } catch (error) {
        console.error('[auth] SIWE verification failed', error);
        return res.status(401).json({ success: false, error: 'Invalid SIWE signature' });
      }
    } else {
      if (!message.includes(resolvedNonce)) {
        return res.status(400).json({ success: false, error: 'Nonce mismatch in signed message' });
      }
      try {
        const publicKeyBytes = new PublicKey(walletAddress).toBytes();
        const signatureBytes = Buffer.from(signature, 'base64');
        const messageBytes = textEncoder.encode(message);
        const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        if (!isValid) {
          return res.status(401).json({ success: false, error: 'Invalid Solana signature' });
        }
      } catch (error) {
        console.error('[auth] Solana verification failed', error);
        return res.status(401).json({ success: false, error: 'Invalid Solana signature' });
      }
    }

    const author = await ensureAuthorForWallet(walletAddress, resolvedNetwork);

    const sessionExpiresAt = getSessionExpiryDate();
    const { rows: sessionRows } = await pgPool.query(
      `INSERT INTO auth_sessions (wallet_address, author_uuid, network, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, expires_at, wallet_address, author_uuid, network`,
      [
        walletAddress,
        author.authorUuid || null,
        resolvedNetwork,
        sessionExpiresAt.toISOString(),
        req.get('user-agent') || null,
        getClientIp(req),
      ]
    );

    await deleteNonce(resolvedNonce);

    const sessionRow = sessionRows[0];
    const tokenPayload: SessionTokenPayload = {
      sessionId: sessionRow.id,
      address: normalizeForNetwork(walletAddress, resolvedNetwork),
      authorUuid: sessionRow.author_uuid,
      network: sessionRow.network as SupportedAuthorNetwork,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    } as SignOptions);

    return res.json({
      success: true,
      data: {
        token,
        session: {
          id: sessionRow.id,
          walletAddress: sessionRow.wallet_address,
          authorUuid: sessionRow.author_uuid,
          network: sessionRow.network,
          expiresAt: sessionRow.expires_at,
        },
      },
    });
  } catch (error) {
    console.error('[auth] Verification failed', error);
    return res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    await pgPool.query(
      'UPDATE auth_sessions SET revoked = TRUE WHERE id = $1',
      [req.auth.sessionId]
    );
    return res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('[auth] Logout failed', error);
    return res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

authRouter.post('/logout-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    await pgPool.query(
      'UPDATE auth_sessions SET revoked = TRUE WHERE wallet_address = $1',
      [req.auth.address]
    );
    return res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    console.error('[auth] Logout-all failed', error);
    return res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
  }
});

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.get('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing authorization header' });
    }
    const token = header.replace('Bearer ', '').trim();
    let decoded: SessionTokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as SessionTokenPayload;
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const { rows } = await pgPool.query(
      `SELECT id, wallet_address, author_uuid, network, expires_at, revoked
       FROM auth_sessions
       WHERE id = $1
       LIMIT 1`,
      [decoded.sessionId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Session not found' });
    }

    const session = rows[0];
    if (session.revoked || new Date(session.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    const sessionNetwork = session.network as SupportedAuthorNetwork;
    const normalizedSessionAddress = normalizeForNetwork(session.wallet_address, sessionNetwork);
    const normalizedTokenAddress = normalizeForNetwork(decoded.address, sessionNetwork);
    if (normalizedSessionAddress !== normalizedTokenAddress) {
      return res.status(401).json({ success: false, error: 'Session mismatch' });
    }

    await pgPool.query('UPDATE auth_sessions SET last_activity = NOW() WHERE id = $1', [session.id]);

    req.auth = {
      address: session.wallet_address,
      authorUuid: session.author_uuid,
      sessionId: session.id,
      network: getNetworkGroup(sessionNetwork),
    };

    return next();
  } catch (error) {
    console.error('[auth] requireAuth failed', error);
    return res.status(500).json({ success: false, error: 'Authentication check failed' });
  }
}

export function requireOwnership(field: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Don't validate incoming address - let the route handler check authorization
    // via resolveCanonicalAuthorAddress() which supports secondary wallets
    // Just set the field to the authenticated wallet address
    if (req.body) {
      req.body[field] = req.auth.address;
    }

    return next();
  };
}

export default authRouter;
