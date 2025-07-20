// User Service - Handles all user-related API calls
import { ApiError } from '../types/api';
import type {
  User,
  AuthResponse,
  CreateUserRequest,
  ApiResponse,
} from '../types/api';

import { apiService } from './api';

type WalletType = 'wallet' | 'privy';

export class UserService {
  /**
   * Register or authenticate a user
   * If user exists, returns existing user data
   * If user doesn't exist, creates new user
   */
  async registerUser(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        '/users/auth',
        userData
      );

      if (!response.success || !response.data) {
        throw new ApiError(response.error || 'Failed to register user');
      }

      return response.data;
    } catch (error) {
      console.error('UserService: Register user error:', error);
      throw error;
    }
  }

  /**
   * Register a wallet user (for Android MWA)
   */
  async registerWalletUser(
    walletAddress: string,
    walletType: WalletType,
    name?: string
  ): Promise<AuthResponse> {
    return this.registerUser({
      wallet_address: walletAddress,
      auth_type: walletType,
      name,
    });
  }

  /**
   * Register a Privy user (for iOS/web)
   */
  async registerPrivyUser(
    walletAddress: string,
    privyUserId: string,
    email?: string,
    name?: string
  ): Promise<AuthResponse> {
    return this.registerUser({
      wallet_address: walletAddress,
      auth_type: 'privy',
      privy_user_id: privyUserId,
      email,
      name,
    });
  }

  /**
   * Get user profile by wallet address
   */
  async getUserProfile(walletAddress: string): Promise<User> {
    try {
      const response = await apiService.get<User>(
        `/users/profile/${walletAddress}`
      );

      if (!response.success || !response.data) {
        throw new ApiError(response.error || 'User not found');
      }

      return response.data;
    } catch (error) {
      console.warn('UserService: Get user profile error:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by wallet address
   */
  async userExists(walletAddress: string): Promise<boolean> {
    try {
      const data = await this.getUserProfile(walletAddress);
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          // User not found - this is expected for new users
          return false;
        } else if (error.statusCode === 500) {
          // Server error - check if it's specifically a "no rows" error
          // there can be no multiple users with the same wallet address we dont allow that in the database
          // if this error is thrown, it means that the user is not registered
          if (error.message.includes('multiple (or no) rows returned')) {
            console.log('User does not exist!!');

            // user does not exist, so we return false
            return false;
          }
          // Other 500 errors should be thrown
          throw error;
        }
      }
      // Re-throw other errors (network, server errors, etc.)
      throw error;
    }
  }

  // New method to delete a user by wallet address
  async deleteUser(walletAddress: string): Promise<ApiResponse<null>> {
    try {
      const response = await apiService.delete<null>(`/users/${walletAddress}`);

      if (!response.success) {
        throw new ApiError(response.error || 'Failed to delete user');
      }

      return response;
    } catch (error) {
      console.error('UserService: Delete user error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();

// Export types for convenience
export type { User, AuthResponse, CreateUserRequest };
export { ApiError };
