import { describe, expect, it } from 'vitest';

import { addMonths, monthOf, parseDay, toDayString } from '@/lib/dates';

describe('parseDay and toDayString', () => {
  it('read and write the same day', () => {
    expect(toDayString(parseDay('2026-10-29'))).toBe('2026-10-29');
    expect(toDayString(parseDay('2026-01-05'))).toBe('2026-01-05');
  });

  it('keep the local day', () => {
    const date = parseDay('2026-10-29');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 29]);
  });
});

describe('monthOf and addMonths', () => {
  it('cut the month out of a day', () => {
    expect(monthOf('2026-10-29')).toBe('2026-10');
  });

  it('move over the end of a year', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
  });
});
