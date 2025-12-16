/**
 * Central product registry for Readia.io ecosystem
 *
 * This file registers all products in the ecosystem and provides
 * utilities to access their configurations.
 */

import { ProductConfig } from '../shared/types/config';

// Import product configs (uncomment as products are created)
// import hubConfig from '../apps/hub/config';
// import shillQuestConfig from '../apps/shill-quest/config';
// import publishConfig from '../apps/publish/config';
// import daoConfig from '../apps/dao/config';
// import investorConfig from '../apps/investor/config';
// import memestackConfig from '../apps/memestack/config';

/**
 * Example product configuration
 */
const exampleConfig: ProductConfig = {
  id: 'example',
  name: 'Example Product',
  description: 'An example product configuration',
  domains: {
    production: ['example.readia.io'],
    staging: ['example.staging.readia.io'],
    development: ['localhost:3010']
  },
  mode: 'app',
  enabled: {
    production: false,
    staging: true,
    development: true
  },
  features: {
    wallet: true,
    authentication: true,
    payments: false
  },
  branding: {
    logo: '/example-logo.svg',
    primaryColor: '#6366f1',
    favicon: '/example-favicon.ico'
  },
  routes: {
    home: '/',
    about: '/about'
  }
};

/**
 * Product registry - maps product IDs to their configurations
 */
export const PRODUCTS: Record<string, ProductConfig> = {
  // Uncomment as products are created:
  // hub: hubConfig,
  // shillquest: shillQuestConfig,
  // publish: publishConfig,
  // dao: daoConfig,
  // investor: investorConfig,
  // memestack: memestackConfig,

  example: exampleConfig, // Remove this when real products are added
};

/**
 * Get a product configuration by ID
 *
 * @param productId The product identifier
 * @returns The product configuration or undefined if not found
 */
export function getProductConfig(productId: string): ProductConfig | undefined {
  return PRODUCTS[productId];
}

/**
 * Get all products enabled for a specific environment
 *
 * @param environment The environment to check
 * @returns Array of enabled product configurations
 */
export function getActiveProducts(
  environment: 'production' | 'staging' | 'development'
): ProductConfig[] {
  return Object.values(PRODUCTS).filter(
    product => product.enabled[environment]
  );
}

/**
 * Get all product IDs
 *
 * @returns Array of product IDs
 */
export function getAllProductIds(): string[] {
  return Object.keys(PRODUCTS);
}

/**
 * Check if a product exists
 *
 * @param productId The product identifier
 * @returns Whether the product exists in the registry
 */
export function productExists(productId: string): boolean {
  return productId in PRODUCTS;
}
