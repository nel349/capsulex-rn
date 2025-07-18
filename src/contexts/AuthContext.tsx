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

  // Check if user has completed onboarding before
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        setIsOnboardingComplete(completed === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleSetOnboardingComplete = async (complete: boolean) => {
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
