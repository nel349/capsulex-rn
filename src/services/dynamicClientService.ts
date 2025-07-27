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
    const hasAuth = !!client?.auth?.authenticatedUser;
    const hasWallet = !!client?.wallets?.primary;
    const result = hasAuth && hasWallet;

    console.log('🔍 Dynamic Auth Status:', {
      hasClient: !!client,
      hasAuth,
      hasWallet,
      result,
      authUser: client?.auth?.authenticatedUser?.email || 'none',
      walletAddress:
        client?.wallets?.primary?.address?.slice(0, 8) + '...' || 'none',
    });

    return result;
  }

  // Helper method to validate wallet session for transactions
  async validateWalletSession(): Promise<boolean> {
    console.log('🔍 Starting wallet session validation...');
    try {
      const client = this.getDynamicClient();
      if (!client) {
        console.log('❌ No dynamic client available');
        return false;
      }

      if (!this.isUserAuthenticated()) {
        console.log('❌ Basic auth check failed');
        return false;
      }

      console.log('🔍 Attempting to get signer...');
      // Try to get signer to validate the session is actually active
      let signer;
      try {
        signer = this.getSigner();
        console.log('✅ Successfully got signer');
      } catch (signerError) {
        console.log(
          '❌ Could not get signer - session likely expired:',
          signerError
        );
        return false;
      }

      if (!signer) {
        console.log('❌ Signer is null - session likely expired');
        return false;
      }

      console.log('🔍 Attempting to get public key...');
      // Additional check: try to get the public key to ensure wallet is responsive
      let publicKey;
      try {
        publicKey = signer.publicKey;
        console.log('✅ Successfully got public key:', publicKey?.toBase58());
      } catch (pkError) {
        console.log(
          '❌ Could not get public key - wallet session invalid:',
          pkError
        );
        return false;
      }

      if (!publicKey) {
        console.log('❌ Public key is null - wallet session invalid');
        return false;
      }

      // Try a simple operation to test if the wallet is actually responsive
      console.log('🔍 Testing wallet responsiveness...');
      try {
        // Test if we can access wallet properties without throwing
        const walletAddress = client.wallets?.primary?.address;
        if (!walletAddress) {
          console.log('❌ Cannot access wallet address - session invalid');
          return false;
        }
        console.log(
          '✅ Wallet is responsive, address:',
          walletAddress.slice(0, 8) + '...'
        );
      } catch (walletError) {
        console.log('❌ Wallet responsiveness test failed:', walletError);
        return false;
      }

      console.log('✅ Wallet session validation passed completely');
      return true;
    } catch (error) {
      console.log('❌ Wallet session validation failed with error:', error);
      return false;
    }
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

    if (!client) {
      console.error('🔍 getSigner: No Dynamic client available');
      throw new Error(
        'Dynamic client not available - WebView may be unmounted'
      );
    }

    const primaryWallet = client.wallets?.primary;

    if (!primaryWallet) {
      console.error('🔍 getSigner: No primary wallet available');
      throw new Error(
        'Primary wallet not available - user may not be authenticated'
      );
    }

    const walletAddress = primaryWallet.address;
    if (!walletAddress) {
      console.error('🔍 getSigner: Primary wallet has no address');
      throw new Error(
        'Wallet address not available - wallet may be disconnected'
      );
    }

    try {
      console.log(
        '🔍 getSigner: Attempting to get signer for wallet:',
        walletAddress.slice(0, 8) + '...'
      );
      const signer = client.solana.getSigner({ wallet: primaryWallet });
      console.log('✅ getSigner: Successfully obtained signer');
      return signer;
    } catch (error) {
      console.error('❌ getSigner: Failed to get signer:', error);
      throw new Error(
        `Failed to get wallet signer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Comprehensive wallet debugging function
  debugWalletState() {
    console.log('🔬 === WALLET DEBUG START ===');
    try {
      const client = this.getDynamicClient();
      console.log('🔬 Client exists:', !!client);

      if (client) {
        console.log('🔬 Auth exists:', !!client.auth);
        console.log('🔬 Auth user exists:', !!client.auth?.authenticatedUser);
        console.log(
          '🔬 Auth user email:',
          client.auth?.authenticatedUser?.email
        );

        console.log('🔬 Wallets exists:', !!client.wallets);
        console.log('🔬 Primary wallet exists:', !!client.wallets?.primary);
        console.log(
          '🔬 Primary wallet address:',
          client.wallets?.primary?.address
        );

        console.log('🔬 Solana exists:', !!client.solana);

        try {
          console.log('🔬 Attempting to get connection...');
          const connection = client.solana?.getConnection();
          console.log('🔬 Connection success:', !!connection);
        } catch (connError) {
          console.log('🔬 Connection error:', connError);
        }

        try {
          console.log('🔬 Attempting to get signer...');
          const signer = this.getSigner();
          console.log('🔬 Signer success:', !!signer);
          console.log('🔬 Signer public key:', signer?.publicKey?.toBase58());
        } catch (signerError) {
          console.log('🔬 Signer error:', signerError);
        }
      }
    } catch (error) {
      console.log('🔬 Debug error:', error);
    }
    console.log('🔬 === WALLET DEBUG END ===');
  }
}

export const dynamicClientService = new DynamicClientService();
