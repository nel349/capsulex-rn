import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { useMemo } from 'react';

import { useAuthorization } from './useAuthorization';
import { useMobileWallet } from './useMobileWallet';

export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
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
