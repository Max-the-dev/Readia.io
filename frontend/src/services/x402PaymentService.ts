// x402 Payment Service for handling micropayments
import { apiService } from './api';
import { createPaymentHeader as createEncodedPaymentHeader } from 'x402/client';
import type { WalletClient } from 'viem';

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

type SupportedNetwork = 'base' | 'base-sepolia';

class X402PaymentService {
  private facilitatorUrl = import.meta.env.VITE_X402_FACILITATOR_URL || 'https://x402.org/facilitator';
  private network = (import.meta.env.VITE_X402_NETWORK === 'base' ? 'base' : 'base-sepolia') as SupportedNetwork;
  private readonly X402_VERSION = 1;
  private readonly apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

  private buildRequestUrl(endpoint: string, networkOverride?: SupportedNetwork): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.apiBase}${normalizedEndpoint}`;
    const targetNetwork = networkOverride || this.network;

    if (targetNetwork) {
      const separator = normalizedEndpoint.includes('?') ? '&' : '?';
      url = `${url}${separator}network=${targetNetwork}`;
    }

    return url;
  }

  /**
   * Get facilitator URL - uses CDP if configured, otherwise falls back to public
   */
  getFacilitatorUrl(): string {
    const cdpAppId = import.meta.env.VITE_COINBASE_CDP_APP_ID;
    if (cdpAppId) {
      return 'https://facilitator.cdp.coinbase.com';
    }
    return this.facilitatorUrl;
  }

  /**
   * Check if CDP is enabled
   */
  isCDPEnabled(): boolean {
    return !!import.meta.env.VITE_COINBASE_CDP_APP_ID;
  }

  /**
   * Attempt to access a paid resource
   * If payment is required, returns payment requirements
   * If payment was successful, returns success
   */
  async attemptPayment(
    endpoint: string,
    encodedPaymentHeader?: string,
    networkOverride?: SupportedNetwork
  ): Promise<PaymentResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add x402 payment header if already prepared (reuse logic)
      if (encodedPaymentHeader) {
        headers['X-PAYMENT'] = encodedPaymentHeader;
      }

      const response = await fetch(this.buildRequestUrl(endpoint, networkOverride), {
        method: 'POST',
        headers,
      });

      if (response.status === 402) {
        // Payment required - extract payment requirements from backend 402 response
        const paymentData = await response.json();
        console.log('🔍 Received 402 payment response:', paymentData);
        const paymentSpec: PaymentAccept | undefined = paymentData.accepts?.[0]; // Get first payment option
        const priceInUsd = paymentData.price
          || (paymentSpec?.maxAmountRequired
            ? `$${(parseInt(paymentSpec.maxAmountRequired, 10) / 1_000_000).toFixed(2)}`
            : 'Unknown');

        return {
          success: false,
          paymentRequired: {
            price: priceInUsd,
            network: paymentSpec?.network || networkOverride || this.network,
            facilitator: this.getFacilitatorUrl(), // Use dynamic CDP-aware facilitator
            to: paymentSpec?.payTo || '', // Recipient from backend (article author)
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
   * Create an encoded x402 payment header for the selected payment requirements
   */
  private async createPaymentHeaderFromRequirements(
    requirement: PaymentRequirement,
    walletClient: WalletClient
  ): Promise<string> {
    if (!requirement.accept) {
      throw new Error('No x402 payment option returned by facilitator');
    }

    const encodedHeader = await createEncodedPaymentHeader(walletClient, this.X402_VERSION, requirement.accept);
    console.log('🔐 Encoded x402 payment header:', encodedHeader);
    return encodedHeader;
  }

  /**
   * Purchase an article using x402 payment
   */
  async purchaseArticle(
    articleId: number,
    walletClient: WalletClient,
    networkOverride?: SupportedNetwork
  ): Promise<PaymentResponse> {
    try {
      // First attempt without payment to trigger 402 response
      const initialResponse = await this.attemptPayment(`/articles/${articleId}/purchase`, undefined, networkOverride);

      if (initialResponse.paymentRequired && initialResponse.paymentRequired.accept) {
        const encodedHeader = await this.createPaymentHeaderFromRequirements(
          initialResponse.paymentRequired,
          walletClient
        );

        const response = await fetch(this.buildRequestUrl(`/articles/${articleId}/purchase`, networkOverride), {
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

  /**
   * Donate to platform using x402 payment
   */
  async donate(
    amount: number,
    walletClient: WalletClient,
    networkOverride?: SupportedNetwork
  ): Promise<PaymentResponse> {
    try {
      // First request without payment to get requirements from backend
      const response1 = await fetch(this.buildRequestUrl('/donate', networkOverride), {
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

        // Use backend requirements to create payment header
        const encodedHeader = await this.createPaymentHeaderFromRequirements(
          paymentRequirement,
          walletClient
        );

        // Send payment
        const response2 = await fetch(this.buildRequestUrl('/donate', networkOverride), {
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

    /**
 * Tip article author using x402 payment */
  async tip(
    articleId: number,
    amount: number,
    walletClient: WalletClient,
    networkOverride?: SupportedNetwork
  ): Promise<PaymentResponse> {
    try {
      // First request without payment to get requirements from backend
      const response1 = await fetch(this.buildRequestUrl(`/articles/${articleId}/tip`, networkOverride), {
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

        // Use backend requirements to create payment header
        const encodedHeader = await this.createPaymentHeaderFromRequirements(
          paymentRequirement,
          walletClient
        );

        // Send payment
        const response2 = await fetch(this.buildRequestUrl(`/articles/${articleId}/tip`, networkOverride), {
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
          error: result?.error || 'Tip failed',
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

  /**
   * Record article view (NO payment required - views are free)
   */
  async payForView(articleId: number): Promise<PaymentResponse> {
    try {
      await apiService.incrementArticleViews(articleId);

      return {
        success: true,
        receipt: 'View recorded'
      };
    } catch (error) {
      console.error('View tracking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'View tracking failed',
      };
    }
  }

  /**
   * Check if x402 is supported in the current browser
   * We rely on wallet clients with signTypedData support
   */
  isX402Supported(): boolean {
    return true;
  }

  /**
   * Check payment status for a user
   */
  async checkPaymentStatus(articleId: number, userAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:3001/api/payment-status/${articleId}/${userAddress}`);
      const data = await response.json();
      return data.success ? data.data.hasPaid : false;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }
}

export const x402PaymentService = new X402PaymentService();
export default x402PaymentService;
