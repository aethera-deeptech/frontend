import { z } from 'zod';

import type { DeviceDetail } from '@/api/devices';
import { formatDateTime, formatNumber, formatTime, parseMoment } from '@/lib/format';

// The total counts whole hours, so it starts at the next whole hour after the reset. The date has the fields of the business clock.
export function countingStart(resetAt: string): Date {
  const at = parseMoment(resetAt);

  return new Date(at.getFullYear(), at.getMonth(), at.getDate(), at.getHours() + 1);
}

// The line under the figure of the card Total energi
export function energySinceCaption(energySince: NonNullable<DeviceDetail['energySince']>): string {
  return energySince.resetAt === null
    ? 'Semua data yang tersimpan'
    : `Dihitung mulai ${formatDateTime(countingStart(energySince.resetAt))}`;
}

// A total under 10 kWh keeps a decimal, so the first hours after a reset do not read as 0
export function formatTotalKwh(kwh: number): string {
  return `${formatNumber(kwh, kwh < 10 ? 1 : 0)} kWh`;
}

// What the page of the device remembers from the screen before. It travels in the history entry of the move, as the schedule notice does.
const noticeState = z.object({
  energyReset: z.object({ resetAt: z.iso.datetime({ offset: true }) }),
});

export function energyResetNotice(state: unknown): { title: string; message: string } | undefined {
  const parsed = noticeState.safeParse(state);

  return parsed.success
    ? {
        title: 'Total energi mulai dari nol',
        message: `Hitungan mulai pukul ${formatTime(countingStart(parsed.data.energyReset.resetAt))}.`,
      }
    : undefined;
}
