import { Platform } from "react-native";
import { useCallback, useMemo } from "react";
import { useAuthorization, Account } from "./useAuthorization";
import {
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

// Conditional imports based on platform
let transact: any;
let SignInPayload: any;

if (Platform.OS === 'android') {
  // Only import MWA on Android
  const mwaModule = require("@solana-mobile/mobile-wallet-adapter-protocol-web3js");
  transact = mwaModule.transact;
  
  const mwaProtocol = require("@solana-mobile/mobile-wallet-adapter-protocol");
  SignInPayload = mwaProtocol.SignInPayload;
} else {
  // iOS fallback - create mock functions
  transact = () => {
    throw new Error("MWA not supported on iOS. Please use alternative wallet provider.");
  };
  SignInPayload = null;
}

export function useMobileWallet() {
  const { authorizeSessionWithSignIn, authorizeSession, deauthorizeSession } =
    useAuthorization();

  const connect = useCallback(async (): Promise<Account> => {
    if (Platform.OS !== 'android') {
      throw new Error("MWA wallet connection not available on iOS");
    }
    
    return await transact(async (wallet: any) => {
      return await authorizeSession(wallet);
    });
  }, [authorizeSession]);

  const signIn = useCallback(
    async (signInPayload: any): Promise<Account> => {
      if (Platform.OS !== 'android') {
        throw new Error("MWA wallet sign-in not available on iOS");
      }
      
      return await transact(async (wallet: any) => {
        return await authorizeSessionWithSignIn(wallet, signInPayload);
      });
    },
    [authorizeSessionWithSignIn]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android') {
      throw new Error("MWA wallet disconnect not available on iOS");
    }
    
    await transact(async (wallet: any) => {
      await deauthorizeSession(wallet);
    });
  }, [deauthorizeSession]);

  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      minContextSlot: number,
    ): Promise<TransactionSignature> => {
      if (Platform.OS !== 'android') {
        throw new Error("MWA transaction signing not available on iOS");
      }
      
      return await transact(async (wallet: any) => {
        await authorizeSession(wallet);
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
          minContextSlot,
        });
        return signatures[0];
      });
    },
    [authorizeSession]
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (Platform.OS !== 'android') {
        throw new Error("MWA message signing not available on iOS");
      }
      
      return await transact(async (wallet: any) => {
        const authResult = await authorizeSession(wallet);
        const signedMessages = await wallet.signMessages({
          addresses: [authResult.address],
          payloads: [message],
        });
        return signedMessages[0];
      });
    },
    [authorizeSession]
  );

  return useMemo(
    () => ({
      connect,
      signIn,
      disconnect,
      signAndSendTransaction,
      signMessage,
      isSupported: Platform.OS === 'android',
    }),
    [connect, signIn, disconnect, signAndSendTransaction, signMessage]
  );
}
