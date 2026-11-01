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

export type SavedSetting = 'name' | 'tariff' | 'hours' | 'sensitivity';

export const savedMessages: Record<SavedSetting, string> = {
  name: 'Nama usaha sudah diperbarui.',
  tariff: 'Tarif listrik sudah diperbarui.',
  hours: 'Jam kerja sudah diperbarui.',
  sensitivity: 'Kepekaan anomali sudah diperbarui.',
};
