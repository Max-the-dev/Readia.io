/**
 * Product configuration types for Readia.io ecosystem
 */

export interface ProductConfig {
  /** Unique product identifier (lowercase, alphanumeric) */
  id: string;

  /** Display name of the product */
  name: string;

  /** Short description of the product */
  description: string;

  /** Domain configuration for different environments */
  domains: {
    production: string[];
    staging: string[];
    development: string[];
  };

  /** Product lifecycle mode */
  mode: 'landing' | 'app' | 'hybrid';

  /** Whether the product is enabled in each environment */
  enabled: {
    production: boolean;
    staging: boolean;
    development: boolean;
  };

  /** Feature flags for the product */
  features: {
    wallet: boolean;
    authentication: boolean;
    payments: boolean;
    [key: string]: boolean;
  };

  /** Branding configuration */
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor?: string;
    favicon: string;
  };

  /** Route configuration */
  routes?: {
    home: string;
    [key: string]: string;
  };

  /** API endpoint (if product has its own backend) */
  apiUrl?: string;

  /** Product metadata */
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export type ProductMode = 'landing' | 'app' | 'hybrid';
export type Environment = 'production' | 'staging' | 'development';
