import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';

import { dynamicClientService } from '../services/dynamicClientService';
import { useAuthService } from '../services/authService';
import { useReactiveClient } from '@dynamic-labs/react-hooks'

interface IOSAuthState {
  walletAddress: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  userName: string | null;
  authenticate: () => Promise<boolean>;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  const useDynamic = () => {
    const client = dynamicClientService.getDynamicClient();
    return client ? useReactiveClient(client as any) : { setShowDynamicUserProfile: () => {} };
  };
  const { setShowDynamicUserProfile } = useDynamic();

  // do not check dynamicClient because it is not reliable
  // const isAuthenticated = !!walletAddress && !!userName; 

  useEffect(() => {
    if (walletAddress && userName) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [walletAddress, userName]);

  // Initialize iOS auth state
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const initializeAuth = async () => {
      try {
        // First check if we have a valid token in storage
        const token = await AsyncStorage.getItem('auth-token');
        const storedWalletAddress = await AsyncStorage.getItem('dynamic_wallet_address');
        const storedUserName = await AsyncStorage.getItem('user_name');
        
        console.log('🔍 iOS Auth Initialization:', { 
          hasToken: !!token, 
          storedWalletAddress, 
          storedUserName 
        });
        
        if (token && storedWalletAddress) {
          // Restore auth state from storage
          console.log('🔄 Restoring iOS auth state from storage');
          setWalletAddress(storedWalletAddress);
          setUserName(storedUserName || 'User');
          setIsAuthenticated(true);
          return;
        }
        
        // Fall back to checking Dynamic client state
        if (dynamicClientService.isUserAuthenticated()) {
          const userInfo = dynamicClientService.getUserInfo();
          if (userInfo) {
            console.log('🔄 Restoring iOS auth state from Dynamic client');
            setWalletAddress(userInfo.address);
            setUserName(userInfo.name);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('iOS auth initialization failed:', error);
      }
    };

    initializeAuth();
  }, []);

  const authenticate = async () : Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;

    setIsAuthenticating(true);
    try {
      // Refresh the client to ensure clean state
      console.log('🔄 Refreshing Dynamic client before auth...');
      dynamicClientService.refreshClient();
      
      const dynamicClient = dynamicClientService.getDynamicClient();
      if (!dynamicClient) {
        throw new Error('Dynamic client not available');
      }

      // Check if already authenticated
      if (dynamicClientService.isUserAuthenticated()) {
        const userInfo = dynamicClientService.getUserInfo();
        if (userInfo) {
          const { address, name } = userInfo;
          

          console.log('Authenticating user:', {
            wallet_address: address,
            auth_type: 'wallet',
            name: name,
          });

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
          return true;
        }
      }

      // Refresh client after showing UI to clean up state for next attempt
      console.log('🔄 Refreshing Dynamic client after UI...');
      

      // Set up promise to wait for auth success event
      let authResolver: (value: boolean) => void;
      const authPromise = new Promise<boolean>((resolve) => {
        authResolver = resolve;
      });
      
      const removeListener = dynamicClientService.addAuthStateListener((isAuthenticated, userInfo) => {
        console.log('🔔 Auth event received:', isAuthenticated, userInfo);
        if (isAuthenticated && userInfo) {
          // Find wallet credential (blockchain format)
          const walletCredential = userInfo?.verifiedCredentials?.find(cred => cred.format === 'blockchain');
          // Find email credential (email format)  
          const emailCredential = userInfo?.verifiedCredentials?.find(cred => cred.format === 'email');
          
          const walletAddress = walletCredential?.address || '';
          const userName = emailCredential?.email || userInfo?.email || '';
          
          console.log('🔔 Setting React state from auth listener:', { walletAddress, userName });
          setWalletAddress(walletAddress);
          setUserName(userName);
          setIsAuthenticated(true);
          
          // Save to storage for next app launch
          AsyncStorage.setItem('dynamic_wallet_address', walletAddress);
          AsyncStorage.setItem('user_name', userName);
          
          authResolver(true);
        }
      });
      
      try {
        // Show auth UI - state updates now handled in addAuthStateListener
        await dynamicClientService.showAuthUI(async (isAuthenticated, userInfo) => {
          console.log('🔔 showAuthUI callback received:', isAuthenticated);
          setShowDynamicUserProfile(false);
        });
        

        
        // Wait for auth success event or timeout
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 10000); // 10 second timeout
        });


        
        const authResult = await Promise.race([authPromise, timeoutPromise]);
        console.log('🔍 Auth result:', authResult);
        
      } finally {
        removeListener();
      }

      dynamicClientService.refreshClient();


      
      // Check final authentication state
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
          return true;
        } else {
          throw new Error('Authentication incomplete');
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.warn('iOS authentication failed:', error);
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

      // disconnect the wallet from the dynamic client
      await dynamicClientService.signOut();
      
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
