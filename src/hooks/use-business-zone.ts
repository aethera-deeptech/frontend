import { useSyncExternalStore } from 'react';

import { useSettings } from '@/api/settings';
import { getBusinessZone, subscribeBusinessZone } from '@/lib/format';

// The zone of the business. A screen that shows moments calls this, so the settings that hold the zone are read and the screen
// draws again when the zone arrives or changes. It keeps its state, which a screen that starts over would not.
export function useBusinessZone(): string {
  useSettings();
  return useSyncExternalStore(subscribeBusinessZone, getBusinessZone);
}
