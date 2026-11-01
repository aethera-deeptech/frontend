import type { Production } from '@/api/production';

// Sample data for the tests and the stories only. The app never imports this file.
export function sampleProduction(overrides: Partial<Production> = {}): Production {
  return {
    unit: 'potong',
    units: ['potong', 'lusin', 'kilogram'],
    today: '2026-10-29',
    recent: [
      { date: '2026-10-28', quantity: 120 },
      { date: '2026-10-27', quantity: 96 },
      { date: '2026-10-26', quantity: 110 },
    ],
    ...overrides,
  };
}
