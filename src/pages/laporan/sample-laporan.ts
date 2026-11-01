import type { ReadyReport, ReportData } from '@/api/reports';

// Sample data for the tests and the stories only. The app never imports this file.
export function sampleReady(overrides: Partial<ReadyReport> = {}): ReadyReport {
  return {
    phase: 'ready',
    periods: ['2026-10', '2026-09', '2026-08', '2026-07'],
    period: '2026-10',
    through: '2026-10-29T09:30:00+07:00',
    saving: {
      verified: { rp: 64_000, count: 1, checkedDays: 14 },
      applied: { rp: 46_000, count: 1, day: 9, neededDays: 14 },
      estimate: { rp: 312_000, count: 3 },
    },
    topDevices: [
      { name: 'Setrika uap', kwh: 160 },
      { name: 'Mesin jahit 1', kwh: 142 },
      { name: 'Kompresor', kwh: 118 },
      { name: 'Mesin jahit 3', kwh: 96 },
    ],
    billRp: 1_965_000,
    energyPerPiece: { status: 'verified', beforeKwh: 0.41, afterKwh: 0.37 },
    ...overrides,
  };
}

// A month that is over. It has no moment of the newest data and no result for each piece.
export function sampleSeptember(): ReadyReport {
  return sampleReady({
    period: '2026-09',
    through: undefined,
    saving: {
      verified: { rp: 0, count: 0, checkedDays: 0 },
      applied: { rp: 0, count: 0, day: 0, neededDays: 14 },
      estimate: { rp: 0, count: 0 },
    },
    topDevices: [
      { name: 'Setrika uap', kwh: 168 },
      { name: 'Mesin jahit 1', kwh: 149 },
    ],
    billRp: 2_052_000,
    energyPerPiece: undefined,
  });
}

export function sampleCollecting(): ReportData {
  return {
    phase: 'collecting',
    periods: ['2026-10'],
    period: '2026-10',
    collectedDays: 4,
    neededDays: 7,
  };
}

export function sampleEmpty(): ReportData {
  return { phase: 'no-devices', periods: ['2026-10'], period: '2026-10' };
}
