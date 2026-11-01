import type { DeviceStatusValue } from '@/api/devices';

export const statusFilterLabels: Record<DeviceStatusValue, string> = {
  anomali: 'Anomali',
  offline: 'Offline',
  siaga: 'Siaga',
  nyala: 'Nyala',
  mati: 'Mati',
};

export const signalLabels = {
  baik: 'Baik',
  cukup: 'Cukup',
  lemah: 'Lemah',
  'tidak-ada': 'Tidak ada',
} as const;
