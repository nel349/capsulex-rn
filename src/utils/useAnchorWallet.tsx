import {
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '../contexts';
import { dynamicClientService } from '../services/dynamicClientService';

import { useAuthorization } from './useAuthorization';
import { useMobileWallet } from './useMobileWallet';

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
  const { isAuthenticated, walletAddress } = useAuth();
  const mobileWallet = useMobileWallet();

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

      // Check if Dynamic client and wallet are available
      if (!dynamicClientService.isUserAuthenticated()) {
        return;
      }

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
  }, [selectedAccount, mobileWallet, isAuthenticated, walletAddress]);
}
