// x402 Payment Service for handling micropayments
import { apiService } from './api';
import { createPaymentHeader as createEncodedPaymentHeader } from 'x402/client';
import type { X402Config } from 'x402/types/config';
import type { WalletClient } from 'viem';
import type { TransactionSigner } from '@solana/kit';
import type { X402Config } from 'x402/types/config';


export interface PaymentRequirement {
  price: string;
  network: string;
  facilitator: string;
  to: string;
  accept: PaymentAccept | null;
  raw: any;
}

export interface PaymentAccept {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset?: string;
  outputSchema?: Record<string, unknown>;
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

export type SupportedNetwork = 'base' | 'base-sepolia' | 'solana' | 'solana-devnet';

export interface PaymentExecutionContext {
  network: SupportedNetwork;
  evmWalletClient?: WalletClient;
  solanaSigner?: TransactionSigner;
}

class X402PaymentService {
  private facilitatorUrl = import.meta.env.VITE_X402_FACILITATOR_URL || 'https://x402.org/facilitator';
  private network: SupportedNetwork = (import.meta.env.VITE_X402_NETWORK === 'base' ? 'base' : 'base-sepolia');
  private readonly X402_VERSION = 1;
  private readonly apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

  private getSolanaRpcUrl(network: SupportedNetwork): string | undefined {
    if (network === 'solana') {
      return import.meta.env.VITE_SOLANA_MAINNET_RPC_URL;
    }
    if (network === 'solana-devnet') {
      return import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
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
        headers['X-PAYMENT'] = encodedPaymentHeader;
      }

      const response = await fetch(this.buildRequestUrl(endpoint, networkOverride), {
        method: 'POST',
        headers,
      });

      if (response.status === 402) {
        const paymentData = await response.json();
        const paymentSpec: PaymentAccept | undefined = paymentData.accepts?.[0];
        const priceInUsd = paymentData.price
          || (paymentSpec?.maxAmountRequired
            ? `$${(parseInt(paymentSpec.maxAmountRequired, 10) / 1_000_000).toFixed(2)}`
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

  private async createPaymentHeaderFromRequirements(
    requirement: PaymentRequirement,
    context: PaymentExecutionContext
  ): Promise<string> {
    if (!requirement.accept) {
      throw new Error('No x402 payment option returned by facilitator');
    }

    const requirementNetwork = (requirement.accept.network || context.network) as SupportedNetwork;
    const isSolana = requirementNetwork.startsWith('solana');

    if (isSolana) {
      if (!context.solanaSigner) {
        throw new Error('Please connect a Solana wallet to continue');
      }
      const rpcUrl = this.getSolanaRpcUrl(requirementNetwork);
      const x402Config: X402Config | undefined = rpcUrl ? { svmConfig: { rpcUrl } } : undefined;
      console.log('[x402] Solana RPC URL:', rpcUrl, 'network:', requirementNetwork);

      const encodedHeader = await createEncodedPaymentHeader(
        context.solanaSigner,
        this.X402_VERSION,
        requirement.accept,
        x402Config
      );
      console.log('🔐 Encoded x402 payment header (Solana):', encodedHeader);
      return encodedHeader;
    }

    if (!context.evmWalletClient) {
      throw new Error('Please connect a Base-compatible wallet to continue');
    }

    const encodedHeader = await createEncodedPaymentHeader(
      context.evmWalletClient,
      this.X402_VERSION,
      requirement.accept
    );
    console.log('🔐 Encoded x402 payment header:', encodedHeader);
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
            'X-PAYMENT': encodedHeader
          }
        });

        const result = await response.json();
        console.log('🔍 Purchase response:', result);

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
            'X-PAYMENT': encodedHeader
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
            'X-PAYMENT': encodedHeader
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
