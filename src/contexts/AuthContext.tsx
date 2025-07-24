import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuthorization } from '../utils/useAuthorization';

// Note: Removed Dynamic client import to avoid require cycle with App.tsx

interface AuthContextType {
  isAuthenticated: boolean;
  walletAddress: string | null;
  isSupported: boolean;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  // eslint-disable-next-line no-unused-vars
  setOnboardingComplete: (complete: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  saveDynamicAuthState: (
    // eslint-disable-next-line no-unused-vars
    isAuth: boolean,
    // eslint-disable-next-line no-unused-vars
    address: string | null
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { selectedAccount, isSupported } = useAuthorization();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isDynamicRestored, setIsDynamicRestored] = useState(false);
  const [dynamicAuthState, setDynamicAuthState] = useState<{
    isAuthenticated: boolean;
    walletAddress: string | null;
  }>({ isAuthenticated: false, walletAddress: null });

  const handleSetOnboardingComplete = async (complete: boolean) => {
    console.log('🔄 Setting onboarding complete:', complete);
    setIsOnboardingComplete(complete);
    try {
      if (complete) {
        await AsyncStorage.setItem('onboarding_completed', 'true');
      } else {
        await AsyncStorage.removeItem('onboarding_completed');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Save Dynamic auth state to AsyncStorage
  const saveDynamicAuthState = async (
    isAuth: boolean,
    address: string | null
  ) => {
    try {
      if (isAuth && address) {
        await AsyncStorage.setItem(
          'dynamic_auth_state',
          JSON.stringify({
            isAuthenticated: true,
            walletAddress: address,
            timestamp: Date.now(),
          })
        );
        // Also update local state immediately
        setDynamicAuthState({
          isAuthenticated: true,
          walletAddress: address,
        });
        console.log('💾 Dynamic auth state saved:', address);
      } else {
        await AsyncStorage.removeItem('dynamic_auth_state');
        // Clear local state immediately
        setDynamicAuthState({ isAuthenticated: false, walletAddress: null });
        console.log('🗑️ Dynamic auth state cleared');
      }
    } catch (error) {
      console.error('Error saving Dynamic auth state:', error);
    }
  };

  // Restore Dynamic auth state from AsyncStorage
  const restoreDynamicAuthState = async () => {
    try {
      const saved = await AsyncStorage.getItem('dynamic_auth_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        const age = Date.now() - parsed.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (age < maxAge) {
          console.log('✅ Restored Dynamic auth state:', parsed.walletAddress);

          // Check if we also have a valid JWT token
          const authToken = await AsyncStorage.getItem('auth-token');
          if (authToken) {
            console.log(
              '✅ JWT token also available for restored Dynamic auth'
            );
            console.log('🔄 Setting Dynamic auth state to authenticated');
            setDynamicAuthState({
              isAuthenticated: true,
              walletAddress: parsed.walletAddress,
            });
            return true;
          } else {
            console.log('❌ No JWT token found, Dynamic auth state invalid');
            console.log('🗑️ Removing Dynamic auth state due to missing JWT');
            await AsyncStorage.removeItem('dynamic_auth_state');
          }
        } else {
          console.log('⏰ Dynamic auth state expired, clearing');
          await AsyncStorage.removeItem('dynamic_auth_state');
        }
      }
    } catch (error) {
      console.error('Error restoring Dynamic auth state:', error);
    }
    return false;
  };

  // Clear onboarding completion when wallet disconnects
  useEffect(() => {
    // Skip this check during restoration process on iOS
    if (Platform.OS === 'ios' && !isDynamicRestored) {
      console.log(
        '⏸️ Skipping wallet check - Dynamic auth restoration in progress'
      );
      return;
    }

    // Check if both wallet sources are disconnected
    const hasWallet =
      !!selectedAccount?.publicKey ||
      (Platform.OS === 'ios' && dynamicAuthState.isAuthenticated);

    console.log('🔍 Wallet connection check:', {
      selectedAccount: !!selectedAccount?.publicKey,
      dynamicAuth: dynamicAuthState.isAuthenticated,
      hasWallet,
      isOnboardingComplete,
      platform: Platform.OS,
      isDynamicRestored,
    });

    if (!hasWallet && isOnboardingComplete) {
      console.log('🗑️ Wallet disconnected - clearing all onboarding state');
      handleSetOnboardingComplete(false);

      // Clear Dynamic auth state too (only relevant for iOS)
      if (Platform.OS === 'ios') {
        saveDynamicAuthState(false, null);
        setDynamicAuthState({ isAuthenticated: false, walletAddress: null });
      }

      // Also clear onboarding flow state to ensure fresh start
      AsyncStorage.multiRemove([
        'onboarding_in_progress',
        'onboarding_step',
        'onboarding_user_name',
        'onboarding_wallet_address',
        'onboarding_social_connected',
      ]).catch(error => {
        console.error('Error clearing onboarding flow state:', error);
      });
    }
  }, [
    selectedAccount?.publicKey,
    dynamicAuthState.isAuthenticated,
    isOnboardingComplete,
    isDynamicRestored,
  ]);

  // Restore Dynamic authentication state on app startup (iOS only)
  useEffect(() => {
    const restoreDynamicAuth = async () => {
      if (Platform.OS === 'ios') {
        try {
          console.log('🔄 Restoring Dynamic authentication state...');

          // Restore from AsyncStorage
          await restoreDynamicAuthState();

          setIsDynamicRestored(true);
        } catch (error) {
          console.error('Error restoring Dynamic auth:', error);
          setIsDynamicRestored(true); // Continue even if restore fails
        }
      } else {
        setIsDynamicRestored(true); // Not needed for Android
      }
    };

    restoreDynamicAuth();
  }, []);

  // Check if user has completed onboarding before
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        // console.log('🔍 Checking onboarding completion status:', completed);
        setIsOnboardingComplete(completed === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Check authentication - either Solana Mobile Wallet or Dynamic (iOS)
  const isAuthenticated =
    !!selectedAccount?.publicKey ||
    (Platform.OS === 'ios' &&
      isDynamicRestored &&
      dynamicAuthState.isAuthenticated);

  // Get wallet address from either source
  const walletAddress =
    selectedAccount?.publicKey?.toBase58() ||
    (Platform.OS === 'ios' && isDynamicRestored
      ? dynamicAuthState.walletAddress
      : null) ||
    null;

  const value: AuthContextType = {
    isAuthenticated,
    walletAddress,
    isSupported,
    isOnboardingComplete,
    isLoading: Platform.OS === 'ios' ? !isDynamicRestored : false,
    setOnboardingComplete: handleSetOnboardingComplete,
    saveDynamicAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
