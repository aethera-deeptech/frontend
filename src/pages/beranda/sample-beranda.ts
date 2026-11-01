import type { BerandaData, ReadyBeranda } from '@/api/beranda';

// Sample data for the tests and the stories only. The app never imports this file.
export function sampleReady(overrides: Partial<ReadyBeranda> = {}): ReadyBeranda {
  return {
    phase: 'ready',
    businessName: 'Konveksi Maju Jaya',
    asOf: new Date(2026, 9, 29, 9, 30).toISOString(),
    savingPerMonthRp: 312_000,
    statusCounts: { anomali: 1, offline: 1, siaga: 1, nyala: 3, mati: 1 },
    recommendations: [
      {
        id: 'r1',
        title: 'Matikan mesin jahit 3 di luar jam kerja',
        deviceName: 'Mesin jahit 3',
        savingPerMonthRp: 118_000,
      },
      {
        id: 'r2',
        title: 'Kurangi waktu pemanasan setrika uap',
        deviceName: 'Setrika uap',
        savingPerMonthRp: 104_000,
      },
    ],
    bill: {
      dailyTotalRp: Array.from({ length: 29 }, (_, day) => Math.round(day * 70_000)),
      projectedTotalRp: 2_100_000,
      potentialTotalRp: 1_788_000,
    },
    topDevices: [
      { name: 'Setrika uap', kwh: 160 },
      { name: 'Mesin jahit 1', kwh: 142 },
    ],
    energyPerPiece: { status: 'verified', beforeKwh: 0.41, afterKwh: 0.37 },
    ...overrides,
  };
}

export function sampleCollecting(): BerandaData {
  return {
    phase: 'collecting',
    businessName: 'Konveksi Maju Jaya',
    asOf: new Date(2026, 9, 29, 9, 30).toISOString(),
    collectedDays: 4,
    neededDays: 7,
    topDevices: [
      { name: 'Setrika uap', kwh: 22 },
      { name: 'Mesin jahit 1', kwh: 20 },
    ],
  };
}

export function sampleEmpty(): BerandaData {
  return {
    phase: 'no-devices',
    businessName: 'Konveksi Maju Jaya',
    asOf: new Date(2026, 9, 29, 9, 30).toISOString(),
  };
}
