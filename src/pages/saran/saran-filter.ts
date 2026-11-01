import type { RecommendationListItem, RecommendationStatus } from '@/api/recommendations';
import { statusLabels, waitsForDecision } from '@/pages/saran/recommendation-status';

export type StatusFilter = 'all' | RecommendationStatus;

export const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'pending', label: statusLabels.pending },
  { value: 'deferred', label: statusLabels.deferred },
  { value: 'applied', label: statusLabels.applied },
  { value: 'verified', label: statusLabels.verified },
  { value: 'rejected', label: statusLabels.rejected },
];

// The tips that wait for the user come first, and a deferred tip stays behind the new ones
export function visibleItems(
  items: RecommendationListItem[],
  filter: StatusFilter,
): { waiting: RecommendationListItem[]; handled: RecommendationListItem[] } {
  const shown = filter === 'all' ? items : items.filter((item) => item.status === filter);
  const waiting = shown.filter((item) => waitsForDecision(item.status));

  return {
    waiting: [
      ...waiting.filter((item) => item.status === 'pending'),
      ...waiting.filter((item) => item.status === 'deferred'),
    ],
    handled: shown.filter((item) => !waitsForDecision(item.status)),
  };
}
