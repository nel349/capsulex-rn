import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface CapsuleAccount {
  creator: string;
  nftMint: string;
  encryptedContent: string;
  contentStorage: any;
  contentIntegrityHash: string;
  revealDate: number;
  createdAt: number;
  isGamified: boolean;
  isRevealed: boolean;
  isActive: boolean;
  bump: number;
}

export interface CapsuleWithStatus {
  publicKey: string;
  account: CapsuleAccount;
  status: 'pending' | 'ready_to_reveal' | 'revealed';
  timeToReveal?: number;
}

export interface WalletCapsulesResponse {
  success: boolean;
  data: {
    wallet_address: string;
    total_capsules: number;
    summary: {
      pending: number;
      ready_to_reveal: number;
      revealed: number;
    };
    capsules: {
      pending: CapsuleWithStatus[];
      ready_to_reveal: CapsuleWithStatus[];
      revealed: CapsuleWithStatus[];
    };
    all_capsules: CapsuleWithStatus[];
  };
}

export interface RevealableCapsulesResponse {
  success: boolean;
  data: {
    total_ready: number;
    wallet_filter: string;
    capsules: CapsuleWithStatus[];
  };
}

export class CapsuleApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all capsules owned by a wallet address
   */
  async getCapsulesByWallet(
    walletAddress: string
  ): Promise<WalletCapsulesResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/capsules/wallet/${walletAddress}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching capsules by wallet:', error);
      throw error;
    }
  }

  /**
   * Get capsules ready for reveal
   */
  async getRevealableCapsules(
    walletAddress?: string
  ): Promise<RevealableCapsulesResponse> {
    try {
      const url = walletAddress
        ? `${this.baseUrl}/capsules/check-reveals?wallet=${walletAddress}`
        : `${this.baseUrl}/capsules/check-reveals`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching revealable capsules:', error);
      throw error;
    }
  }

  /**
   * Format time remaining until reveal
   */
  static formatTimeUntil(seconds: number): string {
    if (seconds <= 0) return 'Ready now!';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Get countdown progress (0-1) for a capsule
   */
  static getCountdownProgress(createdAt: number, revealDate: number): number {
    const now = Math.floor(Date.now() / 1000);
    const total = revealDate - createdAt;
    const elapsed = now - createdAt;
    return Math.min(Math.max(elapsed / total, 0), 1);
  }
}

// Export singleton instance
export const capsuleApi = new CapsuleApiService();
