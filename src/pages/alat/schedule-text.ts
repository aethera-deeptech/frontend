import { z } from 'zod';

import { scheduleSchema, type ScheduleDays, type ScheduleInput } from '@/api/relay';

export const scheduleDayLabels: Record<ScheduleDays, string> = {
  'mon-fri': 'Senin sampai Jumat',
  'mon-sat': 'Senin sampai Sabtu',
  daily: 'Setiap hari',
};

const zoneNames: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

// The short name of the zone of the business, which the owner knows. A zone with no short name is shown as it is.
export function zoneShortName(zone: string): string {
  return zoneNames[zone] ?? zone;
}

// "Mati pukul 17:30, nyala pukul 08:00", or only the first part when the plug stays off until the owner switches it on
export function scheduleSummary(schedule: { offAt: string; onAt: string | null }): string {
  return schedule.onAt === null
    ? `Mati pukul ${schedule.offAt}`
    : `Mati pukul ${schedule.offAt}, nyala pukul ${schedule.onAt}`;
}

// A time every 15 minutes. A time that the API sent and that is not on the list is added, so the field can show it.
export function quarterHourOptions(current: string[]): { value: string; label: string }[] {
  const times = Array.from({ length: 96 }, (_, index) => {
    const hour = Math.floor(index / 4)
      .toString()
      .padStart(2, '0');
    return `${hour}:${((index % 4) * 15).toString().padStart(2, '0')}`;
  });

  return [...new Set([...times, ...current])].sort().map((value) => ({ value, label: value }));
}

// The state that the form leaves in the history entry of the device page, so the page can say what happened
export interface ScheduleNotice {
  title: string;
  message: string;
}

const noticeState = z.union([
  z.object({ scheduleSaved: scheduleSchema }),
  z.object({ scheduleRemoved: z.literal(true) }),
]);

export function scheduleNoticeState(saved: ScheduleInput): { scheduleSaved: ScheduleInput } {
  return { scheduleSaved: saved };
}

export const scheduleRemovedState = { scheduleRemoved: true } as const;

// The notice for the history state of the device page, and nothing for a state that is not one of the two above
export function scheduleNotice(state: unknown): ScheduleNotice | undefined {
  const parsed = noticeState.safeParse(state);

  if (!parsed.success) {
    return undefined;
  }
  if ('scheduleRemoved' in parsed.data) {
    return { title: 'Jadwal dihapus', message: 'Colokan tidak lagi mati dan nyala sendiri.' };
  }
  const schedule = parsed.data.scheduleSaved;
  const times =
    schedule.onAt === null
      ? `mati pukul ${schedule.offAt}`
      : `mati pukul ${schedule.offAt} dan nyala pukul ${schedule.onAt}`;

  return {
    title: 'Jadwal tersimpan',
    message: schedule.enabled
      ? `Colokan ${times}, ${scheduleDayLabels[schedule.days]}.`
      : 'Jadwal dijeda. Jam tersimpan, tetapi colokan tidak berganti sendiri.',
  };
}
