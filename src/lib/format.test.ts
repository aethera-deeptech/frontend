import { afterEach, describe, expect, it } from 'vitest';

import {
  businessNow,
  daysInMonth,
  formatDate,
  formatDateTime,
  formatDayTime,
  formatFixed,
  formatTime,
  formatWatts,
  formatDateWithYear,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahJuta,
  formatWeekRange,
  getBusinessZone,
  isoWeekRange,
  isSameDay,
  parseMoment,
  setBusinessZone,
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

describe('formatMonthYear', () => {
  it('writes the month in full with the year', () => {
    expect(formatMonthYear('2026-10')).toBe('Oktober 2026');
    expect(formatMonthYear('2026-01')).toBe('Januari 2026');
  });

  it('returns text that is not a month as it was', () => {
    expect(formatMonthYear('2026-13')).toBe('2026-13');
    expect(formatMonthYear('')).toBe('');
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

describe('signs of values that round to zero', () => {
  it('writes no sign on an amount or a number that rounds to 0', () => {
    expect(formatRupiah(-0.4)).toBe('Rp0');
    expect(formatNumber(-0.001, 2)).toBe('0');
  });

  it('keeps the sign of a value that does not round to 0', () => {
    expect(formatRupiah(-1500)).toBe('-Rp1.500');
    expect(formatNumber(-0.41)).toBe('-0,41');
  });
});

describe('parseMoment', () => {
  it('reads the clock of the string and not the clock of the device', () => {
    const date = parseMoment('2026-10-29T09:30:00+07:00');

    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ]).toEqual([2026, 9, 29, 9, 30]);
  });

  it('turns a moment in UTC into the clock of the business, which is how the API writes the device times', () => {
    const date = parseMoment('2026-11-03T05:45:35Z');

    expect([date.getDate(), date.getHours(), date.getMinutes()]).toEqual([3, 12, 45]);
  });

  it('shows the same clock for the same instant whichever offset the API writes', () => {
    expect(parseMoment('2026-10-29T02:30:00Z').getTime()).toBe(
      parseMoment('2026-10-29T09:30:00+07:00').getTime(),
    );
  });

  it.each(['2026-10-29T09:30:00+0700', '2026-10-29T09:30:00+07', '2026-10-29T09:30+07:00'])(
    'reads the offset written as %s',
    (moment) => {
      expect(parseMoment(moment).getTime()).toBe(parseMoment('2026-10-29T02:30:00Z').getTime());
    },
  );

  it('reads fractional seconds and drops them', () => {
    const date = parseMoment('2026-11-03T05:45:35.123456Z');

    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([12, 45, 0]);
  });

  it('reads a moment without an offset as it is written', () => {
    const date = parseMoment('2026-10-29T09:30:00');

    expect([date.getDate(), date.getHours(), date.getMinutes()]).toEqual([29, 9, 30]);
  });

  it('turns the last minute of the year in UTC into the first day of the next year', () => {
    const date = parseMoment('2026-12-31T17:30:00Z');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2027, 0, 1, 0,
    ]);
  });

  it('gives an invalid date for a text that is no moment', () => {
    expect(Number.isNaN(parseMoment('not a moment').getTime())).toBe(true);
  });

  it('moves a moment in UTC to the next day when the business clock has passed midnight', () => {
    const date = parseMoment('2026-10-28T20:30:00Z');

    expect([date.getDate(), date.getHours(), date.getMinutes()]).toEqual([29, 3, 30]);
  });

  it('keeps the day of a moment just after midnight', () => {
    expect(parseMoment('2026-11-01T00:30:00+07:00').getDate()).toBe(1);
    expect(parseMoment('2026-11-01T00:30:00Z').getDate()).toBe(1);
  });

  it('falls back to the date parser for another format', () => {
    expect(parseMoment('2026-10-29').getFullYear()).toBe(2026);
  });
});

describe('businessNow', () => {
  it('shows the wall time of the business whatever the time zone of the device is', () => {
    const now = businessNow(new Date('2026-10-28T19:30:00Z'));

    expect([
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    ]).toEqual([2026, 9, 29, 2, 30]);
  });

  it('follows the zone of the business, so a business in WIT is two hours ahead of WIB', () => {
    const now = businessNow(new Date('2026-10-29T16:00:00Z'), 'Asia/Jayapura');

    expect([now.getDate(), now.getHours()]).toEqual([30, 1]);
  });

  it('falls back to WIB for a zone that the browser does not know', () => {
    const now = businessNow(new Date('2026-10-29T16:00:00Z'), 'Mars/Olympus');

    expect([now.getDate(), now.getHours()]).toEqual([29, 23]);
  });

  it('reads midnight of the business as hour 0 and not 24', () => {
    const now = businessNow(new Date('2026-10-28T17:05:00Z'));

    expect([now.getDate(), now.getHours(), now.getMinutes()]).toEqual([29, 0, 5]);
  });
});

describe('isoWeekRange', () => {
  it('runs from the Monday to the Sunday of the week', () => {
    const range = isoWeekRange('2026-W43');

    expect(range && [formatDateWithYear(range.start), formatDateWithYear(range.end)]).toEqual([
      '19 Okt 2026',
      '25 Okt 2026',
    ]);
  });

  it('starts week 1 in the old year when 4 January is late in the week', () => {
    const range = isoWeekRange('2026-W01');

    expect(range && [formatDateWithYear(range.start), formatDateWithYear(range.end)]).toEqual([
      '29 Des 2025',
      '4 Jan 2026',
    ]);
  });

  it('gives nothing for a text that is not a week', () => {
    expect(isoWeekRange('2026-10')).toBeUndefined();
    expect(isoWeekRange('2026-W54')).toBeUndefined();
    expect(isoWeekRange('2026-W00')).toBeUndefined();
  });
});

describe('formatWeekRange', () => {
  it('writes the month once when the week stays in it', () => {
    expect(formatWeekRange('2026-W43')).toBe('19 sampai 25 Okt 2026');
  });

  it('writes both months when the week crosses a month, and can leave the year out', () => {
    expect(formatWeekRange('2026-W40')).toBe('28 Sep sampai 4 Okt 2026');
    expect(formatWeekRange('2026-W40', false)).toBe('28 Sep sampai 4 Okt');
  });

  it('gives back a text that is not a week', () => {
    expect(formatWeekRange('2026-10')).toBe('2026-10');
  });
});

describe('setBusinessZone', () => {
  afterEach(() => {
    setBusinessZone(undefined);
  });

  it('shows the moments by the clock of the zone in the settings', () => {
    setBusinessZone('Asia/Jayapura');

    const date = parseMoment('2026-10-29T02:30:00Z');

    expect([date.getHours(), date.getMinutes()]).toEqual([11, 30]);
    expect(getBusinessZone()).toBe('Asia/Jayapura');
  });

  it('gives businessNow the same zone', () => {
    setBusinessZone('Asia/Makassar');

    expect(businessNow(new Date('2026-10-29T16:00:00Z')).getHours()).toBe(0);
  });

  it('falls back to Asia/Jakarta for a zone that the browser does not know and when there is none', () => {
    setBusinessZone('Mars/Olympus');
    expect(getBusinessZone()).toBe('Asia/Jakarta');

    setBusinessZone('Asia/Makassar');
    setBusinessZone(undefined);
    expect(getBusinessZone()).toBe('Asia/Jakarta');
  });
});
