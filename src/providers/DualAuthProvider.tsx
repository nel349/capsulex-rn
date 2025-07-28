import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Platform } from 'react-native';

import { userService } from '../services';
import { useAuthService } from '../services/authService';

import { AndroidAuthProvider, useAndroidAuth } from './AndroidAuthProvider';
import { IOSAuthProvider, useIOSAuth } from './IOSAuthProvider';
import { useNavigation } from '@react-navigation/native';
import { dynamicClientService } from '../services/dynamicClientService';

interface DualAuthState {
  walletAddress: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  userName?: string | null;
  isSupported: boolean;
  // Unified methods
  signIn: () => Promise<void>;
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
  const navigation = useNavigation();
  
  const isIOS = Platform.OS === 'ios';
  
  // Get platform-specific state
  const walletAddress = isIOS ? iosAuth.walletAddress : androidAuth.walletAddress;
  const isAuthenticated = isIOS ? iosAuth.isAuthenticated : androidAuth.isConnected;
  const isConnecting = isIOS ? iosAuth.isAuthenticating : androidAuth.isConnecting;
  const userName = isIOS ? iosAuth.userName : null;
  const isSupported = isIOS || androidAuth.isConnected; // iOS always supported, Android check connection


  const handleSignInIOS = async () : Promise<void> => {
    if (isIOS) {
      await iosAuth.authenticate();
      console.log('DUALAUTH: isAuthenticated', isAuthenticated);
      if (isAuthenticated) {
        navigation.navigate('HomeStack' as never);
      }
    }
  }

  const signIn = async () => {
    if (isIOS) {
      await handleSignInIOS();
    } else {
      // Android sign in: connect wallet and check if user exists
      await androidAuth.connect();
      
      // Wait for wallet address to be available (with timeout)
      let retries = 0;
      const maxRetries = 20; // Increased timeout to 10 seconds
      while (!androidAuth.walletAddress && retries < maxRetries) {
        console.log(`⏳ Waiting for wallet address... attempt ${retries + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      
      console.log('🔍 Final wallet state:', {
        walletAddress: androidAuth.walletAddress,
        isConnected: androidAuth.isConnected,
        retries
      });
      
      if (!androidAuth.walletAddress) {
        throw new Error('No wallet connected');
      }

      const userExists = await userService.userExists(androidAuth.walletAddress);
      if (!userExists) {
        // throw new Error('No account found for this wallet');

        // take back to the welcome screen and show a message that the account is not registered
        // navigation.navigate('Welcome' as never);
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
      await handleSignInIOS();
    } else {
      // Android: Connect wallet and register user
      await androidAuth.connect();
      
      // Wait for wallet address to be available (with timeout)
      let retries = 0;
      const maxRetries = 20; // Increased timeout to 10 seconds
      while (!androidAuth.walletAddress && retries < maxRetries) {
        console.log(`⏳ SignUp: Waiting for wallet address... attempt ${retries + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      
      console.log('🔍 SignUp final wallet state:', {
        walletAddress: androidAuth.walletAddress,
        isConnected: androidAuth.isConnected,
        retries
      });
      
      if (!androidAuth.walletAddress) {
        throw new Error('No wallet connected');
      }

      const userExists = await userService.userExists(androidAuth.walletAddress);

      console.log('🔍 SignUp userExists:', userExists);
      
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
    // we nuke all stored data from the auth service
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
    connectWallet
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
