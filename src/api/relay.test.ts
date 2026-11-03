import { describe, expect, it } from 'vitest';

import { ApiError, NetworkError } from '@/api/client';
import { hasNoRelay, pendingPollMs, relayPoll, relaySchema } from '@/api/relay';
import { livePollMs } from '@/api/live';

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

  it('reads whether the hub is connected and leaves it out when the API does not say or says something odd', () => {
    expect(relaySchema.parse({ ...base, gatewayOnline: false }).gatewayOnline).toBe(false);
    expect(relaySchema.parse({ ...base, gatewayOnline: true }).gatewayOnline).toBe(true);
    expect(relaySchema.parse(base).gatewayOnline).toBeUndefined();
    expect(relaySchema.parse({ ...base, gatewayOnline: 'no' }).gatewayOnline).toBeUndefined();
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

describe('relayPoll', () => {
  const pending = {
    id: 'c1',
    action: 'off',
    status: 'pending',
    expiresAt: '2026-10-29T09:40:00+07:00',
  } as const;

  it('asks every 5 seconds while a command waits', () => {
    expect(relayPoll({ state: { data: relaySchema.parse({ ...base, pending }) } })).toBe(
      pendingPollMs,
    );
  });

  it('follows the beat of the readings when nothing waits', () => {
    expect(relayPoll({ state: { data: relaySchema.parse(base) } })).toBe(livePollMs);
  });

  it('does not ask again for a first read that failed', () => {
    expect(relayPoll({ state: { data: undefined } })).toBe(false);
  });
});
