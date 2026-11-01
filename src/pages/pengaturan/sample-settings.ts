import type { Settings } from '@/api/settings';

// Sample data for the tests and the stories only. The app never imports this file.
export function sampleSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    businessName: 'Konveksi Maju Jaya',
    workHours: { days: 'mon-sat', start: '08:00', end: '17:00' },
    tariff: { rpPerKwh: 1444, isDefault: true, defaultRpPerKwh: 1444 },
    anomalySensitivity: 'sedang',
    ...overrides,
  };
}
