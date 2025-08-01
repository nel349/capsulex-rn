import { useCallback } from 'react';

import type { CreateCapsuleRequest, Capsule } from '../types/api';

import { apiService } from './api';

export function useCapsuleService() {
  const createCapsule = useCallback(
    async (capsuleData: CreateCapsuleRequest): Promise<Capsule> => {
      const response = await apiService.post<Capsule>(
        '/capsules/create',
        capsuleData
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create capsule');
      }

      return response.data;
    },
    []
  );

  const getMyCapsules = useCallback(async (): Promise<Capsule[]> => {
    const response = await apiService.get<Capsule[]>('/capsules/my-capsules');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch capsules');
    }

    return response.data;
  }, []);

  const getRevealedCapsules = useCallback(
    async (limit = 50): Promise<Capsule[]> => {
      const response = await apiService.get<Capsule[]>(
        `/capsules/revealed?limit=${limit}`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch revealed capsules');
      }

      return response.data;
    },
    []
  );

  const updateCapsuleStatus = useCallback(
    async (
      capsuleId: string,
      status: 'pending' | 'ready_to_reveal' | 'revealed' | 'failed',
      additionalData?: {
        reveal_tx_signature?: string;
        social_post_id?: string;
        posted_to_social?: boolean;
      }
    ): Promise<Capsule> => {
      const response = await apiService.put<Capsule>(
        `/capsules/${capsuleId}/status`,
        { status, ...additionalData }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update capsule status');
      }

      return response.data;
    },
    []
  );

  // Specific function to mark capsule as revealed after successful blockchain transaction
  const markCapsuleAsRevealed = useCallback(
    async (capsuleId: string, revealTxSignature: string): Promise<Capsule> => {
      return updateCapsuleStatus(capsuleId, 'revealed', {
        reveal_tx_signature: revealTxSignature,
      });
    },
    [updateCapsuleStatus]
  );

  return {
    createCapsule,
    getMyCapsules,
    getRevealedCapsules,
    updateCapsuleStatus,
    markCapsuleAsRevealed,
  };
}
