import { describe, expect, it } from 'vitest';

import {
  quarterHourOptions,
  scheduleNotice,
  scheduleSummary,
  zoneShortName,
} from '@/pages/alat/schedule-text';

describe('quarterHourOptions', () => {
  it('lists a time every 15 minutes from 00:00 to 23:45', () => {
    const times = quarterHourOptions([]).map((option) => option.value);

    expect(times).toHaveLength(96);
    expect(times.slice(0, 3)).toEqual(['00:00', '00:15', '00:30']);
    expect(times.at(-1)).toBe('23:45');
  });

  it('adds a time of the service that is off the grid and keeps the order', () => {
    const times = quarterHourOptions(['17:20', '17:30']).map((option) => option.value);

    expect(times).toHaveLength(97);
    expect(times.slice(times.indexOf('17:15'), times.indexOf('17:15') + 3)).toEqual([
      '17:15',
      '17:20',
      '17:30',
    ]);
  });
});

describe('scheduleSummary', () => {
  it('names both times, or only the off time', () => {
    expect(scheduleSummary({ offAt: '17:30', onAt: '08:00' })).toBe(
      'Mati pukul 17:30, nyala pukul 08:00',
    );
    expect(scheduleSummary({ offAt: '17:30', onAt: null })).toBe('Mati pukul 17:30');
  });
});

describe('zoneShortName', () => {
  it('gives the short name that the owner knows, and the zone itself when there is none', () => {
    expect(zoneShortName('Asia/Jakarta')).toBe('WIB');
    expect(zoneShortName('Asia/Makassar')).toBe('WITA');
    expect(zoneShortName('Asia/Jayapura')).toBe('WIT');
    expect(zoneShortName('Europe/Paris')).toBe('Europe/Paris');
  });
});

describe('scheduleNotice', () => {
  it('reads nothing from a state that the form did not leave', () => {
    expect(scheduleNotice(undefined)).toBeUndefined();
    expect(scheduleNotice(null)).toBeUndefined();
    expect(scheduleNotice({ saved: 'name' })).toBeUndefined();
    expect(scheduleNotice({ scheduleRemoved: false })).toBeUndefined();
    expect(scheduleNotice({ scheduleSaved: { offAt: '25:00', days: 'daily' } })).toBeUndefined();
  });
});
