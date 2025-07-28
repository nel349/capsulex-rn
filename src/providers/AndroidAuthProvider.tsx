import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';

import { useAuthorization } from '../utils/useAuthorization';
import { useMobileWallet } from '../utils/useMobileWallet';

interface AndroidAuthState {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const AndroidAuthContext = createContext<AndroidAuthState | null>(null);

interface AndroidAuthProviderProps {
  children: ReactNode;
}

export function AndroidAuthProvider({ children }: AndroidAuthProviderProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [persistedWalletAddress, setPersistedWalletAddress] = useState<string | null>(null);
  const { selectedAccount } = useAuthorization();
  const { connect: mobileWalletConnect, disconnect: mobileWalletDisconnect } = useMobileWallet();

  // Use persisted wallet address if selectedAccount is temporarily null due to React Query timing
  const currentWalletAddress = selectedAccount?.publicKey?.toBase58() || null;
  const walletAddress = currentWalletAddress || persistedWalletAddress;
  const isConnected = !!walletAddress;

  // Update persisted address when selectedAccount changes
  useEffect(() => {
    if (currentWalletAddress) {
      console.log('🔍 AndroidAuth: Updating persisted wallet address:', currentWalletAddress);
      setPersistedWalletAddress(currentWalletAddress);
    }
  }, [currentWalletAddress]);

  const connect = async () => {
    if (Platform.OS !== 'android') return;
    
    console.log('📱 AndroidAuth: Starting wallet connection...');
    console.log('🔍 AndroidAuth: Current selected account before connect:', {
      hasAccount: !!selectedAccount,
      address: selectedAccount?.publicKey?.toBase58(),
    });
    
    setIsConnecting(true);
    try {
      console.log('🔗 AndroidAuth: Calling mobileWalletConnect...');
      await mobileWalletConnect();
      console.log('✅ AndroidAuth: Mobile wallet connect completed');
    } catch (error) {
      console.error('❌ AndroidAuth: Mobile wallet connect failed:', error);
      console.error('❌ AndroidAuth: Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    } finally {
      setIsConnecting(false);
      console.log('🔍 AndroidAuth: Connection attempt finished. Current state:', {
        walletAddress: selectedAccount?.publicKey?.toBase58(),
        isConnected: !!selectedAccount?.publicKey,
        hasSelectedAccount: !!selectedAccount,
      });
    }
  };

  const disconnect = async () => {
    if (Platform.OS !== 'android') return;
    
    try {
      console.log('🔍 AndroidAuth: Disconnecting and clearing all auth data');
      setPersistedWalletAddress(null);
      
      // Clear JWT tokens and auth data from AsyncStorage
      await AsyncStorage.removeItem('auth-token');
      await AsyncStorage.removeItem('auth-user');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('wallet_address');
      
      await mobileWalletDisconnect();
    } catch (error) {
      console.error('Android wallet disconnect failed:', error);
    }
  };

  const value: AndroidAuthState = {
    walletAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };

  return (
    <AndroidAuthContext.Provider value={value}>
      {children}
    </AndroidAuthContext.Provider>
  );
}

export function useAndroidAuth(): AndroidAuthState {
  const context = useContext(AndroidAuthContext);
  if (!context) {
    throw new Error('useAndroidAuth must be used within AndroidAuthProvider');
  }
  return context;
}
