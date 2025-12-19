// Simplified x402 payment service - let the protocol handle everything
import { apiService, API_BASE_URL } from './api';

class SimpleX402Service {
  /**
   * Attempt to purchase an article using x402
   * This is the SIMPLE way - just make the request and let x402-express handle it
   */
  async purchaseArticle(articleId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Just make a normal POST request - x402-express will handle the rest
      const response = await fetch(`${API_BASE_URL}/articles/${articleId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 402) {
        // Payment required - this is normal for x402
        // In a real x402 client, the browser/extension would handle this automatically
        return {
          success: false,
          error: 'Payment required - x402 client needed'
        };
      }

      if (response.ok) {
        return { success: true };
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Fallback to regular API purchase (no x402)
   */
  async fallbackPurchase(articleId: number): Promise<boolean> {
    try {
      const response = await apiService.recordPurchase(articleId);
      return response.success;
    } catch (error) {
      console.error('Fallback purchase failed:', error);
      return false;
    }
  }

  /**
   * Check if x402 is supported
   * Simplified detection - just check for payment API
   */
  isX402Supported(): boolean {
    // Check for Payment Request API or Web Monetization
    return 'PaymentRequest' in window || 'monetization' in navigator;
  }
}

export const simpleX402Service = new SimpleX402Service();
export default simpleX402Service;