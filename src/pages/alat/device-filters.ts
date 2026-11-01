import type { DeviceListItem, DeviceStatusValue } from '@/api/devices';
import { statusFilterLabels } from '@/pages/alat/device-status';

export type DeviceFilter = 'all' | DeviceStatusValue;

export const deviceFilterOptions: { value: DeviceFilter; label: string }[] = [
  { value: 'all', label: 'Semua alat' },
  { value: 'anomali', label: statusFilterLabels.anomali },
  { value: 'offline', label: statusFilterLabels.offline },
  { value: 'siaga', label: statusFilterLabels.siaga },
  { value: 'nyala', label: statusFilterLabels.nyala },
  { value: 'mati', label: statusFilterLabels.mati },
];

export function summarize(items: DeviceListItem[]): string {
  const anomalies = items.filter((item) => item.status === 'anomali').length;
  const offline = items.filter((item) => item.status === 'offline').length;

  return [
    `${items.length.toString()} alat terpasang`,
    anomalies > 0 ? `${anomalies.toString()} anomali` : undefined,
    offline > 0 ? `${offline.toString()} offline` : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(', ');
}
