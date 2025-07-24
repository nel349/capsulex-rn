import type { Address } from '@solana/kit';
import { createSolanaRpc } from '@solana/kit';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCluster } from '../components/cluster/cluster-data-access';

const LAMPORTS_PER_SOL = 1_000_000_000n;

export function useSolanaService() {
  const { selectedCluster } = useCluster();
  // console.log('selectedCluster:', selectedCluster);

  const rpc = useMemo(
    () => createSolanaRpc(selectedCluster.endpoint),
    [selectedCluster.endpoint]
  );

  const solanaService = useMemo(
    () => ({
      /**
       * Get SOL balance for a public key
       */
      async getBalance(publicKey: Address): Promise<number> {
        const { value } = await rpc.getBalance(publicKey).send();
        return Number(value) / Number(LAMPORTS_PER_SOL);
      },

      /**
       * Get the current RPC instance
       */
      getRpc() {
        return rpc;
      },

      /**
       * Get the current cluster endpoint
       */
      getEndpoint() {
        return selectedCluster.endpoint;
      },

      /**
       * Get the current cluster info
       */
      getCluster() {
        return selectedCluster;
      },
    }),
    [rpc, selectedCluster]
  );

  return solanaService;
}

/**
 * React Query hook for SOL balance with automatic refreshing
 */
export function useBalance(publicKey?: Address) {
  const { getRpc } = useSolanaService();

  return useQuery({
    queryKey: ['solana-balance', publicKey],
    queryFn: async (): Promise<number> => {
      // console.log('🔍 Fetching balance for:', publicKey?.toString());

      if (!publicKey) throw new Error('Public key is required');

      try {
        const rpc = getRpc();

        // Convert publicKey to string if it's an object
        const publicKeyString = String(publicKey) as Address;
        console.log('🔑 Using publicKey string:', publicKeyString);

        const response = await rpc.getBalance(publicKeyString).send();
        // console.log('📥 RPC response:', response);

        const { value } = response;
        const balance = Number(value) / Number(LAMPORTS_PER_SOL);

        // console.log('💰 Balance fetched:', balance, 'SOL');
        return balance;
      } catch (error) {
        console.error('❌ Balance fetch failed:', error);
        throw error;
      }
    },
    enabled: !!publicKey,
    refetchOnWindowFocus: true, // Refresh when app comes back into focus
    retry: 3,
  });
}
