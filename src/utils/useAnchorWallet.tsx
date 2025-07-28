import {
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';
import { useMemo, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { dynamicClientService } from '../services/dynamicClientService';

import { useAuthorization } from './useAuthorization';
import { useMobileWallet } from './useMobileWallet';
import { useDualAuth } from '../providers';

export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    // eslint-disable-next-line no-unused-vars
    transaction: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    // eslint-disable-next-line no-unused-vars
    transactions: T[]
  ): Promise<T[]>;
}

export function useAnchorWallet(): AnchorWallet | undefined {
  const { selectedAccount } = useAuthorization();
  const { isAuthenticated, walletAddress } = useDualAuth();
  const mobileWallet = useMobileWallet();
  const [dynamicClientReady, setDynamicClientReady] = useState(false);

  // Poll Dynamic client status for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && isAuthenticated && walletAddress) {
      const checkDynamicClient = () => {
        try {
          const client = dynamicClientService.getDynamicClient();
          if (client) {
            const hasAuth = !!client.auth?.authenticatedUser;
            const hasWallet = !!client.wallets?.primary;
            const hasWalletAddress = !!client.wallets?.primary?.address;

            const isReady = (hasAuth || hasWallet) && hasWalletAddress;

            if (isReady !== dynamicClientReady) {
              console.log('🔄 Dynamic client ready state changed:', isReady);
              setDynamicClientReady(isReady);
            }
          }
        } catch (error) {
          // Ignore errors during polling
        }
      };

      // Check immediately
      checkDynamicClient();

      // Poll every 500ms while not ready
      const interval = setInterval(checkDynamicClient, 500);

      return () => clearInterval(interval);
    } else {
      setDynamicClientReady(false);
    }
  }, [isAuthenticated, walletAddress, dynamicClientReady]);

  return useMemo(() => {
    // Android: Use Mobile Wallet Adapter
    if (Platform.OS === 'android') {
      if (!selectedAccount) {
        return;
      }

      return {
        signTransaction: async <T extends Transaction | VersionedTransaction>(
          transaction: T
        ) => {
          const signedTransaction = await mobileWallet.signTransactions([
            transaction,
          ]);
          return signedTransaction[0];
        },
        signAllTransactions: async <
          T extends Transaction | VersionedTransaction,
        >(
          transactions: T[]
        ) => {
          return await mobileWallet.signTransactions(transactions);
        },
        get publicKey() {
          return selectedAccount.publicKey;
        },
      };
    }

    // iOS: Use Dynamic
    if (Platform.OS === 'ios') {
      if (!isAuthenticated || !walletAddress) {
        return;
      }

      // Wait for Dynamic client to be ready
      if (!dynamicClientReady) {
        console.log(
          '⏳ useAnchorWallet: Waiting for Dynamic client to be ready...'
        );
        return;
      }

      console.log(
        '✅ useAnchorWallet: Dynamic client is ready, creating wallet interface'
      );

      // At this point, we know the Dynamic client is ready

      return {
        signTransaction: async <T extends Transaction | VersionedTransaction>(
          transaction: T
        ) => {
          const signer = dynamicClientService.getSigner();
          return await signer.signTransaction(transaction);
        },
        signAllTransactions: async <
          T extends Transaction | VersionedTransaction,
        >(
          transactions: T[]
        ) => {
          const signer = dynamicClientService.getSigner();
          return await signer.signAllTransactions(transactions);
        },
        get publicKey() {
          // Convert wallet address string to PublicKey
          return new PublicKey(walletAddress);
        },
      };
    }

    return undefined;
  }, [
    selectedAccount,
    mobileWallet,
    isAuthenticated,
    walletAddress,
    dynamicClientReady,
  ]);
}
