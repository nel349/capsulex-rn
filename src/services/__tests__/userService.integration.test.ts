import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import { userService, ApiError } from '../userService';
import nodeFetch, { Response as NodeFetchResponse } from 'node-fetch';

// Integration tests - these test against the real backend API
// Make sure the backend is running on port 3001 before running these tests

describe('UserService Integration Tests', () => {
  const testWalletAddress = `test-wallet-${Date.now()}`;
  
  beforeAll(async () => {
    // Mock Platform.select for api.ts
    vi.mock('react-native', () => ({
      Platform: {
        select: vi.fn(obj => obj.ios || obj.default),
      },
    }));
    
    // Check if backend is running
    try {
      console.log('Checking backend health at http://localhost:3001/health...');
      const response: NodeFetchResponse = await nodeFetch('http://localhost:3001/health');
      console.log('Health check response:', response);
      console.log('Health check response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Backend health check failed with status: ${response.status}`);
      }
      
      const healthData = await response.json();
      console.log('Backend health data:', healthData);
    } catch (error) {
      console.error('Health check failed with error:', error);
      throw new Error(
        `Backend connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure backend is running on port 3001.`
      );
    }
  });

  // Add afterAll hook to clean up test user
  /*
  afterAll(async () => {
    try {
      console.log(`Cleaning up test user: ${testWalletAddress}`);
      await userService.deleteUser(testWalletAddress);
      console.log(`Test user ${testWalletAddress} deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting test user ${testWalletAddress}:`, error);
      // Don't re-throw, as cleanup shouldn't fail tests
    }
  });
  */

  describe('registerWalletUser', () => {
    it('should successfully register a new wallet user', async () => {
      const result = await userService.registerWalletUser(
        testWalletAddress,
        'Integration Test User'
      );

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.wallet_address).toBe(testWalletAddress);
      expect(result.user.auth_type).toBe('wallet');
      expect(result.user.name).toBe('Integration Test User');
    });

    it('should return existing user when registering same wallet again', async () => {
      // Register same wallet again
      const result = await userService.registerWalletUser(
        testWalletAddress,
        'Updated Name'
      );

      expect(result).toBeDefined();
      expect(result.user.wallet_address).toBe(testWalletAddress);
      expect(result.user.auth_type).toBe('wallet');
      // Should still have original name (existing user)
      expect(result.user.name).toBe('Integration Test User');
    });

    it('should handle invalid wallet address', async () => {
      await expect(
        userService.registerWalletUser('')
      ).rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should successfully get user profile', async () => {
      const result = await userService.getUserProfile(testWalletAddress);

      expect(result).toBeDefined();
      expect(result.wallet_address).toBe(testWalletAddress);
      expect(result.auth_type).toBe('wallet');
      expect(result.name).toBe('Integration Test User');
    });

    it('should handle user not found', async () => {
      const nonExistentWallet = `non-existent-${Date.now()}`;
      
      await expect(
        userService.getUserProfile(nonExistentWallet)
      ).rejects.toThrow(ApiError);
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', async () => {
      const result = await userService.userExists(testWalletAddress);
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const nonExistentWallet = `non-existent-${Date.now()}`;
      const result = await userService.userExists(nonExistentWallet);
      expect(result).toBe(false);
    });
  });

  describe('registerPrivyUser', () => {
    it('should successfully register a Privy user', async () => {
      const privyWallet = `privy-wallet-${Date.now()}`;
      const privyUserId = `privy-user-${Date.now()}`;
      
      const result = await userService.registerPrivyUser(
        privyWallet,
        privyUserId,
        'test@privy.com',
        'Privy Test User'
      );

      expect(result).toBeDefined();
      expect(result.user.wallet_address).toBe(privyWallet);
      expect(result.user.auth_type).toBe('privy');
      expect(result.user.email).toBe('test@privy.com');
      expect(result.user.name).toBe('Privy Test User');
    });
  });
});