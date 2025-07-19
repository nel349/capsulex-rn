import { useMemo } from 'react';
import {
  Address,
  airdropFactory,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  lamports
} from "@solana/kit";
import { useCluster } from '../components/cluster/cluster-data-access';

const LAMPORTS_PER_SOL = 1_000_000_000n;

export function useSolanaService() {
  const { selectedCluster } = useCluster();
  // console.log('selectedCluster:', selectedCluster);
  
  const rpc = useMemo(
    () => createSolanaRpc(selectedCluster.endpoint),
    [selectedCluster.endpoint]
  );

  const solanaService = useMemo(() => ({
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
    }
  }), [rpc, selectedCluster]);

  return solanaService;
} 