import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';

import { useAuthorization } from '../utils/useAuthorization';

interface AuthContextType {
  isAuthenticated: boolean;
  walletAddress: string | null;
  isSupported: boolean;
  isOnboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { selectedAccount, isSupported } = useAuthorization();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

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

  // Clear onboarding completion when wallet disconnects
  useEffect(() => {
    if (!selectedAccount?.publicKey && isOnboardingComplete) {
      console.log('🗑️ Wallet disconnected - clearing all onboarding state');
      handleSetOnboardingComplete(false);

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
  }, [selectedAccount?.publicKey, isOnboardingComplete]);

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

  const value: AuthContextType = {
    isAuthenticated: !!selectedAccount?.publicKey,
    walletAddress: selectedAccount?.publicKey?.toBase58() || null,
    isSupported,
    isOnboardingComplete,
    setOnboardingComplete: handleSetOnboardingComplete,
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
