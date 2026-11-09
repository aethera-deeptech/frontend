import { describe, expect, it } from 'vitest';

import { deleteFailure } from '@/api/auth';
import { ApiError, ContractError, NetworkError } from '@/api/client';

describe('deleteFailure', () => {
  it.each([
    ['a wrong password', new ApiError(403, { code: 'invalid_credentials' }), 'wrong-password'],
    ['a 403 with another code', new ApiError(403, { code: 'csrf_header_missing' }), 'refused'],
    ['a 403 with no code', new ApiError(403), 'refused'],
    ['a 400', new ApiError(400, { code: 'invalid_json' }), 'refused'],
    ['a 404', new ApiError(404), 'refused'],
    ['a 422', new ApiError(422, { fields: { password: 'required' } }), 'refused'],
    ['a 429', new ApiError(429, { retryAfterSeconds: 30 }), 'rate-limited'],
    ['a 401', new ApiError(401), 'no-session'],
    ['a busy answer', new ApiError(503, { code: 'busy' }), 'busy'],
    ['a 503 without the busy code', new ApiError(503), 'server'],
    ['a 500', new ApiError(500), 'server'],
    ['a 502', new ApiError(502), 'server'],
    ['a 504', new ApiError(504), 'server'],
    ['a 408', new ApiError(408), 'server'],
    ['a 425', new ApiError(425), 'server'],
    ['a lost connection', new NetworkError(), 'offline'],
    ['an answer of the wrong shape', new ContractError(), 'server'],
    ['something that is not an error', 'oops', 'server'],
  ])('reads %s as %s', (_label, error, expected) => {
    expect(deleteFailure(error)).toBe(expected);
  });
});
