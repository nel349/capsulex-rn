import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { useMemo } from 'react';

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
  const mobileWallet = useMobileWallet();
  return useMemo(() => {
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
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(
        transactions: T[]
      ) => {
        return await mobileWallet.signTransactions(transactions);
      },
      get publicKey() {
        return selectedAccount.publicKey;
      },
    };
  }, [mobileWallet, selectedAccount]);
}
