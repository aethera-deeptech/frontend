import type { DeviceDetail, DeviceList } from '@/api/devices';

// Sample data for the tests and the stories only. The app never imports this file.
export function sampleDevices(): DeviceList {
  return {
    items: [
      {
        id: 'd1',
        name: 'Kompresor',
        status: 'anomali',
        currentPowerW: 310,
        todayKwh: 4.3,
        anomalyAt: new Date(2026, 9, 29, 2, 10).toISOString(),
      },
      {
        id: 'd2',
        name: 'Kipas gudang',
        status: 'offline',
        currentPowerW: null,
        todayKwh: null,
        lastSeenAt: new Date(2026, 9, 28, 15, 10).toISOString(),
      },
      { id: 'd3', name: 'Mesin jahit 3', status: 'siaga', currentPowerW: 170, todayKwh: 3.2 },
      { id: 'd4', name: 'Mesin jahit 1', status: 'nyala', currentPowerW: 780, todayKwh: 4.2 },
      { id: 'd5', name: 'Setrika uap', status: 'nyala', currentPowerW: 1250, todayKwh: 6.8 },
      { id: 'd6', name: 'Mesin obras', status: 'mati', currentPowerW: 0, todayKwh: 0 },
    ],
  };
}

const points = Array.from({ length: 48 }, (_, index) => 90 + ((index * 7) % 25));

export function sampleNormal(overrides: Partial<DeviceDetail> = {}): DeviceDetail {
  return {
    id: 'd4',
    name: 'Mesin jahit 1',
    status: 'nyala',
    room: 'Ruang jahit',
    kindLabel: 'Colokan pintar',
    currentPowerW: 780,
    todayKwh: 4.2,
    monthKwh: 142,
    onHoursToday: 7.2,
    standbyW: 3,
    lastSeenAt: new Date(2026, 9, 29, 14, 32).toISOString(),
    signal: 'baik',
    powerPattern: {
      points,
      yMaxW: 1000,
      expected: { low: points.map(() => 80), high: points.map(() => 140) },
    },
    ...overrides,
  };
}

export function sampleAnomaly(): DeviceDetail {
  return sampleNormal({
    id: 'd1',
    name: 'Kompresor',
    status: 'anomali',
    room: 'Ruang produksi',
    kindLabel: 'Penjepit arus (dijepit di kabel)',
    currentPowerW: 310,
    todayKwh: 4.3,
    monthKwh: 120,
    onHoursToday: 7,
    standbyW: 8,
    signal: 'cukup',
    anomaly: { at: new Date(2026, 9, 29, 2, 10).toISOString(), peakW: 2000 },
    powerPattern: {
      points: points.map((value, index) => (index >= 4 && index <= 6 ? 2000 : value)),
      yMaxW: 2000,
      anomaly: { from: 3, to: 7 },
    },
  });
}

export function sampleOffline(): DeviceDetail {
  return sampleNormal({
    id: 'd2',
    name: 'Kipas gudang',
    status: 'offline',
    room: 'Gudang',
    currentPowerW: null,
    todayKwh: null,
    monthKwh: 38,
    onHoursToday: null,
    standbyW: null,
    lastSeenAt: new Date(2026, 9, 28, 15, 10).toISOString(),
    signal: 'tidak-ada',
    powerPattern: null,
  });
}
