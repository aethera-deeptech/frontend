import type { ComponentProps } from 'react';

import type { RecommendationStatus } from '@/api/recommendations';
import type { Tag } from '@/components/ui/tag';

type Tone = NonNullable<ComponentProps<typeof Tag>['tone']>;

export const statusLabels: Record<RecommendationStatus, string> = {
  pending: 'Menunggu keputusan',
  deferred: 'Ditunda',
  applied: 'Diterapkan',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
};

export const statusTones: Record<RecommendationStatus, Tone> = {
  pending: 'accent',
  deferred: 'muted',
  applied: 'warning',
  verified: 'success',
  rejected: 'muted',
};

// A tip that still waits for the user, or one that the user has handled
export function waitsForDecision(status: RecommendationStatus): boolean {
  return status === 'pending' || status === 'deferred';
}
