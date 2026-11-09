import { describe, expect, it } from 'vitest';

import { formatRelativePast } from '@/lib/format';

// The same instant, written in UTC and with the offset of the business
const instant = '2026-10-29T07:00:00Z';
const sameInstant = '2026-10-29T14:00:00+07:00';
const at = Date.parse(instant);
const minutes = (count: number) => count * 60_000;
const hours = (count: number) => count * 3_600_000;

describe('formatRelativePast', () => {
  it('says a few minutes up to 15 minutes, and a moment in the future counts as now', () => {
    expect(formatRelativePast(instant, at)).toBe('beberapa menit lalu');
    expect(formatRelativePast(instant, at + minutes(14) + 59_000)).toBe('beberapa menit lalu');
    expect(formatRelativePast(instant, at - minutes(5))).toBe('beberapa menit lalu');
  });

  it('says less than an hour from 15 to 59 minutes', () => {
    expect(formatRelativePast(instant, at + minutes(15))).toBe('kurang dari 1 jam lalu');
    expect(formatRelativePast(instant, at + minutes(59))).toBe('kurang dari 1 jam lalu');
  });

  it('counts whole hours and rounds down', () => {
    expect(formatRelativePast(instant, at + hours(1))).toBe('1 jam lalu');
    expect(formatRelativePast(instant, at + hours(3) + minutes(59))).toBe('3 jam lalu');
    expect(formatRelativePast(instant, at + hours(23) + minutes(59))).toBe('23 jam lalu');
  });

  it('counts whole days up to six days', () => {
    expect(formatRelativePast(instant, at + hours(24))).toBe('1 hari lalu');
    expect(formatRelativePast(instant, at + hours(24 * 6) + hours(23))).toBe('6 hari lalu');
  });

  it('gives the date in the zone of the business from seven days on', () => {
    expect(formatRelativePast(instant, at + hours(24 * 7))).toBe('29 Okt 2026');
    // 23:30 in UTC is already the next day in the zone of the business (UTC+7)
    expect(formatRelativePast('2026-09-01T23:30:00Z', Date.parse('2026-11-01T00:00:00Z'))).toBe(
      '2 Sep 2026',
    );
  });

  it('does not depend on how the moment is written, because the difference is taken between instants', () => {
    const now = at + hours(3);

    expect(formatRelativePast(sameInstant, now)).toBe(formatRelativePast(instant, now));
    expect(formatRelativePast(sameInstant, now)).toBe('3 jam lalu');
  });
});
