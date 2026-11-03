import { describe, expect, it } from 'vitest';

import {
  countingStart,
  energyResetNotice,
  energySinceCaption,
  formatTotalKwh,
} from '@/pages/alat/energy-text';

describe('countingStart', () => {
  it('is the next whole hour after the reset, by the clock of the business', () => {
    const start = countingStart('2026-10-29T10:12:00+07:00');

    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([29, 11, 0]);
  });

  it('moves to the next day after 23:00 and keeps an exact hour, like the service rounds up on the instant', () => {
    const night = countingStart('2026-10-29T23:30:00+07:00');
    const exact = countingStart('2026-10-29T09:00:00+07:00');

    expect([night.getDate(), night.getHours()]).toEqual([30, 0]);
    expect([exact.getDate(), exact.getHours()]).toEqual([29, 9]);
  });

  it('reads a moment in UTC by the business zone, which is WIB until the settings say otherwise', () => {
    // 03:12 UTC is 10:12 WIB
    expect(countingStart('2026-10-29T03:12:00Z').getHours()).toBe(11);
  });
});

describe('energySinceCaption', () => {
  it('says that the total holds all data when there was no reset', () => {
    expect(energySinceCaption({ resetAt: null, kwh: 12 })).toBe('Semua data yang tersimpan');
  });

  it('names the hour when the count starts and not the time of the reset', () => {
    expect(energySinceCaption({ resetAt: '2026-10-29T10:12:00+07:00', kwh: 0 })).toBe(
      'Dihitung mulai 29 Okt 2026, 11:00',
    );
  });
});

describe('formatTotalKwh', () => {
  it('keeps decimals for a young total so it does not read as 0', () => {
    expect(formatTotalKwh(0)).toBe('0 kWh');
    expect(formatTotalKwh(0.04)).toBe('0,04 kWh');
    expect(formatTotalKwh(0.4)).toBe('0,4 kWh');
    expect(formatTotalKwh(2.46)).toBe('2,5 kWh');
    expect(formatTotalKwh(9.96)).toBe('10 kWh');
  });

  it('shows whole kWh from 10 on, with dots between thousands', () => {
    expect(formatTotalKwh(142)).toBe('142 kWh');
    expect(formatTotalKwh(1260.4)).toBe('1.260 kWh');
  });
});

describe('energyResetNotice', () => {
  it('says when the count starts from the reset that the history entry carries', () => {
    expect(energyResetNotice({ energyReset: { resetAt: '2026-10-29T10:12:00+07:00' } })).toEqual({
      title: 'Total energi mulai dari nol',
      message: 'Hitungan mulai pukul 11:00.',
    });
  });

  it.each([undefined, null, {}, { energyReset: {} }, { energyReset: { resetAt: 'now' } }])(
    'says nothing for the state %j',
    (state) => {
      expect(energyResetNotice(state)).toBeUndefined();
    },
  );
});
