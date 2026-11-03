import { describe, expect, it } from 'vitest';

import { ApiError, NetworkError } from '@/api/client';
import { hasNoRelay, relaySchema } from '@/api/relay';

const base = {
  state: 'on',
  reportedAt: '2026-10-29T09:30:00+07:00',
  pending: null,
  last: null,
  schedule: null,
};

describe('relaySchema', () => {
  it('reads the answer of a plug that waits for a command', () => {
    const relay = relaySchema.parse({
      ...base,
      pending: {
        id: 'c1',
        action: 'off',
        status: 'sent',
        expiresAt: '2026-10-29T09:40:00+07:00',
      },
    });

    expect(relay.pending?.action).toBe('off');
    expect(relay.pending?.status).toBe('sent');
  });

  it('reads a schedule and gives a missing switch on time and a missing pause their defaults', () => {
    const relay = relaySchema.parse({
      ...base,
      schedule: { offAt: '17:30', days: 'mon-fri' },
    });

    expect(relay.schedule).toEqual({ enabled: true, offAt: '17:30', onAt: null, days: 'mon-fri' });
  });

  it('takes a state that this version does not know as unknown', () => {
    expect(relaySchema.parse({ ...base, state: 'dim' }).state).toBe('unknown');
  });

  it('leaves out a result or a schedule in a shape that it does not know', () => {
    const relay = relaySchema.parse({
      ...base,
      last: {
        action: 'off',
        status: 'cancelled',
        source: 'owner',
        at: '2026-10-29T09:31:00+07:00',
      },
      schedule: { offAt: '25:00', days: 'sometimes' },
    });

    expect(relay.last).toBeNull();
    expect(relay.schedule).toBeNull();
  });

  it('refuses a pending command without an expiry', () => {
    const result = relaySchema.safeParse({
      ...base,
      pending: { id: 'c1', action: 'off', status: 'pending' },
    });

    expect(result.success).toBe(false);
  });
});

describe('hasNoRelay', () => {
  it('is true for a clamp and for a device that is gone', () => {
    expect(hasNoRelay(new ApiError(409, { code: 'no_relay' }))).toBe(true);
    expect(hasNoRelay(new ApiError(404))).toBe(true);
  });

  it('is false for a failure that may go away', () => {
    expect(hasNoRelay(new ApiError(500))).toBe(false);
    expect(hasNoRelay(new NetworkError())).toBe(false);
  });
});
