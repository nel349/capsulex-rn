import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

import { userService } from '../services';
import { useAuthService } from '../services/authService';
import { dynamicClientService } from '../services/dynamicClientService';

import { AndroidAuthProvider, useAndroidAuth } from './AndroidAuthProvider';
import { IOSAuthProvider, useIOSAuth } from './IOSAuthProvider';

interface DualAuthState {
  walletAddress: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  userName?: string | null;
  isSupported: boolean;
  // Unified methods
  signIn: () => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  signUp: (name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [hasValidToken, setHasValidToken] = useState(false);

  const isIOS = Platform.OS === 'ios';

  // Get platform-specific state
  const walletAddress = isIOS
    ? iosAuth.walletAddress
    : androidAuth.walletAddress;
  const walletConnected = isIOS
    ? iosAuth.isAuthenticated
    : androidAuth.isConnected;
  
  // iOS-specific: Additional Dynamic client session validation
  const isDynamicSessionValid = isIOS 
    ? !!dynamicClientService.getDynamicClient()?.auth?.authenticatedUser
    : true; // Android doesn't use Dynamic client
  
  // Both platforms require wallet connection AND valid token, iOS also needs valid Dynamic session
  const isAuthenticated = walletConnected && hasValidToken && isDynamicSessionValid;
  const isConnecting = isIOS
    ? iosAuth.isAuthenticating
    : androidAuth.isConnecting;
  const userName = isIOS ? iosAuth.userName : null;
  const isSupported = isIOS || androidAuth.isConnected; // iOS always supported, Android check connection

  // Check for valid JWT token (both platforms need tokens for API calls)
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('auth-token');
        const platformLog = isIOS ? '🔍 iOS' : '🔍 Android';
        console.log(`${platformLog} Checking token state:`, {
          hasToken: !!token,
          walletConnected,
          walletAddress,
        });
        setHasValidToken(!!token);
      } catch (error) {
        console.error('Error checking auth token:', error);
        setHasValidToken(false);
      }
    };

    checkToken();

    // Re-check token when wallet connection changes
    if (walletConnected) {
      checkToken();
    } else {
      setHasValidToken(false);
    }
  }, [isIOS, walletConnected, walletAddress]); // Check when wallet address changes

  const handleSignInIOS = async (): Promise<void> => {
    if (isIOS) {
      await iosAuth.authenticate();
      // Navigation will be handled by WelcomeScreen's useEffect when auth state updates
    }
  };

  const signIn = async () => {
    if (isIOS) {
      await handleSignInIOS();
    } else {
      // Android sign in: connect wallet and get address directly
      const currentWalletAddress = await androidAuth.connect();

      console.log('🔍 Android sign-in state:', {
        isConnected: androidAuth.isConnected,
        walletAddress: currentWalletAddress,
      });

      if (!currentWalletAddress) {
        throw new Error('No wallet address available');
      }

      console.log('🔍 Final wallet state:', {
        walletAddress: currentWalletAddress,
        isConnected: androidAuth.isConnected,
      });

      if (!currentWalletAddress) {
        throw new Error('No wallet connected');
      }

      const userExists = await userService.userExists(currentWalletAddress);
      if (!userExists) {
        throw new Error(
          'No account found for this wallet. Please sign up first.'
        );
      }

      await authenticateUser({
        wallet_address: currentWalletAddress,
        auth_type: 'wallet',
        name: 'User',
      });

      // Mark token as valid after successful Android authentication
      setHasValidToken(true);
    }
  };

  const signUp = async (name: string, email: string) => {
    if (isIOS) {
      await handleSignInIOS();
    } else {
      // Android: Use existing wallet address or connect new one
      let currentWalletAddress = walletAddress;

      if (!currentWalletAddress) {
        // Connect and get wallet address directly
        currentWalletAddress = await androidAuth.connect();
      }

      console.log('🔍 SignUp final wallet state:', {
        currentWalletAddress,
        androidAuthWallet: androidAuth.walletAddress,
        isConnected: androidAuth.isConnected,
      });

      if (!currentWalletAddress) {
        throw new Error('No wallet connected');
      }

      const userExists = await userService.userExists(currentWalletAddress);

      console.log('🔍 SignUp userExists:', userExists);

      if (userExists) {
        // User already exists, just authenticate
        await authenticateUser({
          wallet_address: currentWalletAddress,
          auth_type: 'wallet',
          name: name,
          email: email,
        });

        // Mark token as valid after successful authentication
        setHasValidToken(true);
      } else {
        // Register new user
        await userService.registerWalletUser(
          currentWalletAddress,
          'wallet',
          name,
          email
        );

        await authenticateUser({
          wallet_address: currentWalletAddress,
          auth_type: 'wallet',
          name: name,
          email: email,
        });

        // Mark token as valid after successful authentication
        setHasValidToken(true);
      }
    }
  };

  const signOut = async () => {
    // Clear local token state first (both platforms)
    setHasValidToken(false);

    // we nuke all stored data from the auth service - use correct storage keys
    await AsyncStorage.removeItem('auth-token');
    await AsyncStorage.removeItem('auth-user');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('wallet_address');

    // disconnect the wallet from the dynamic client
    await dynamicClientService.signOut();

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
    isSupported,
    signIn,
    signUp,
    signOut,
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
        <DualAuthProviderInner>{children}</DualAuthProviderInner>
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
