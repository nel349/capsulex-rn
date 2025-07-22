import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

export interface Cluster {
  name: string;
  endpoint: string;
  network: ClusterNetwork;
  active?: boolean;
}

export enum ClusterNetwork {
  // eslint-disable-next-line no-unused-vars
  Mainnet = 'mainnet-beta',
  // eslint-disable-next-line no-unused-vars
  Testnet = 'testnet',
  // eslint-disable-next-line no-unused-vars
  Devnet = 'devnet',
  // eslint-disable-next-line no-unused-vars
  Custom = 'custom',
}
export function toWalletAdapterNetwork(
  cluster?: ClusterNetwork
): WalletAdapterNetwork | undefined {
  switch (cluster) {
    case ClusterNetwork.Mainnet:
      return WalletAdapterNetwork.Mainnet;
    case ClusterNetwork.Testnet:
      return WalletAdapterNetwork.Testnet;
    case ClusterNetwork.Devnet:
      return WalletAdapterNetwork.Devnet;
    default:
      return undefined;
  }
}

export const defaultClusters: Readonly<Cluster[]> = [
  {
    name: 'devnet',
    endpoint: clusterApiUrl('devnet'),
    network: ClusterNetwork.Devnet,
  },
  {
    name: 'testnet',
    endpoint: clusterApiUrl('testnet'),
    network: ClusterNetwork.Testnet,
  },
];

export interface ClusterProviderContext {
  selectedCluster: Cluster;
  clusters: Cluster[];
  // eslint-disable-next-line no-unused-vars
  setSelectedCluster: (cluster: Cluster) => void;
  // eslint-disable-next-line no-unused-vars
  getExplorerUrl(path: string): string;
}

const Context = createContext<ClusterProviderContext>(
  {} as ClusterProviderContext
);

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [selectedCluster, setSelectedCluster] = useState<Cluster>(
    defaultClusters[0]
  );
  const clusters = [...defaultClusters];

  const value: ClusterProviderContext = useMemo(
    () => ({
      selectedCluster,
      clusters: clusters.sort((a, b) => (a.name > b.name ? 1 : -1)),
      setSelectedCluster: (cluster: Cluster) => setSelectedCluster(cluster),
      getExplorerUrl: (path: string) =>
        `https://explorer.solana.com/${path}${getClusterUrlParam(
          selectedCluster
        )}`,
    }),
    [selectedCluster, setSelectedCluster]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCluster() {
  return useContext(Context);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getClusterUrlParam(cluster: Cluster): string {
  let suffix = '';
  switch (cluster.network) {
    case ClusterNetwork.Devnet:
      suffix = 'devnet';
      break;
    case ClusterNetwork.Mainnet:
      suffix = '';
      break;
    case ClusterNetwork.Testnet:
      suffix = 'testnet';
      break;
    default:
      suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`;
      break;
  }

  return suffix.length ? `?cluster=${suffix}` : '';
}
