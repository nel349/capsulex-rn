import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';

import { dynamicClientService } from '../services/dynamicClientService';
import { useAuthService } from '../services/authService';

interface IOSAuthState {
  walletAddress: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  userName: string | null;
  authenticate: () => Promise<void>;
  signOut: () => Promise<void>;
}

const IOSAuthContext = createContext<IOSAuthState | null>(null);

interface IOSAuthProviderProps {
  children: ReactNode;
}

export function IOSAuthProvider({ children }: IOSAuthProviderProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { authenticateUser, clearAuth } = useAuthService();

  const isAuthenticated = !!walletAddress && dynamicClientService.isUserAuthenticated();

  // Initialize iOS auth state
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const initializeAuth = async () => {
      try {
        if (dynamicClientService.isUserAuthenticated()) {
          const userInfo = dynamicClientService.getUserInfo();
          if (userInfo) {
            setWalletAddress(userInfo.address);
            setUserName(userInfo.name);
          }
        }
      } catch (error) {
        console.error('iOS auth initialization failed:', error);
      }
    };

    initializeAuth();
  }, []);

  const authenticate = async () => {
    if (Platform.OS !== 'ios') return;

    setIsAuthenticating(true);
    try {
      const dynamicClient = dynamicClientService.getDynamicClient();
      if (!dynamicClient) {
        throw new Error('Dynamic client not available');
      }

      // Check if already authenticated
      if (dynamicClientService.isUserAuthenticated()) {
        const userInfo = dynamicClientService.getUserInfo();
        if (userInfo) {
          const { address, name } = userInfo;
          
          await authenticateUser({
            wallet_address: address,
            auth_type: 'wallet',
            name: name,
          });

          setWalletAddress(address);
          setUserName(name);
          
          // Save dynamic auth state
          await AsyncStorage.setItem('dynamic_auth_enabled', 'true');
          await AsyncStorage.setItem('dynamic_wallet_address', address);
          return;
        }
      }

      // Show auth UI
      await dynamicClientService.showAuthUI();
      
      // Check authentication after UI
      if (dynamicClientService.isUserAuthenticated()) {
        const userInfo = dynamicClientService.getUserInfo();
        if (userInfo) {
          const { address, name } = userInfo;
          
          await authenticateUser({
            wallet_address: address,
            auth_type: 'wallet',
            name: name,
          });

          setWalletAddress(address);
          setUserName(name);
          
          // Save dynamic auth state
          await AsyncStorage.setItem('dynamic_auth_enabled', 'true');
          await AsyncStorage.setItem('dynamic_wallet_address', address);
        } else {
          throw new Error('Authentication incomplete');
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('iOS authentication failed:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      await clearAuth();
      await AsyncStorage.removeItem('dynamic_auth_enabled');
      await AsyncStorage.removeItem('dynamic_wallet_address');
      
      setWalletAddress(null);
      setUserName(null);
      
      // Clear Dynamic state if needed
      // Note: Dynamic client logout implementation may vary
    } catch (error) {
      console.error('iOS sign out failed:', error);
    }
  };

  const value: IOSAuthState = {
    walletAddress,
    isAuthenticated,
    isAuthenticating,
    userName,
    authenticate,
    signOut,
  };

  return (
    <IOSAuthContext.Provider value={value}>
      {children}
    </IOSAuthContext.Provider>
  );
}

export function useIOSAuth(): IOSAuthState {
  const context = useContext(IOSAuthContext);
  if (!context) {
    throw new Error('useIOSAuth must be used within IOSAuthProvider');
  }
  return context;
}
