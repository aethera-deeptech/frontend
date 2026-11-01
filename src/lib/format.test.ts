import { describe, expect, it } from 'vitest';

import {
  daysInMonth,
  formatDate,
  formatDateTime,
  formatDayTime,
  formatFixed,
  formatTime,
  formatWatts,
  formatDateWithYear,
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahJuta,
  isSameDay,
} from '@/lib/format';

describe('formatRupiah', () => {
  it('groups the thousands with a dot and has no space after Rp', () => {
    expect(formatRupiah(2_100_000)).toBe('Rp2.100.000');
    expect(formatRupiah(118_000)).toBe('Rp118.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });

  it('rounds to whole rupiah and keeps the sign', () => {
    expect(formatRupiah(1_234.6)).toBe('Rp1.235');
    expect(formatRupiah(-5_000)).toBe('-Rp5.000');
  });
});

describe('formatRupiahJuta', () => {
  it('writes millions for an axis', () => {
    expect(formatRupiahJuta(0)).toBe('Rp0');
    expect(formatRupiahJuta(2_000_000)).toBe('Rp2 jt');
    expect(formatRupiahJuta(1_500_000)).toBe('Rp1,5 jt');
  });
});

describe('formatNumber', () => {
  it('uses a decimal comma and drops zeros at the end', () => {
    expect(formatNumber(0.41)).toBe('0,41');
    expect(formatNumber(4.2)).toBe('4,2');
    expect(formatNumber(160)).toBe('160');
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });
});

describe('formatFixed', () => {
  it('keeps the zeros after the comma', () => {
    expect(formatFixed(7, 1)).toBe('7,0');
    expect(formatFixed(0, 1)).toBe('0,0');
    expect(formatFixed(4.26, 1)).toBe('4,3');
    expect(formatFixed(1250, 0)).toBe('1.250');
  });
});

describe('formatWatts', () => {
  it('groups the thousands and adds the unit', () => {
    expect(formatWatts(780)).toBe('780 W');
    expect(formatWatts(1250)).toBe('1.250 W');
    expect(formatWatts(0)).toBe('0 W');
  });
});

describe('formatPercent', () => {
  it('shows one decimal at most', () => {
    expect(formatPercent(9.756)).toBe('9,8%');
    expect(formatPercent(10)).toBe('10%');
  });
});

describe('dates', () => {
  const date = new Date(2026, 9, 28, 7, 5);

  it('writes the day with a short month', () => {
    expect(formatDate(date)).toBe('28 Okt');
    expect(formatDateWithYear(date)).toBe('28 Okt 2026');
  });

  it('writes the time with a colon and two digits', () => {
    expect(formatDateTime(date)).toBe('28 Okt 2026, 07:05');
    expect(formatDayTime(date)).toBe('28 Okt, 07:05');
    expect(formatTime(date)).toBe('07:05');
  });

  it('knows the length of a month', () => {
    expect(daysInMonth(date)).toBe(31);
    expect(daysInMonth(new Date(2026, 1, 3))).toBe(28);
  });

  it('compares days and not times', () => {
    expect(isSameDay(date, new Date(2026, 9, 28, 23, 59))).toBe(true);
    expect(isSameDay(date, new Date(2026, 9, 29, 0, 1))).toBe(false);
  });
});
