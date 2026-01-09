// x402 Payment Service for handling micropayments (v2)
import { apiService } from './api';
import { x402Client, x402HTTPClient } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { ExactSvmScheme } from '@x402/svm/exact/client';
// PayAI's Solana-specific client (handles Phantom lighthouse instructions)
import { createX402Client as createPayAISolanaClient } from 'x402-solana/client';
import type { WalletAdapter as PayAIWalletAdapter } from 'x402-solana/types';
import type { WalletClient } from 'viem';
import type { TransactionSigner } from '@solana/kit';
import { VersionedTransaction } from '@solana/web3.js';

// Network type helpers
const isSolanaNetwork = (network: string): boolean => network.startsWith('solana:');
const isEvmNetwork = (network: string): boolean => network.startsWith('eip155:');

// Convert CAIP-2 Solana network to simple format for PayAI
const toPayAISolanaNetwork = (network: string): 'solana' | 'solana-devnet' => {
  if (network === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1') return 'solana-devnet';
  return 'solana'; // mainnet
};

/**
 * Recursively sanitizes strings in an object to be ASCII-safe for btoa encoding.
 * Replaces common Unicode characters with ASCII equivalents and removes remaining non-ASCII.
 * This fixes the "btoa Latin1" error when article titles contain Unicode (em dashes, smart quotes, etc.)
 */
function sanitizeForBase64<T>(obj: T): T {
  if (typeof obj === 'string') {
    return obj
      .replace(/[\u2018\u2019]/g, "'")   // Smart single quotes → '
      .replace(/[\u201C\u201D]/g, '"')   // Smart double quotes → "
      .replace(/[\u2013\u2014]/g, '-')   // En dash, em dash → -
      .replace(/\u2026/g, '...')         // Ellipsis → ...
      .replace(/[\u00A0]/g, ' ')         // Non-breaking space → space
      .replace(/[^\x00-\x7F]/g, '') as T; // Remove any remaining non-ASCII
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForBase64) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeForBase64(v)])
    ) as T;
  }
  return obj;
}

export interface PaymentRequirement {
  price: string;
  network: string;
  facilitator: string;
  to: string;
  accept: PaymentAccept | null;
  raw: any;
}

// v2 PaymentAccept (PaymentRequirements) - resource/description/mimeType moved to top-level
export interface PaymentAccept {
  scheme: string;
  network: string;
  amount: string;  // v2: renamed from maxAmountRequired
  payTo: string;
  maxTimeoutSeconds?: number;
  asset?: string;
  extra?: Record<string, unknown>;
}

export interface PaymentResponse {
  success: boolean;
  paymentRequired?: PaymentRequirement;
  receipt?: string;
  error?: string;
  encodedHeader?: string;
  rawResponse?: any;
}

// v2: CAIP-2 network identifiers
export type SupportedNetwork =
  | 'eip155:8453'      // Base mainnet
  | 'eip155:84532'     // Base Sepolia
  | 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'  // Solana mainnet
  | 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Solana devnet

export interface PaymentExecutionContext {
  network: SupportedNetwork;
  evmWalletClient?: WalletClient;
  solanaSigner?: TransactionSigner;
}

class X402PaymentService {
  private facilitatorUrl = import.meta.env.VITE_X402_FACILITATOR_URL || 'https://x402.org/facilitator';
  // Default to mainnet in production, otherwise use env var or Base Sepolia
  private network: SupportedNetwork = import.meta.env.PROD
    ? 'eip155:8453'
    : (import.meta.env.VITE_X402_NETWORK === 'base' ? 'eip155:8453' : 'eip155:84532');
  private readonly apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

  /**
   * Returns the appropriate Solana RPC URL for the given network.
   * Public RPC blocks browser requests (403), so we use Helius/custom RPC.
   */
  private getSolanaRpcUrl(network: SupportedNetwork): string | undefined {
    if (network === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
      return import.meta.env.VITE_SOLANA_MAINNET_RPC_URL;
    }
    if (network === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1') {
      return import.meta.env.VITE_SOLANA_DEVNET_RPC_URL;
    }
    return undefined;
  }

  private buildRequestUrl(endpoint: string, networkOverride?: SupportedNetwork): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetNetwork = networkOverride || this.network;
    const separator = normalizedEndpoint.includes('?') ? '&' : '?';
    return `${this.apiBase}${normalizedEndpoint}${separator}network=${targetNetwork}`;
  }

  getFacilitatorUrl(): string {
    const cdpAppId = import.meta.env.VITE_COINBASE_CDP_APP_ID;
    if (cdpAppId) {
      return 'https://facilitator.cdp.coinbase.com';
    }
    return this.facilitatorUrl;
  }

  async attemptPayment(
    endpoint: string,
    encodedPaymentHeader?: string,
    networkOverride?: SupportedNetwork
  ): Promise<PaymentResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (encodedPaymentHeader) {
        headers['PAYMENT-SIGNATURE'] = encodedPaymentHeader;  // v2: renamed from X-PAYMENT
      }

      const response = await fetch(this.buildRequestUrl(endpoint, networkOverride), {
        method: 'POST',
        headers,
      });

      if (response.status === 402) {
        const paymentData = await response.json();
        const paymentSpec: PaymentAccept | undefined = paymentData.accepts?.[0];
        const priceInUsd = paymentData.price
          || (paymentSpec?.amount  // v2: renamed from maxAmountRequired
            ? `$${(parseInt(paymentSpec.amount, 10) / 1_000_000).toFixed(2)}`
            : 'Unknown');

        return {
          success: false,
          paymentRequired: {
            price: priceInUsd,
            network: paymentSpec?.network || networkOverride || this.network,
            facilitator: this.getFacilitatorUrl(),
            to: paymentSpec?.payTo || '',
            accept: paymentSpec || null,
            raw: paymentData
          },
        };
      }

      if (response.ok) {
        return {
          success: true,
          receipt: 'Payment processed successfully',
        };
      }

      throw new Error(`Payment failed: ${response.status}`);
    } catch (error) {
      console.error('x402 payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  async purchaseArticle(
    articleId: number,
    context: PaymentExecutionContext
  ): Promise<PaymentResponse> {
    const url = this.buildRequestUrl(`/articles/${articleId}/purchase`, context.network);
    const networkType = isSolanaNetwork(context.network) ? 'SOLANA' : 'EVM';

    console.log(`[x402 Purchase] Starting purchase for article ${articleId}`);
    console.log(`[x402 Purchase] Network: ${context.network} (${networkType})`);
    console.log(`[x402 Purchase] Has Solana signer: ${!!context.solanaSigner}`);
    console.log(`[x402 Purchase] Has EVM wallet: ${!!context.evmWalletClient}`);

    try {
      // ============================================
      // SOLANA PATH - Use PayAI's x402-solana client
      // ============================================
      if (isSolanaNetwork(context.network) && context.solanaSigner) {
        console.log('[x402 Purchase] Using PayAI Solana client (handles Phantom lighthouse)');

        const rpcUrl = this.getSolanaRpcUrl(context.network);
        const payaiNetwork = toPayAISolanaNetwork(context.network);

        console.log(`[x402 Purchase] PayAI network: ${payaiNetwork}`);
        console.log(`[x402 Purchase] RPC URL: ${rpcUrl || 'default'}`);

        // Adapt our TransactionSigner to PayAI's WalletAdapter format
        const payaiWallet: PayAIWalletAdapter = {
          address: context.solanaSigner.address,
          signTransaction: async (tx: VersionedTransaction) => {
            console.log('[x402 Purchase] PayAI requesting transaction signature...');
            // Use our existing signer's signTransactions method
            const kitTx = {
              messageBytes: tx.message.serialize(),
              signatures: {} as Record<string, Uint8Array>,
            };
            // Add placeholder for the signer's address
            kitTx.signatures[context.solanaSigner!.address] = new Uint8Array(64);

            const signer = context.solanaSigner as any;
            const signedResults = await signer.signTransactions([kitTx]);
            const signature = signedResults[0][context.solanaSigner!.address];

            if (signature) {
              tx.addSignature(
                tx.message.staticAccountKeys[0], // payer is first key
                signature
              );
            }
            console.log('[x402 Purchase] Transaction signed successfully');
            return tx;
          },
        };

        // Create PayAI client
        const payaiClient = createPayAISolanaClient({
          wallet: payaiWallet,
          network: payaiNetwork,
          rpcUrl,
          verbose: true, // Enable PayAI's internal logging
        });

        console.log('[x402 Purchase] Making payment request via PayAI client...');

        // PayAI client handles the full 402 flow internally
        const response = await payaiClient.fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();
        console.log(`[x402 Purchase] PayAI response status: ${response.status}`);
        console.log('[x402 Purchase] PayAI response:', result);

        if (response.ok && result.success) {
          return {
            success: true,
            receipt: result.data?.receipt || result.receipt || 'Payment processed',
            rawResponse: result
          };
        }

        return {
          success: false,
          error: result?.error || `Payment failed with status ${response.status}`,
          rawResponse: result
        };
      }

      // ============================================
      // EVM PATH - Use existing Coinbase client (unchanged)
      // ============================================
      console.log('[x402 Purchase] Using Coinbase EVM client');

      const client = new x402Client();

      if (context.evmWalletClient && context.evmWalletClient.account) {
        const evmSigner = {
          address: context.evmWalletClient.account.address,
          signTypedData: (params: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
            context.evmWalletClient!.signTypedData({
              account: context.evmWalletClient!.account!,
              domain: params.domain as any,
              types: params.types as any,
              primaryType: params.primaryType as any,
              message: params.message as any,
            }),
        };
        registerExactEvmScheme(client, { signer: evmSigner });
        console.log(`[x402 Purchase] EVM signer registered: ${evmSigner.address}`);
      }

      const httpClient = new x402HTTPClient(client);

      // Initial request
      console.log('[x402 Purchase] Making initial request...');
      const initialResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (initialResponse.status !== 402) {
        const body = await initialResponse.json();
        if (initialResponse.ok && body.success) {
          return { success: true, receipt: body.data?.receipt || 'Already purchased' };
        }
        return { success: false, error: body.error || `Unexpected status: ${initialResponse.status}` };
      }

      console.log('[x402 Purchase] Got 402, processing payment...');
      const responseBody = await initialResponse.json();
      const sanitizedBody = sanitizeForBase64(responseBody);

      const paymentRequired = httpClient.getPaymentRequiredResponse(
        (name) => initialResponse.headers.get(name),
        sanitizedBody
      );

      const paymentPayload = await client.createPaymentPayload(paymentRequired);
      const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

      console.log('[x402 Purchase] Sending payment...');
      const paymentResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...paymentHeaders,
        },
      });

      const result = await paymentResponse.json();
      console.log(`[x402 Purchase] Payment response status: ${paymentResponse.status}`);

      if (paymentResponse.ok && result.success) {
        return {
          success: true,
          receipt: result.data?.receipt || result.receipt || 'Payment processed',
          rawResponse: result
        };
      }

      return {
        success: false,
        error: result?.error || `Payment failed with status ${paymentResponse.status}`,
        rawResponse: result
      };

    } catch (error) {
      console.error('[x402 Purchase] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  async donate(
    amount: number,
    context: PaymentExecutionContext
  ): Promise<PaymentResponse> {
    try {
      const url = this.buildRequestUrl('/donate', context.network);

      const client = new x402Client();

      if (context.solanaSigner) {
        const rpcUrl = this.getSolanaRpcUrl(context.network);
        client.register('solana:*', new ExactSvmScheme(context.solanaSigner, { rpcUrl }));
      }
      if (context.evmWalletClient && context.evmWalletClient.account) {
        const evmSigner = {
          address: context.evmWalletClient.account.address,
          signTypedData: (params: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
            context.evmWalletClient!.signTypedData({
              account: context.evmWalletClient!.account!,
              domain: params.domain as any,
              types: params.types as any,
              primaryType: params.primaryType as any,
              message: params.message as any,
            }),
        };
        registerExactEvmScheme(client, { signer: evmSigner });
      }

      const httpClient = new x402HTTPClient(client);

      const initialResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (initialResponse.status !== 402) {
        const body = await initialResponse.json();
        if (initialResponse.ok && body.success) {
          return { success: true, receipt: body.data?.receipt || 'Donation processed' };
        }
        return { success: false, error: body.error || `Unexpected status: ${initialResponse.status}` };
      }

      const responseBody = await initialResponse.json();
      const sanitizedBody = sanitizeForBase64(responseBody);
      const paymentRequired = httpClient.getPaymentRequiredResponse(
        (name) => initialResponse.headers.get(name),
        sanitizedBody
      );

      const paymentPayload = await client.createPaymentPayload(paymentRequired);
      const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

      const paymentResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...paymentHeaders,
        },
        body: JSON.stringify({ amount })
      });

      const result = await paymentResponse.json();

      if (paymentResponse.ok && result.success) {
        return {
          success: true,
          receipt: result.data?.receipt || 'Donation processed',
          rawResponse: result
        };
      }

      return {
        success: false,
        error: result?.error || 'Donation failed',
        rawResponse: result
      };

    } catch (error) {
      console.error('Donation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Donation failed',
      };
    }
  }

  async tip(
    articleId: number,
    amount: number,
    context: PaymentExecutionContext
  ): Promise<PaymentResponse> {
    try {
      const url = this.buildRequestUrl(`/articles/${articleId}/tip`, context.network);

      const client = new x402Client();

      if (context.solanaSigner) {
        const rpcUrl = this.getSolanaRpcUrl(context.network);
        client.register('solana:*', new ExactSvmScheme(context.solanaSigner, { rpcUrl }));
      }
      if (context.evmWalletClient && context.evmWalletClient.account) {
        const evmSigner = {
          address: context.evmWalletClient.account.address,
          signTypedData: (params: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
            context.evmWalletClient!.signTypedData({
              account: context.evmWalletClient!.account!,
              domain: params.domain as any,
              types: params.types as any,
              primaryType: params.primaryType as any,
              message: params.message as any,
            }),
        };
        registerExactEvmScheme(client, { signer: evmSigner });
      }

      const httpClient = new x402HTTPClient(client);

      const initialResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (initialResponse.status !== 402) {
        const body = await initialResponse.json();
        if (initialResponse.ok && body.success) {
          return { success: true, receipt: body.data?.receipt || 'Tip processed' };
        }
        return { success: false, error: body.error || `Unexpected status: ${initialResponse.status}` };
      }

      const responseBody = await initialResponse.json();
      const sanitizedBody = sanitizeForBase64(responseBody);
      const paymentRequired = httpClient.getPaymentRequiredResponse(
        (name) => initialResponse.headers.get(name),
        sanitizedBody
      );

      const paymentPayload = await client.createPaymentPayload(paymentRequired);
      const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

      const paymentResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...paymentHeaders,
        },
        body: JSON.stringify({ amount })
      });

      const result = await paymentResponse.json();

      if (paymentResponse.ok && result.success) {
        return {
          success: true,
          receipt: result.data?.receipt || 'Tip processed',
          rawResponse: result
        };
      }

      return {
        success: false,
        error: result?.error || 'Tip failed. Please try again.',
        rawResponse: result
      };

    } catch (error) {
      console.error('Tip failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tip failed',
      };
    }
  }

  async checkPaymentStatus(articleId: number, userAddress: string): Promise<boolean> {
    if (!userAddress) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiBase}/payment-status/${articleId}/${userAddress}`);
      if (!response.ok) {
        return false;
      }
      const result = await response.json();
      return Boolean(result?.success && result?.data?.hasPaid);
    } catch (error) {
      console.error('Failed to check payment status:', error);
      return false;
    }
  }

  async payForView(articleId: number): Promise<void> {
    try {
      const response = await apiService.incrementArticleViews(articleId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to record view');
      }
    } catch (error) {
      console.error('Failed to record article view:', error);
    }
  }
}

export const x402PaymentService = new X402PaymentService();
