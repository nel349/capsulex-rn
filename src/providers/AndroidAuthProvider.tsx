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
  const { selectedAccount } = useAuthorization();
  const { connect: mobileWalletConnect, disconnect: mobileWalletDisconnect } = useMobileWallet();

  const walletAddress = selectedAccount?.publicKey?.toBase58() || null;
  const isConnected = !!walletAddress;

  const connect = async () => {
    if (Platform.OS !== 'android') return;
    
    setIsConnecting(true);
    try {
      await mobileWalletConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (Platform.OS !== 'android') return;
    
    try {
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
