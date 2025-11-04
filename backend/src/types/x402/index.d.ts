declare module 'x402-express' {
  import { RequestHandler } from 'express';

  interface PaymentConfig {
    price: string;
    network: string;
  }

  interface PaymentRoutes {
    [route: string]: PaymentConfig;
  }

  interface FacilitatorConfig {
    url: string;
  }

  export function paymentMiddleware(
    walletAddress: string,
    routes: PaymentRoutes,
    facilitator: FacilitatorConfig
  ): RequestHandler;
}

declare module '@coinbase/x402' {
  export interface FacilitatorConfig {
    url: string;
    createAuthHeaders?: () => Promise<{
      verify: Record<string, string>;
      settle: Record<string, string>;
      supported: Record<string, string>;
      list?: Record<string, string>;
    }>;
  }

  export const facilitator: FacilitatorConfig;
  export function createFacilitatorConfig(apiKeyId?: string, apiKeySecret?: string): FacilitatorConfig;
}

declare module 'x402/types' {
  export interface PaymentAuthorization {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  }

  export interface PaymentPayload {
    x402Version: number;
    scheme: string;
    network: string;
    payload: {
      signature: string;
      authorization: PaymentAuthorization;
    };
  }

  export interface PaymentRequirements {
    scheme: 'exact';
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    outputSchema?: Record<string, unknown>;
    extra?: Record<string, unknown>;
  }

  export const PaymentPayloadSchema: {
    parse: (input: unknown) => PaymentPayload;
  };
}

declare module 'x402/verify' {
  import type { PaymentPayload, PaymentRequirements } from 'x402/types';

  export interface VerifyResponse {
    isValid: boolean;
    invalidReason?: string;
    payer?: string;
  }

  export interface FacilitatorClient {
    verify(payload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse>;
    settle: (...args: any[]) => Promise<any>;
    supported: (...args: any[]) => Promise<any>;
    list: (...args: any[]) => Promise<any>;
  }

  export type CreateHeaders = () => Promise<{
    verify: Record<string, string>;
    settle: Record<string, string>;
    supported: Record<string, string>;
    list?: Record<string, string>;
  }>;

  export function useFacilitator(config?: any): FacilitatorClient;
}
