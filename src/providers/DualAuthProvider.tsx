import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Platform } from 'react-native';

import { userService } from '../services';
import { useAuthService } from '../services/authService';
import { ApiError } from '../types/api';

import { AndroidAuthProvider, useAndroidAuth } from './AndroidAuthProvider';
import { IOSAuthProvider, useIOSAuth } from './IOSAuthProvider';

interface DualAuthState {
  walletAddress: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  userName?: string | null;
  isOnboardingComplete: boolean;
  isSupported: boolean;
  // Unified methods
  signIn: () => Promise<void>;
  signUp: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;
  // Platform-specific connection (mainly for Android)
  connectWallet: () => Promise<void>;
}

const DualAuthContext = createContext<DualAuthState | null>(null);

interface DualAuthProviderProps {
  children: ReactNode;
}

function DualAuthProviderInner({ children }: DualAuthProviderProps) {
  const androidAuth = useAndroidAuth();
  const iosAuth = useIOSAuth();
  const { authenticateUser } = useAuthService();
  const [isOnboardingComplete, setIsOnboardingCompleteState] = useState(false);

  const isIOS = Platform.OS === 'ios';
  
  // Get platform-specific state
  const walletAddress = isIOS ? iosAuth.walletAddress : androidAuth.walletAddress;
  const isAuthenticated = isIOS ? iosAuth.isAuthenticated : androidAuth.isConnected;
  const isConnecting = isIOS ? iosAuth.isAuthenticating : androidAuth.isConnecting;
  const userName = isIOS ? iosAuth.userName : null;
  const isSupported = isIOS || androidAuth.isConnected; // iOS always supported, Android check connection

  // Load onboarding completion status
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        setIsOnboardingCompleteState(completed === 'true');
      } catch (error) {
        console.error('Error loading onboarding status:', error);
      }
    };
    loadOnboardingStatus();
  }, []);

  // Auto-complete onboarding for authenticated users
  useEffect(() => {
    if (isAuthenticated && walletAddress && !isOnboardingComplete) {
      setOnboardingComplete(true);
    }
  }, [isAuthenticated, walletAddress, isOnboardingComplete]);

  const setOnboardingComplete = async (complete: boolean) => {
    setIsOnboardingCompleteState(complete);
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

  const signIn = async () => {
    if (isIOS) {
      await iosAuth.authenticate();
    } else {
      // Android sign in: connect wallet and check if user exists
      await androidAuth.connect();
      
      if (!androidAuth.walletAddress) {
        throw new Error('No wallet connected');
      }

      const userExists = await userService.userExists(androidAuth.walletAddress);
      if (!userExists) {
        throw new Error('No account found for this wallet');
      }

      await authenticateUser({
        wallet_address: androidAuth.walletAddress,
        auth_type: 'wallet',
        name: 'User',
      });
    }
  };

  const signUp = async (name: string) => {
    if (isIOS) {
      // iOS: Use Dynamic authentication which handles everything
      await iosAuth.authenticate();
    } else {
      // Android: Connect wallet and register user
      await androidAuth.connect();
      
      if (!androidAuth.walletAddress) {
        throw new Error('No wallet connected');
      }

      const userExists = await userService.userExists(androidAuth.walletAddress);
      
      if (userExists) {
        // User already exists, just authenticate
        await authenticateUser({
          wallet_address: androidAuth.walletAddress,
          auth_type: 'wallet',
          name: name,
        });
      } else {
        // Register new user
        await userService.registerWalletUser(
          androidAuth.walletAddress,
          'wallet',
          name
        );

        await authenticateUser({
          wallet_address: androidAuth.walletAddress,
          auth_type: 'wallet',
          name: name,
        });
      }
    }
  };

  const signOut = async () => {
    if (isIOS) {
      await iosAuth.signOut();
    } else {
      await androidAuth.disconnect();
    }
  };

  const connectWallet = async () => {
    if (!isIOS) {
      await androidAuth.connect();
    }
    // iOS doesn't need separate wallet connection
  };

  const value: DualAuthState = {
    walletAddress,
    isAuthenticated,
    isConnecting,
    userName,
    isOnboardingComplete,
    isSupported,
    signIn,
    signUp,
    signOut,
    setOnboardingComplete,
    connectWallet,
  };

  return (
    <DualAuthContext.Provider value={value}>
      {children}
    </DualAuthContext.Provider>
  );
}

export function DualAuthProvider({ children }: DualAuthProviderProps) {
  return (
    <AndroidAuthProvider>
      <IOSAuthProvider>
        <DualAuthProviderInner>
          {children}
        </DualAuthProviderInner>
      </IOSAuthProvider>
    </AndroidAuthProvider>
  );
}

export function useDualAuth(): DualAuthState {
  const context = useContext(DualAuthContext);
  if (!context) {
    throw new Error('useDualAuth must be used within DualAuthProvider');
  }
  return context;
}
