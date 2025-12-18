// x402 Payment Service for handling micropayments (v2)
import { apiService } from './api';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import type { PaymentPayload, PaymentRequired, PaymentRequirements } from '@x402/core/types';
// v2: Use official helper for EVM, manual registration for SVM (custom RPC needed)
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { ExactSvmScheme } from '@x402/svm/exact/client';
import type { WalletClient } from 'viem';
import type { TransactionSigner } from '@solana/kit';

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
  private network: SupportedNetwork = (import.meta.env.VITE_X402_NETWORK === 'base' ? 'eip155:8453' : 'eip155:84532');
  private readonly X402_VERSION = 2;
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

  /**
   * Creates an x402HTTPClient configured for the given payment context
   * v2: Uses official registerExact*Scheme helpers instead of manual registration
   */
  private createX402HttpClient(context: PaymentExecutionContext): x402HTTPClient {
    const baseClient = new x402Client();

    // v2: Register EVM scheme using official helper
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
      registerExactEvmScheme(baseClient, { signer: evmSigner });
    }

    // v2: Register SVM scheme manually (public RPC blocks browser requests with 403)
    if (context.solanaSigner) {
      const rpcUrl = this.getSolanaRpcUrl(context.network);
      console.log('[X402_DEBUG] Registering SVM scheme with custom RPC:', {
        network: context.network,
        rpcUrl: rpcUrl ? 'configured' : 'SDK_DEFAULT'
      });
      baseClient.register('solana:*', new ExactSvmScheme(context.solanaSigner, { rpcUrl }));
    }

    return new x402HTTPClient(baseClient);
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

  isCDPEnabled(): boolean {
    return !!import.meta.env.VITE_COINBASE_CDP_APP_ID;
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

  /**
   * Creates a v2 PaymentPayload and encodes it for the PAYMENT-SIGNATURE header
   * v2 structure: { x402Version, resource, accepted, payload }
   */
  private async createPaymentHeaderFromRequirements(
    requirement: PaymentRequirement,
    context: PaymentExecutionContext
  ): Promise<string> {
    if (!requirement.raw) {
      throw new Error('No x402 payment data returned by server');
    }

    console.log('[X402_DEBUG] Payment requirements:', {
      contextNetwork: context.network,
      requirementNetwork: requirement.accept?.network,
      rawAcceptsNetwork: requirement.raw?.accepts?.[0]?.network,
      networkMatch: context.network === requirement.accept?.network
    });

    const requirementNetwork = requirement.accept?.network || context.network;
    const isSolana = requirementNetwork.startsWith('solana:');

    // Validate wallet availability
    if (isSolana && !context.solanaSigner) {
      throw new Error('Please connect a Solana wallet to continue');
    }
    if (!isSolana && !context.evmWalletClient) {
      throw new Error('Please connect a Base-compatible wallet to continue');
    }

    // Create the v2 HTTP client with appropriate signers
    const httpClient = this.createX402HttpClient(context);

    // Sanitize the 402 response to remove Unicode characters that break btoa encoding
    // This handles article titles with em dashes, smart quotes, etc.
    const sanitizedRaw = sanitizeForBase64(requirement.raw);

    // Pass the sanitized 402 response (PaymentRequired) to create the v2 PaymentPayload
    // SDK will: copy resource, select accepted from accepts[], build signed payload
    const paymentPayload = await httpClient.createPaymentPayload(sanitizedRaw as PaymentRequired);

    // DEBUG: Log the transaction AFTER SDK creates it, BEFORE encoding
    const txBase64 = (paymentPayload as any).payload?.transaction;
    if (txBase64) {
      console.log('[X402_DEBUG] Transaction in paymentPayload (first 200 chars):', txBase64.slice(0, 200));
    }

    // Encode to PAYMENT-SIGNATURE header format
    const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);
    const encodedHeader = headers['payment-signature'] || headers['PAYMENT-SIGNATURE'];

    if (!encodedHeader) {
      throw new Error('Failed to encode payment signature header');
    }

    return encodedHeader;
  }

  async purchaseArticle(
    articleId: number,
    context: PaymentExecutionContext
  ): Promise<PaymentResponse> {
    try {
      const initialResponse = await this.attemptPayment(`/articles/${articleId}/purchase`, undefined, context.network);

      if (initialResponse.paymentRequired && initialResponse.paymentRequired.accept) {
        const encodedHeader = await this.createPaymentHeaderFromRequirements(
          initialResponse.paymentRequired,
          context
        );

        const response = await fetch(this.buildRequestUrl(`/articles/${articleId}/purchase`, context.network), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PAYMENT-SIGNATURE': encodedHeader  // v2: renamed from X-PAYMENT
          }
        });

        const result = await response.json();

        if (response.ok && result.success) {
          return {
            success: true,
            receipt: result.data?.receipt || result.receipt || 'Payment processed',
            encodedHeader,
            rawResponse: result
          };
        }

        return {
          success: false,
          error: result?.error || `Payment failed with status ${response.status}`,
          encodedHeader,
          rawResponse: result
        };
      }

      return initialResponse;
    } catch (error) {
      console.error('Article purchase failed:', error);
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
      const response1 = await fetch(this.buildRequestUrl('/donate', context.network), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (response1.status === 402) {
        const paymentData = await response1.json();
        const paymentSpec = paymentData.accepts?.[0];

        if (!paymentSpec) {
          throw new Error('No payment requirements returned');
        }

        const paymentRequirement: PaymentRequirement = {
          price: paymentData.price,
          network: paymentSpec.network,
          facilitator: this.getFacilitatorUrl(),
          to: paymentSpec.payTo,
          accept: paymentSpec,
          raw: paymentData
        };

        const encodedHeader = await this.createPaymentHeaderFromRequirements(
          paymentRequirement,
          context
        );

        const response2 = await fetch(this.buildRequestUrl('/donate', context.network), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PAYMENT-SIGNATURE': encodedHeader  // v2: renamed from X-PAYMENT
          },
          body: JSON.stringify({ amount })
        });

        const result = await response2.json();

        if (response2.ok && result.success) {
          return {
            success: true,
            receipt: result.data?.receipt || 'Donation processed',
            encodedHeader,
            rawResponse: result
          };
        }

        return {
          success: false,
          error: result?.error || 'Donation failed',
          rawResponse: result
        };
      }

      throw new Error(`Unexpected response: ${response1.status}`);

    } catch (error) {
      console.error('❌ Donation failed:', error);
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
      const response1 = await fetch(this.buildRequestUrl(`/articles/${articleId}/tip`, context.network), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (response1.status === 402) {
        const paymentData = await response1.json();
        const paymentSpec = paymentData.accepts?.[0];

        if (!paymentSpec) {
          throw new Error('No payment requirements returned');
        }

        const paymentRequirement: PaymentRequirement = {
          price: paymentData.price,
          network: paymentSpec.network,
          facilitator: this.getFacilitatorUrl(),
          to: paymentSpec.payTo,
          accept: paymentSpec,
          raw: paymentData
        };

        const encodedHeader = await this.createPaymentHeaderFromRequirements(
          paymentRequirement,
          context
        );

        const response2 = await fetch(this.buildRequestUrl(`/articles/${articleId}/tip`, context.network), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PAYMENT-SIGNATURE': encodedHeader  // v2: renamed from X-PAYMENT
          },
          body: JSON.stringify({ amount })
        });

        const result = await response2.json();

        if (response2.ok && result.success) {
          return {
            success: true,
            receipt: result.data?.receipt || 'Tip processed',
            encodedHeader,
            rawResponse: result
          };
        }

        return {
          success: false,
          error: result?.error || 'Tip failed. Please try again.',
          rawResponse: result
        };
      }

      throw new Error(`Unexpected response: ${response1.status}`);

    } catch (error) {
      console.error('❌ Tip failed:', error);
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
