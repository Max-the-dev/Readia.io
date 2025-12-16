/**
 * Domain-based routing utilities for Readia.io ecosystem
 *
 * This file provides utilities to detect which product is being accessed
 * based on the hostname, and to manage product configurations.
 */

export type ProductDomain =
  | 'hub'           // readia.io
  | 'shillquest'    // shillquest.readia.io
  | 'publish'       // publish.readia.io
  | 'dao'           // dao.readia.io
  | 'investor'      // investor.readia.io
  | 'memestack';    // memestack.readia.io

export interface DomainConfig {
  production: string[];
  staging: string[];
  development: string[];
}

const DOMAIN_MAP: Record<ProductDomain, DomainConfig> = {
  hub: {
    production: ['readia.io', 'www.readia.io'],
    staging: ['hub.staging.readia.io', 'staging.readia.io'],
    development: ['localhost:3000', '127.0.0.1:3000']
  },
  shillquest: {
    production: ['shillquest.readia.io', 'www.shillquest.readia.io'],
    staging: ['shillquest.staging.readia.io'],
    development: ['localhost:3001', 'shillquest.localhost:3000', '127.0.0.1:3001']
  },
  publish: {
    production: ['publish.readia.io', 'www.publish.readia.io'],
    staging: ['publish.staging.readia.io'],
    development: ['localhost:3002', 'publish.localhost:3000', '127.0.0.1:3002']
  },
  dao: {
    production: ['dao.readia.io', 'www.dao.readia.io'],
    staging: ['dao.staging.readia.io'],
    development: ['localhost:3003', 'dao.localhost:3000', '127.0.0.1:3003']
  },
  investor: {
    production: ['investor.readia.io', 'www.investor.readia.io'],
    staging: ['investor.staging.readia.io'],
    development: ['localhost:3004', 'investor.localhost:3000', '127.0.0.1:3004']
  },
  memestack: {
    production: ['memestack.readia.io', 'www.memestack.readia.io'],
    staging: ['memestack.staging.readia.io'],
    development: ['localhost:3005', 'memestack.localhost:3000', '127.0.0.1:3005']
  }
};

/**
 * Get the current product based on hostname
 *
 * @returns The product domain identifier
 */
export function getCurrentProduct(): ProductDomain {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const fullHost = port ? `${hostname}:${port}` : hostname;

  // Check each product's domain config
  for (const [product, config] of Object.entries(DOMAIN_MAP)) {
    const allDomains = [
      ...config.production,
      ...config.staging,
      ...config.development
    ];

    if (allDomains.includes(fullHost)) {
      return product as ProductDomain;
    }
  }

  // Default to hub for unknown domains
  console.warn(`Unknown domain ${fullHost}, defaulting to hub`);
  return 'hub';
}

/**
 * Get the current environment
 *
 * @returns The environment (production, staging, or development)
 */
export function getEnvironment(): 'production' | 'staging' | 'development' {
  const hostname = window.location.hostname;

  if (hostname.includes('staging')) return 'staging';
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  }
  return 'production';
}

/**
 * Check if a product is enabled for the current environment
 *
 * @param product The product domain identifier
 * @returns Whether the product is enabled
 */
export function isProductEnabled(product: ProductDomain): boolean {
  const env = getEnvironment();

  // Get config from environment variables
  const envVarName = `VITE_${product.toUpperCase()}_ENABLED_${env.toUpperCase()}`;
  const enabled = import.meta.env[envVarName];

  // Default behavior
  if (enabled === undefined) {
    // In development and staging, enable by default
    if (env === 'development' || env === 'staging') return true;
    // In production, require explicit enablement
    return false;
  }

  return enabled === 'true';
}

/**
 * Get the product mode (landing, app, or hybrid)
 *
 * @param product The product domain identifier
 * @returns The product mode
 */
export function getProductMode(product: ProductDomain): 'landing' | 'app' | 'hybrid' {
  const envVarName = `VITE_${product.toUpperCase()}_MODE`;
  const mode = import.meta.env[envVarName];

  if (mode === 'landing' || mode === 'app' || mode === 'hybrid') {
    return mode;
  }

  // Default to 'app' mode
  return 'app';
}

/**
 * Get the domain for a specific product
 *
 * @param product The product domain identifier
 * @param environment Optional environment override
 * @returns The primary domain for the product
 */
export function getProductDomain(
  product: ProductDomain,
  environment?: 'production' | 'staging' | 'development'
): string {
  const env = environment || getEnvironment();
  const config = DOMAIN_MAP[product];
  return config[env][0]; // Return first domain (primary)
}

/**
 * Generate a URL for a specific product and path
 *
 * @param product The product domain identifier
 * @param path The path within the product
 * @param environment Optional environment override
 * @returns The full URL
 */
export function getProductUrl(
  product: ProductDomain,
  path: string = '',
  environment?: 'production' | 'staging' | 'development'
): string {
  const domain = getProductDomain(product, environment);
  const env = environment || getEnvironment();
  const protocol = env === 'development' ? 'http' : 'https';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${protocol}://${domain}${cleanPath}`;
}

/**
 * Navigate to a different product
 *
 * @param product The product domain identifier
 * @param path Optional path within the product
 */
export function navigateToProduct(product: ProductDomain, path: string = ''): void {
  const url = getProductUrl(product, path);
  window.location.href = url;
}
