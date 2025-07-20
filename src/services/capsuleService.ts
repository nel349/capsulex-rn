import { useCallback } from 'react';

import type { CreateCapsuleRequest, Capsule, ApiResponse } from '../types/api';

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
      status: 'pending' | 'revealed' | 'failed',
      additionalData?: {
        revealed_at?: string;
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

  return {
    createCapsule,
    getMyCapsules,
    getRevealedCapsules,
    updateCapsuleStatus,
  };
}
