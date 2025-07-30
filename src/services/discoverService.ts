import type { ApiResponse } from '../types/api';

import { apiService } from './api';

// Types for Discover page data
export interface RevealedCapsule {
  id: string;
  content: string;
  content_hash: string;
  reveal_date_timestamp: number;
  revealed_at_timestamp?: number;
  creator: string;
  creator_display_name?: string;
  twitter_username?: string;
  is_public: boolean;
  is_game: boolean;
  revealed: boolean;
  on_chain_id?: string;
}

export interface ActiveGame {
  game_id: string;
  capsule_id: string;
  capsule_pda: string;
  creator: string;
  creator_display_name?: string;
  twitter_username?: string;
  max_guesses: number;
  max_winners: number;
  current_guesses: number;
  winners_found: number;
  is_active: boolean;
  total_participants: number;
  reveal_date: string;
  created_at: string;
  content_hint: string;
  time_until_reveal: number;
}

export interface LeaderboardEntry {
  wallet_address: string;
  display_name?: string;
  twitter_username?: string;
  total_points: number;
  games_participated: number;
  games_won: number;
  capsules_created: number;
  global_rank: number;
}

export interface UserProfile {
  wallet_address: string;
  display_name?: string;
  twitter_username?: string;
  created_at: string;
  total_capsules?: number;
  total_games?: number;
}

export interface CapsuleReadyToReveal {
  id: string;
  content: string;
  reveal_date_timestamp: number;
  creator: string;
  creator_display_name?: string;
  is_public: boolean;
  is_game: boolean;
  on_chain_id?: string;
}

// Discover Service
class DiscoverService {
  // Get revealed capsules for main feed
  async getRevealedCapsules(limit = 50): Promise<RevealedCapsule[]> {
    try {
      const response: ApiResponse<RevealedCapsule[]> = await apiService.get(
        `/capsules/revealed?limit=${limit}`
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch revealed capsules:', error);
      return [];
    }
  }

  // Get active games
  async getActiveGames(
    limit = 20,
    excludeCreator?: string
  ): Promise<ActiveGame[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (excludeCreator) {
        params.append('exclude_creator', excludeCreator);
      }

      const response: ApiResponse<{
        games: ActiveGame[];
        total: number;
        filters: any;
      }> = await apiService.get(
        `/games/active?${params.toString()}`
      );
      return Array.isArray(response.data?.games) ? response.data.games : [];
    } catch (error) {
      console.error('Failed to fetch active games:', error);
      return [];
    }
  }

  // Get global leaderboard
  async getGlobalLeaderboard(
    timeframe: 'week' | 'month' | 'all_time' = 'all_time',
    limit = 10,
    offset = 0
  ): Promise<LeaderboardEntry[]> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response: ApiResponse<LeaderboardEntry[]> = await apiService.get(
        `/leaderboard/global?${params.toString()}`
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch global leaderboard:', error);
      return [];
    }
  }

  // Get user profile
  async getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    try {
      const response: ApiResponse<UserProfile> = await apiService.get(
        `/users/profile/${walletAddress}`
      );
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }

  // Get capsules ready to reveal (about to reveal section)
  async getCapsulesReadyToReveal(
    walletFilter?: string
  ): Promise<CapsuleReadyToReveal[]> {
    try {
      const params = walletFilter ? `?wallet=${walletFilter}` : '';
      const response: ApiResponse<{
        total_ready: number;
        wallet_filter: string;
        capsules: any[];
      }> = await apiService.get(`/capsules/ready-to-reveal${params}`);
      
      // Transform blockchain data to expected format
      const capsules = response.data?.capsules || [];
      return capsules.map((capsule: any) => ({
        id: capsule.publicKey?.toString() || capsule.id,
        content: capsule.account?.encryptedContent || capsule.content,
        reveal_date_timestamp: capsule.account?.revealDate?.toNumber?.() || capsule.reveal_date_timestamp,
        creator: capsule.account?.creator?.toString() || capsule.creator,
        creator_display_name: capsule.creator_display_name || null,
        is_public: true,
        is_game: capsule.account?.isGamified || capsule.is_game || false,
        on_chain_id: capsule.publicKey?.toString() || capsule.on_chain_id,
      }));
    } catch (error) {
      console.error('Failed to fetch capsules ready to reveal:', error);
      return [];
    }
  }

  // Get capsules by wallet (for user discovery)
  async getCapsulesByWallet(walletAddress: string): Promise<{
    pending: RevealedCapsule[];
    ready_to_reveal: RevealedCapsule[];
    revealed: RevealedCapsule[];
  }> {
    try {
      const response: ApiResponse<{
        pending: RevealedCapsule[];
        ready_to_reveal: RevealedCapsule[];
        revealed: RevealedCapsule[];
      }> = await apiService.get(`/capsules/wallet/${walletAddress}`);

      return (
        response.data || {
          pending: [],
          ready_to_reveal: [],
          revealed: [],
        }
      );
    } catch (error) {
      console.error('Failed to fetch capsules by wallet:', error);
      throw error;
    }
  }

  // Get individual capsule details
  async getCapsuleDetails(capsuleId: string): Promise<RevealedCapsule | null> {
    try {
      const response: ApiResponse<RevealedCapsule> = await apiService.get(
        `/capsules/${capsuleId}`
      );
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch capsule details:', error);
      return null;
    }
  }

  // Get game details
  async getGameDetails(capsuleId: string): Promise<ActiveGame | null> {
    try {
      const response: ApiResponse<ActiveGame> = await apiService.get(
        `/games/${capsuleId}`
      );
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch game details:', error);
      return null;
    }
  }
}

export const discoverService = new DiscoverService();
