import { Platform } from 'react-native';

// Dynamic client service to avoid require cycles
class DynamicClientService {
  private client: any = null;
  private initialized = false;

  getDynamicClient() {
    if (Platform.OS !== 'ios') {
      return null;
    }

    if (!this.initialized) {
      try {
        // Use dynamic import to avoid require cycle
        const AppModule = require('../../App');
        this.client = AppModule.dynamicClient;
        if (!this.client) {
          console.warn('Dynamic client not found in App module');
        } else {
          console.log('✅ Dynamic client loaded via service');
        }
      } catch (error) {
        console.warn('Dynamic client not available:', error);
      }
      this.initialized = true;
    }

    return this.client;
  }

  // Helper method to check if user is authenticated
  isUserAuthenticated(): boolean {
    const client = this.getDynamicClient();
    return !!(client?.auth?.authenticatedUser && client?.wallets?.primary);
  }

  // Helper method to get user info
  getUserInfo(): { address: string; name: string } | null {
    const client = this.getDynamicClient();
    if (this.isUserAuthenticated()) {
      return {
        address: client.wallets.primary.address,
        name: client.auth.authenticatedUser?.email || 'User',
      };
    }
    return null;
  }

  // Helper method to show auth UI
  async showAuthUI(): Promise<void> {
    const client = this.getDynamicClient();
    if (client) {
      await client.ui.auth.show();
    } else {
      throw new Error('Dynamic client not available');
    }
  }

  // Helper method to get Solana connection
  getConnection(options?: { commitment?: string }) {
    const client = this.getDynamicClient();
    if (client) {
      return client.solana.getConnection(
        options || { commitment: 'processed' }
      );
    }
    throw new Error('Dynamic client not available');
  }

  // Helper method to get Solana signer
  getSigner() {
    const client = this.getDynamicClient();
    const primaryWallet = client?.wallets?.primary;

    if (client && primaryWallet) {
      return client.solana.getSigner({ wallet: primaryWallet });
    }
    throw new Error('Dynamic client or primary wallet not available');
  }
}

export const dynamicClientService = new DynamicClientService();
