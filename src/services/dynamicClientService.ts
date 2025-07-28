import { Platform } from 'react-native';

import { dynamicClient } from '../../App';
import { Commitment } from '@solana/web3.js';
import { UserInfo } from '../types/api';

type DynamicClient = typeof dynamicClient;

// Dynamic client service to avoid require cycles
class DynamicClientService {
  private client: DynamicClient | null = null;
  private initialized = false;

  getDynamicClient() {
    if (Platform.OS !== 'ios') {
      return null;
    }

    if (!this.initialized) {
      try {
        // Use dynamic import to avoid require cycle
        this.client = dynamicClient;
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
        address: client?.wallets?.primary?.address || '',
        name: client?.auth?.authenticatedUser?.email || 'User',
      };
    }
    return null;
  }

  // Helper method to refresh/reconnect the client
  refreshClient(): void {
    console.log('🔄 Refreshing Dynamic client...');
    this.initialized = false;
    this.client = null;
    // Force re-initialization on next getDynamicClient call
    this.getDynamicClient();
  }

  // Helper method to show auth UI
  async showAuthUI(callback: (isAuthenticated: boolean, userInfo?: UserInfo) => void): Promise<void> {

    this.addAuthStateListener(callback);

    const client = this.getDynamicClient();
    if (client) {
      await client.ui.auth.show();
    } else {
      throw new Error('Dynamic client not available');
    }
  }

  // Add event listener for auth state changes
  addAuthStateListener(callback: (isAuthenticated: boolean, userInfo?: UserInfo) => void): () => void {
    const client = this.getDynamicClient();
    if (!client) {
      console.warn('Cannot add auth state listener - no client available');
      return () => {};
    }

    if (client.auth && typeof client.auth.on === 'function') {
      console.log('🔊 Adding ALL Dynamic event listeners for debugging... Inside the function');
      
      const handleAuthSuccess = (user: any) => {
        console.log('🔔 ✅ AUTH SUCCESS:', user);
        callback(true, user);
      };
      
      const handleAuthFailed = (error: any) => {
        console.log('🔔 ❌ AUTH FAILED:', error);
      };
      
      const handleLoggedOut = () => {
        console.log('🔔 🚪 LOGGED OUT');
        callback(false);
      };
      
      const handleAuthInit = () => {
        console.log('🔔 🚀 AUTH INIT');
      };
      
      const handleUserChanged = (user: any) => {
        console.log('🔔 👤 USER CHANGED:', user);
        callback(!!user, user);
      };
      
      // Listen to ALL auth events for debugging
      client.auth.on('authSuccess', handleAuthSuccess);
      client.auth.on('authFailed', handleAuthFailed);
      client.auth.on('loggedOut', handleLoggedOut);
      client.auth.on('authInit', handleAuthInit);
      client.auth.on('authenticatedUserChanged', handleUserChanged);
      
      // Also listen to UI events
      if (client.ui && typeof client.ui.on === 'function') {
        const handleAuthFlowClosed = () => {
          console.log('🔔 🚪 AUTH FLOW CLOSED');
        };
        
        const handleAuthFlowCancelled = () => {
          console.log('🔔 ❌ AUTH FLOW CANCELLED');
        };
        
        client.ui.on('authFlowClosed', handleAuthFlowClosed);
        client.ui.on('authFlowCancelled', handleAuthFlowCancelled);
      }
      
      // Return cleanup function
      return () => {
        if (client.auth && typeof client.auth.off === 'function') {
          client.auth.off('authSuccess', handleAuthSuccess);
          client.auth.off('authFailed', handleAuthFailed);
          client.auth.off('loggedOut', handleLoggedOut);
          client.auth.off('authInit', handleAuthInit);
          client.auth.off('authenticatedUserChanged', handleUserChanged);
        }
      };
    }

    console.warn('Dynamic client does not support auth state listeners');
    return () => {};
  }

  // Helper method to get Solana connection
  getConnection(options?: { commitment?: Commitment }) {
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

  // sign out the user from the dynamic client
  async signOut() {
    const client = this.getDynamicClient();
    if (client) {
      await client.auth.logout();
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
