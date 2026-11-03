import { useSyncExternalStore } from 'react';

import { getBusinessZone, subscribeBusinessZone } from '@/lib/format';

// The zone of the business. A screen that shows moments calls this, so it draws again when the zone arrives or changes, and it
// keeps its state, which a screen that starts over would not.
export function useBusinessZone(): string {
  return useSyncExternalStore(subscribeBusinessZone, getBusinessZone);
}
