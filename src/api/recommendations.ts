import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';

// The paths below are an assumption of the frontend, see docs/api-assumptions.md.

export type RecommendationDecision = 'apply' | 'defer';

export function useRecommendationDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: RecommendationDecision }) =>
      apiRequest(`/v1/recommendations/${encodeURIComponent(id)}/${decision}`, z.unknown(), {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: berandaKey }),
  });
}
