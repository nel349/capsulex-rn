import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { PublicKeyInitData } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Conditional imports based on platform
let mwaTypes: any = {};

if (Platform.OS === 'android') {
  // Only import MWA types on Android
  const mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol');
  mwaTypes = {
    Account: mwaModule.Account,
    AuthorizationResult: mwaModule.AuthorizationResult,
    AuthorizeAPI: mwaModule.AuthorizeAPI,
    AuthToken: mwaModule.AuthToken,
    Base64EncodedAddress: mwaModule.Base64EncodedAddress,
    DeauthorizeAPI: mwaModule.DeauthorizeAPI,
    SignInPayloadWithRequiredFields: mwaModule.SignInPayloadWithRequiredFields,
    SignInPayload: mwaModule.SignInPayload,
  };
} else {
  // iOS fallback types
  mwaTypes = {
    Account: {} as any,
    AuthorizationResult: {} as any,
    AuthorizeAPI: {} as any,
    AuthToken: {} as any,
    Base64EncodedAddress: {} as any,
    DeauthorizeAPI: {} as any,
    SignInPayloadWithRequiredFields: {} as any,
    SignInPayload: {} as any,
  };
}

// Use conditional imports
type Account = {
  address: string; // Base64EncodedAddress
  label?: string;
  publicKey: PublicKey;
};

type AuthorizedAccount = typeof mwaTypes.Account;
type AuthorizationResult = typeof mwaTypes.AuthorizationResult;
type AuthorizeAPI = typeof mwaTypes.AuthorizeAPI;
type AuthToken = typeof mwaTypes.AuthToken;
type Base64EncodedAddress = typeof mwaTypes.Base64EncodedAddress;
type DeauthorizeAPI = typeof mwaTypes.DeauthorizeAPI;
type SignInPayloadWithRequiredFields =
  typeof mwaTypes.SignInPayloadWithRequiredFields;
type SignInPayload = typeof mwaTypes.SignInPayload;

import { toUint8Array } from 'js-base64';
import React, { useCallback, useMemo } from 'react';

const CHAIN = 'solana';
const CLUSTER = 'devnet';
const CHAIN_IDENTIFIER = `${CHAIN}:${CLUSTER}`;

type WalletAuthorization = Readonly<{
  accounts: Account[];
  authToken: AuthToken;
  selectedAccount: Account;
}>;

function getAccountFromAuthorizedAccount(account: AuthorizedAccount): Account {
  return {
    ...account,
    publicKey: getPublicKeyFromAddress(account.address),
  };
}

function getAuthorizationFromAuthorizationResult(
  authorizationResult: AuthorizationResult,
  previouslySelectedAccount?: Account
): WalletAuthorization {
  let selectedAccount: Account;
  if (
    // We have yet to select an account.
    previouslySelectedAccount == null ||
    // The previously selected account is no longer in the set of authorized addresses.
    !authorizationResult.accounts.some(
      ({ address }: any) => address === previouslySelectedAccount.address
    )
  ) {
    const firstAccount = authorizationResult.accounts[0];
    selectedAccount = getAccountFromAuthorizedAccount(firstAccount);
  } else {
    selectedAccount = previouslySelectedAccount;
  }
  return {
    accounts: authorizationResult.accounts.map(getAccountFromAuthorizedAccount),
    authToken: authorizationResult.auth_token,
    selectedAccount,
  };
}

function getPublicKeyFromAddress(address: Base64EncodedAddress): PublicKey {
  const publicKeyByteArray = toUint8Array(address);
  return new PublicKey(publicKeyByteArray);
}

function cacheReviver(key: string, value: any) {
  if (key === 'publicKey') {
    return new PublicKey(value as PublicKeyInitData); // the PublicKeyInitData should match the actual data structure stored in AsyncStorage
  } else {
    return value;
  }
}

const AUTHORIZATION_STORAGE_KEY = 'authorization-cache';

async function fetchAuthorization(): Promise<WalletAuthorization | null> {
  const cacheFetchResult = await AsyncStorage.getItem(
    AUTHORIZATION_STORAGE_KEY
  );

  if (!cacheFetchResult) {
    return null;
  }

  // Return prior authorization, if found.
  return JSON.parse(cacheFetchResult, cacheReviver);
}

async function persistAuthorization(
  auth: WalletAuthorization | null
): Promise<void> {
  await AsyncStorage.setItem(AUTHORIZATION_STORAGE_KEY, JSON.stringify(auth));
}

export const APP_IDENTITY = {
  name: 'Solana Mobile Expo Template',
  uri: 'https://fakedomain.com',
};

export function useAuthorization() {
  const queryClient = useQueryClient();
  const { data: authorization, isLoading } = useQuery({
    queryKey: ['wallet-authorization'],
    queryFn: () => fetchAuthorization(),
  });
  const { mutate: setAuthorization } = useMutation({
    mutationFn: persistAuthorization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-authorization'] });
    },
  });

  const handleAuthorizationResult = useCallback(
    async (
      authorizationResult: AuthorizationResult
    ): Promise<WalletAuthorization> => {
      if (Platform.OS !== 'android') {
        throw new Error('Authorization not supported on iOS with MWA');
      }

      const nextAuthorization = getAuthorizationFromAuthorizationResult(
        authorizationResult,
        authorization?.selectedAccount
      );
      await setAuthorization(nextAuthorization);
      return nextAuthorization;
    },
    [authorization, setAuthorization]
  );

  const authorizeSession = useCallback(
    async (wallet: AuthorizeAPI) => {
      if (Platform.OS !== 'android') {
        throw new Error('Authorization not supported on iOS with MWA');
      }

      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: CHAIN_IDENTIFIER,
        auth_token: authorization?.authToken,
      });
      return (await handleAuthorizationResult(authorizationResult))
        .selectedAccount;
    },
    [authorization, handleAuthorizationResult]
  );

  const authorizeSessionWithSignIn = useCallback(
    async (wallet: AuthorizeAPI, signInPayload: SignInPayload) => {
      if (Platform.OS !== 'android') {
        throw new Error('Authorization not supported on iOS with MWA');
      }

      const authorizationResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: CHAIN_IDENTIFIER,
        auth_token: authorization?.authToken,
        sign_in_payload: signInPayload,
      });
      return (await handleAuthorizationResult(authorizationResult))
        .selectedAccount;
    },
    [authorization, handleAuthorizationResult]
  );

  const deauthorizeSession = useCallback(
    async (wallet: DeauthorizeAPI) => {
      if (Platform.OS !== 'android') {
        throw new Error('Deauthorization not supported on iOS with MWA');
      }

      if (authorization?.authToken == null) {
        return;
      }
      await wallet.deauthorize({ auth_token: authorization.authToken });
      await setAuthorization(null);
    },
    [authorization, setAuthorization]
  );

  return useMemo(
    () => ({
      accounts: authorization?.accounts ?? null,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      selectedAccount: authorization?.selectedAccount ?? null,
      isLoading,
      isSupported: Platform.OS === 'android',
    }),
    [
      authorization,
      authorizeSession,
      authorizeSessionWithSignIn,
      deauthorizeSession,
      isLoading,
    ]
  );
}

export type { Account };
