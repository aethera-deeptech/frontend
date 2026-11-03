import type { Relay } from '@/api/relay';

// Sample data for the tests and the stories only. The app never imports this file.
// A plug that is on and has nothing waiting, no result and no schedule.
export function sampleRelay(overrides: Partial<Relay> = {}): Relay {
  return {
    state: 'on',
    reportedAt: '2026-10-29T09:30:00+07:00',
    pending: null,
    last: null,
    schedule: null,
    gatewayOnline: true,
    ...overrides,
  };
}
