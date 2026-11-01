import { describe, expect, it } from 'vitest';

import { ApiError, ContractError, NetworkError } from '@/api/client';
import { createQueryClient, shouldRetry } from '@/api/query-client';

describe('shouldRetry', () => {
  it('does not try again after a client error', () => {
    expect(shouldRetry(0, new ApiError(404))).toBe(false);
  });

  it('does not try again after an answer in the wrong shape', () => {
    expect(shouldRetry(0, new ContractError())).toBe(false);
  });

  it('stops at the edges of the client error range', () => {
    expect(shouldRetry(0, new ApiError(399))).toBe(true);
    expect(shouldRetry(0, new ApiError(400))).toBe(false);
    expect(shouldRetry(0, new ApiError(401))).toBe(false);
    expect(shouldRetry(0, new ApiError(429))).toBe(false);
    expect(shouldRetry(0, new ApiError(499))).toBe(false);
    expect(shouldRetry(0, new ApiError(500))).toBe(true);
  });

  it('tries once more after a server error or a lost connection', () => {
    expect(shouldRetry(0, new ApiError(503))).toBe(true);
    expect(shouldRetry(0, new NetworkError())).toBe(true);
    expect(shouldRetry(1, new NetworkError())).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('uses the retry rule for every query', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});
