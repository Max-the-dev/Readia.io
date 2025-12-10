import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { useWalletClient } from 'wagmi';
import { SiweMessage } from 'siwe';
import { API_BASE_URL, SupportedAuthorNetwork, apiService } from '../services/api';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: string | null;
  authenticatedAddress?: string;
  sessionExpired: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  handleAuthError: () => void;
  clearSessionExpired: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface NonceResponse {
  success: boolean;
  data?: {
    nonce: string;
    network: SupportedAuthorNetwork;
    expiresAt: string;
    domain: string;
    uri: string;
  };
  error?: string;
}

interface VerifyResponse {
  success: boolean;
  data?: {
    token: string;
    session: {
      id: string;
      walletAddress: string;
      network: SupportedAuthorNetwork;
      expiresAt: string;
    };
  };
  error?: string;
}

const TOKEN_STORAGE_KEY = 'penny_auth_token';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(binary);
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Buffer is available in Node/Vite build environment
  if (typeof Buffer !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Buffer.from(bytes).toString('base64');
  }

  return binary;
}

function normalizeCaipNetwork(caipNetworkId?: string, fallback?: SupportedAuthorNetwork): SupportedAuthorNetwork {
  if (!caipNetworkId) {
    return fallback || 'base-sepolia';
  }

  if (caipNetworkId.includes('solana')) {
    return caipNetworkId.includes('devnet') ? 'solana-devnet' : 'solana';
  }

  if (caipNetworkId.includes('8453')) {
    return 'base';
  }
  if (caipNetworkId.includes('84532')) {
    return 'base-sepolia';
  }

  return fallback || 'base-sepolia';
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetworkId, chainId } = useAppKitNetwork();
  const { walletProvider: solanaProvider } = useAppKitProvider('solana');
  const { data: walletClient } = useWalletClient();

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    // Set auth header synchronously on init (before any useEffect runs)
    if (storedToken) {
      apiService.setAuthHeaderProvider(() => ({
        Authorization: `Bearer ${storedToken}`,
      }));
    }
    return storedToken;
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem(AUTHED_ADDRESS_KEY) || undefined;
  });
  const [sessionExpired, setSessionExpired] = useState(false);

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      apiService.setAuthHeaderProvider(() => ({
        Authorization: `Bearer ${token}`,
      }));
    } else {
      apiService.setAuthHeaderProvider(null);
    }
  }, [token]);

  // Clear token if wallet disconnects or address changes
  useEffect(() => {
    if (!address || !isConnected) {
      return;
    }

    if (authenticatedAddress && address !== authenticatedAddress) {
      setToken(null);
      apiService.setAuthHeaderProvider(null);
      setAuthenticatedAddress(undefined);
      localStorage.removeItem(AUTHED_ADDRESS_KEY);
    }
  }, [address, isConnected, authenticatedAddress]);

  const login = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      setError('Connect your wallet first');
      return false;
    }

    const isEvmAddress = address.startsWith('0x');
    if (isEvmAddress && !walletClient) {
      setError('Wallet client unavailable. Please reconnect your wallet.');
      return false;
    }

    if (!isEvmAddress && !solanaProvider) {
      setError('Solana wallet provider unavailable. Please reconnect your wallet.');
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const networkHint = normalizeCaipNetwork(
        caipNetworkId,
        isEvmAddress ? 'base-sepolia' : 'solana'
      );

      const nonceRes = await fetch(`${API_BASE_URL}/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          network: networkHint,
        }),
      });

      const noncePayload: NonceResponse = await nonceRes.json();
      if (!noncePayload.success || !noncePayload.data) {
        throw new Error(noncePayload.error || 'Failed to request nonce');
      }

      const { nonce, domain, uri } = noncePayload.data;
      let message: string;
      let signature: string;

      if (isEvmAddress) {
        const siweMessage = new SiweMessage({
          domain,
          address,
          statement: 'Sign in to Readia.io',
          uri,
          version: '1',
          chainId: chainId || 84532,
          nonce,
          issuedAt: new Date().toISOString(),
          expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });
        message = siweMessage.prepareMessage();
        const account = (walletClient?.account?.address ||
          address) as `0x${string}`;
        signature = await walletClient!.signMessage({
          account,
          message,
        });
      } else {
        const provider = solanaProvider as {
          signMessage?: (msg: Uint8Array, encoding?: string) => Promise<Uint8Array | { signature: Uint8Array }>;
        } | null;

        if (!provider?.signMessage) {
          throw new Error('Connected Solana wallet does not support message signing');
        }

        message = `Sign in to Readia.io\nNonce: ${nonce}\nDomain: ${domain}`;
        const encoded = new TextEncoder().encode(message);
        const signed = await provider.signMessage(encoded, 'utf8');
        const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
        signature = bytesToBase64(signatureBytes);
      }

      const verifyRes = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          nonce,
        }),
      });

      const verifyPayload: VerifyResponse = await verifyRes.json();
      if (!verifyPayload.success || !verifyPayload.data) {
        throw new Error(verifyPayload.error || 'Authentication failed');
      }

      const nextToken = verifyPayload.data.token;
      apiService.setAuthHeaderProvider(() => ({
        Authorization: `Bearer ${nextToken}`,
      }));
      setToken(nextToken);
      setAuthenticatedAddress(address);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTHED_ADDRESS_KEY, address);
      }
      return true;
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
      setToken(null);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isConnected, walletClient, solanaProvider, caipNetworkId, chainId]);

  const logout = useCallback(async () => {
    const currentToken = token;
    apiService.setAuthHeaderProvider(null);
    setToken(null);
    setError(null);
    setAuthenticatedAddress(undefined);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTHED_ADDRESS_KEY);
    }

    if (!currentToken) {
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });
    } catch (err) {
      console.warn('Logout request failed (ignored):', err);
    }
  }, [token]);

  const getAuthHeaders = useCallback(() => {
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

 const clearSessionExpired = useCallback(() => {
   setSessionExpired(false);
 }, []);

 const value = useMemo<AuthContextValue>(
   () => ({
     token,
     isAuthenticated,
     isAuthenticating,
     error,
     authenticatedAddress,
     sessionExpired,
     login,
     logout,
     getAuthHeaders,
     handleAuthError: () => {
       apiService.setAuthHeaderProvider(null);
       setToken(null);
       setAuthenticatedAddress(undefined);
       setSessionExpired(true);
       if (typeof window !== 'undefined') {
         localStorage.removeItem(TOKEN_STORAGE_KEY);
         localStorage.removeItem(AUTHED_ADDRESS_KEY);
       }
     },
     clearSessionExpired,
   }),
    [token, isAuthenticated, isAuthenticating, error, login, logout, getAuthHeaders, authenticatedAddress, sessionExpired, clearSessionExpired]
 );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
const AUTHED_ADDRESS_KEY = 'penny_auth_wallet';
