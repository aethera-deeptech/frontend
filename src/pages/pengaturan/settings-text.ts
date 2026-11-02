import type { Sensitivity, WorkDays, WorkHours } from '@/api/settings';

export const dayLabels: Record<WorkDays, string> = {
  'mon-fri': 'Senin sampai Jumat',
  'mon-sat': 'Senin sampai Sabtu',
  daily: 'Setiap hari',
};

export const sensitivityLabels: Record<Sensitivity, string> = {
  rendah: 'Rendah',
  sedang: 'Sedang',
  tinggi: 'Tinggi',
};

// The three zones of Indonesia. Each one is a place with a whole hour offset, which the API asks for.
export const zoneLabels: Record<string, string> = {
  'Asia/Jakarta': 'WIB (Jakarta)',
  'Asia/Makassar': 'WITA (Makassar)',
  'Asia/Jayapura': 'WIT (Jayapura)',
};

// A zone that the API sent and that is not on the list shows its own name
export function zoneLabel(zone: string): string {
  return zoneLabels[zone] ?? zone;
}

// The three zones, and the zone that the API sent when it is another one, so the field can show it
export function zoneOptions(current: string): { value: string; label: string }[] {
  const zones = [...new Set([...Object.keys(zoneLabels), current])];
  return zones.map((value) => ({ value, label: zoneLabel(value) }));
}

export function hoursLine(hours: WorkHours): string {
  return `${hours.start} sampai ${hours.end}`;
}

// A time every half hour. A time that the API sent and that is not on the list is added, so the field can show it.
export function timeOptions(current: string[]): { value: string; label: string }[] {
  const times = Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2)
      .toString()
      .padStart(2, '0');
    return `${hour}:${index % 2 === 0 ? '00' : '30'}`;
  });
  const all = [...new Set([...times, ...current])].sort();
  return all.map((value) => ({ value, label: value }));
}

export type SavedSetting = 'name' | 'tariff' | 'hours' | 'zone' | 'sensitivity';

export const savedMessages: Record<SavedSetting, string> = {
  name: 'Nama usaha sudah diperbarui.',
  tariff: 'Tarif listrik sudah diperbarui.',
  hours: 'Jam kerja sudah diperbarui.',
  zone: 'Zona waktu sudah diperbarui.',
  sensitivity: 'Kepekaan anomali sudah diperbarui.',
};
