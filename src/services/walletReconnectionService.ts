import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { dynamicClientService } from './dynamicClientService';

export interface ReconnectionResult {
  success: boolean;
  error?: string;
  walletAddress?: string;
}

export class WalletReconnectionService {
  private static instance: WalletReconnectionService;
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 3;
  private reconnectionInProgress = false;
  private reconnectionCallbacks: Array<(result: ReconnectionResult) => void> =
    [];

  static getInstance(): WalletReconnectionService {
    if (!WalletReconnectionService.instance) {
      WalletReconnectionService.instance = new WalletReconnectionService();
    }
    return WalletReconnectionService.instance;
  }

  private constructor() {}

  /**
   * Attempts to reconnect the wallet with exponential backoff
   */
  async reconnectWallet(): Promise<ReconnectionResult> {
    if (this.reconnectionInProgress) {
      // Return a promise that resolves when the current reconnection completes
      return new Promise(resolve => {
        this.reconnectionCallbacks.push(resolve);
      });
    }

    this.reconnectionInProgress = true;
    this.reconnectionAttempts++;

    try {
      const result = await this.attemptReconnection();

      // Notify all waiting callbacks
      this.reconnectionCallbacks.forEach(callback => callback(result));
      this.reconnectionCallbacks = [];

      if (result.success) {
        this.reconnectionAttempts = 0;
      }

      return result;
    } finally {
      this.reconnectionInProgress = false;
    }
  }

  private async attemptReconnection(): Promise<ReconnectionResult> {
    try {
      if (Platform.OS === 'android') {
        return await this.reconnectAndroidWallet();
      } else {
        return await this.reconnectIOSWallet();
      }
    } catch (error) {
      console.error('Wallet reconnection failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during reconnection',
      };
    }
  }

  private async reconnectAndroidWallet(): Promise<ReconnectionResult> {
    try {
      // Check if there's a cached account
      const cachedAccountJSON = await AsyncStorage.getItem('selectedAccount');
      if (cachedAccountJSON) {
        const cachedAccount = JSON.parse(cachedAccountJSON);
        const currentTime = Date.now();

        // Check if cached account is still valid (not expired)
        if (
          cachedAccount.timestamp &&
          currentTime - cachedAccount.timestamp < 7 * 24 * 60 * 60 * 1000
        ) {
          return {
            success: true,
            walletAddress: cachedAccount.account?.address,
          };
        }
      }

      // If cache is invalid or expired, prompt user to reconnect
      return await this.performPlatformSpecificReconnection('Android');
    } catch (error) {
      console.error('Android wallet reconnection failed:', error);
      return {
        success: false,
        error: 'Failed to reconnect Android wallet',
      };
    }
  }

  private async reconnectIOSWallet(): Promise<ReconnectionResult> {
    try {
      // Use the service's built-in authentication check
      const isAuthenticated = dynamicClientService.isUserAuthenticated();

      if (isAuthenticated) {
        const userInfo = dynamicClientService.getUserInfo();
        if (userInfo?.address) {
          return {
            success: true,
            walletAddress: userInfo.address,
          };
        }
      }

      // If not authenticated, prompt user to reconnect
      return await this.performPlatformSpecificReconnection('iOS');
    } catch (error) {
      console.error('iOS wallet reconnection failed:', error);
      return {
        success: false,
        error: 'Failed to reconnect iOS wallet',
      };
    }
  }

  // private async promptUserReconnection(platform: string): Promise<ReconnectionResult> {
  //   return new Promise((resolve) => {
  //     Alert.alert(
  //       'Wallet Connection Expired',
  //       'Your wallet connection has expired. Please reconnect to continue.',
  //       [
  //         {
  //           text: 'Cancel',
  //           style: 'cancel',
  //           onPress: () => resolve({
  //             success: false,
  //             error: 'User cancelled reconnection'
  //           })
  //         },
  //         {
  //           text: 'Reconnect',
  //           onPress: async () => {
  //             try {
  //               const result = await this.performPlatformSpecificReconnection(platform);
  //               resolve(result);
  //             } catch (error) {
  //               resolve({
  //                 success: false,
  //                 error: error instanceof Error ? error.message : 'Reconnection failed'
  //               });
  //             }
  //           }
  //         }
  //       ]
  //     );
  //   });
  // }

  private async performPlatformSpecificReconnection(
    platform: string
  ): Promise<ReconnectionResult> {
    if (platform === 'Android') {
      // For Android, attempt to restore from cached session
      try {
        // Check if there's a more recent cached session
        await this.delay(500); // Small delay to allow for any pending state updates

        const cachedAccountJSON = await AsyncStorage.getItem('selectedAccount');
        if (cachedAccountJSON) {
          const cachedAccount = JSON.parse(cachedAccountJSON);
          if (cachedAccount.account?.address) {
            return {
              success: true,
              walletAddress: cachedAccount.account.address,
            };
          }
        }

        return {
          success: false,
          error: 'WALLET_RECONNECTION_NEEDED', // Special error code for UI handling
        };
      } catch (error) {
        return {
          success: false,
          error: 'WALLET_RECONNECTION_NEEDED',
        };
      }
    } else {
      // For iOS, attempt Dynamic reconnection with auth UI
      try {
        // First try to refresh the existing session
        const dynamicClient = dynamicClientService.getDynamicClient();
        if (dynamicClient) {
          // Check if we can restore the session without showing UI
          if (dynamicClientService.isUserAuthenticated()) {
            const userInfo = dynamicClientService.getUserInfo();
            if (userInfo?.address) {
              return {
                success: true,
                walletAddress: userInfo.address,
              };
            }
          }

          // If not authenticated, show the Dynamic auth UI
          console.log('🔄 Showing Dynamic auth UI for reconnection...');
          await dynamicClientService.showAuthUI();

          // Check if user completed authentication
          if (dynamicClientService.isUserAuthenticated()) {
            const userInfo = dynamicClientService.getUserInfo();
            if (userInfo?.address) {
              return {
                success: true,
                walletAddress: userInfo.address,
              };
            }
          }
        }

        // If Dynamic client is not available or auth failed
        return {
          success: false,
          error: 'WALLET_RECONNECTION_NEEDED',
        };
      } catch (error) {
        console.error('Dynamic auth UI failed:', error);
        return {
          success: false,
          error: 'WALLET_RECONNECTION_NEEDED',
        };
      }
    }
  }

  /**
   * Delay helper for reconnection attempts
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Checks if we should attempt reconnection based on current attempt count
   */
  shouldAttemptReconnection(): boolean {
    return this.reconnectionAttempts < this.maxReconnectionAttempts;
  }

  /**
   * Resets reconnection attempt counter
   */
  resetReconnectionAttempts(): void {
    this.reconnectionAttempts = 0;
  }
}

export const walletReconnectionService =
  WalletReconnectionService.getInstance();
