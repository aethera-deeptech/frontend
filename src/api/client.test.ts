import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, apiRequest, ContractError, NetworkError } from '@/api/client';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

const schema = z.object({ name: z.string() });

function answer(body: string, status = 200) {
  // A response with the status 204 must not have a body
  return vi.fn().mockResolvedValue(new Response(body === '' ? null : body, { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends the cookie and reads the answer through the schema', async () => {
    const fetchMock = answer('{"name":"Maju"}');
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/v1/usaha', schema)).resolves.toEqual({ name: 'Maju' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/usaha',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('sends a body as JSON', async () => {
    const fetchMock = answer('{"name":"Maju"}');
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/v1/usaha', schema, { method: 'PUT', body: { name: 'Maju' } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/usaha',
      expect.objectContaining({
        method: 'PUT',
        body: '{"name":"Maju"}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }) as unknown,
      }),
    );
  });

  it('reads an empty answer as null', async () => {
    vi.stubGlobal('fetch', answer('', 204));

    await expect(apiRequest('/v1/keluar', z.null(), { method: 'POST' })).resolves.toBeNull();
  });

  it('fails with the status when the server says no', async () => {
    vi.stubGlobal('fetch', answer('{}', 503));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
    });
    await expect(apiRequest('/v1/usaha', schema)).rejects.toBeInstanceOf(ApiError);
  });

  it('fails when the answer does not match the schema', async () => {
    vi.stubGlobal('fetch', answer('{"name":5}'));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toBeInstanceOf(ContractError);
  });

  it('fails when the answer is not JSON', async () => {
    vi.stubGlobal('fetch', answer('<html>Bad gateway</html>'));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toBeInstanceOf(ContractError);
  });

  it('fails when there is no connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toBeInstanceOf(NetworkError);
  });

  it('lets an aborted request pass as it is', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toBe(abort);
  });
});
