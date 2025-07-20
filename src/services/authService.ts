import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import type { CreateUserRequest, AuthResponse } from '../types/api';

import { apiService } from './api';

const TOKEN_STORAGE_KEY = 'auth-token';
const USER_STORAGE_KEY = 'auth-user';

export function useAuthService() {
  const authenticateUser = useCallback(
    async (authData: CreateUserRequest): Promise<AuthResponse> => {
      const response = await apiService.post<AuthResponse>(
        '/users/auth',
        authData
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Authentication failed');
      }

      // Store token and user info
      console.log('🔑 Storing auth token:', {
        tokenPrefix: response.data.token.substring(0, 20) + '...',
        userId: response.data.user.user_id,
        walletAddress: response.data.user.wallet_address,
      });
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
      await AsyncStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(response.data.user)
      );

      return response.data;
    },
    []
  );

  const getStoredToken = useCallback(async (): Promise<string | null> => {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  }, []);

  const getStoredUser = useCallback(async () => {
    const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }, []);

  const clearAuth = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const isAuthenticated = useCallback(async (): Promise<boolean> => {
    const token = await getStoredToken();
    return !!token;
  }, [getStoredToken]);

  return {
    authenticateUser,
    getStoredToken,
    getStoredUser,
    clearAuth,
    isAuthenticated,
  };
}
