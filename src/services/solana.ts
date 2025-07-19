import {
  Address,
  airdropFactory,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  lamports
} from "@solana/kit";

const LAMPORTS_PER_SOL = 1_000_000_000n;

const rpc = createSolanaRpc("https://api.devnet.solana.com");


export class SolanaService {

  /**
   * Get SOL balance for a public key
   */
  async getBalance(publicKey: Address): Promise<number> {
    const { value } = await rpc.getBalance(publicKey).send();
    return Number(value) / Number(LAMPORTS_PER_SOL);
  }

} 