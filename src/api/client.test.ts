import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, apiDownload, apiRequest, ContractError, NetworkError } from '@/api/client';

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

  it('lets an abort pass that comes from another realm, which is known by its name', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toBe(abort);
  });

  it('passes the signal of the caller to fetch', async () => {
    const fetchMock = answer('{"name":"Maju"}');
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await apiRequest('/v1/usaha', schema, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('treats a body that is cut off like a lost connection', async () => {
    const broken = new Response('{"name":"Maju"}');
    vi.spyOn(broken, 'text').mockRejectedValue(new TypeError('network error'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(broken));

    await expect(apiRequest('/v1/usaha', schema)).rejects.toBeInstanceOf(NetworkError);
  });

  it('refuses a path that does not start with one slash', async () => {
    vi.stubGlobal('fetch', answer('{}'));

    await expect(apiRequest('v1/usaha', schema)).rejects.toThrow('must start with one slash');
    await expect(apiRequest('//evil.example/x', schema)).rejects.toThrow(
      'must start with one slash',
    );
    await expect(apiRequest('@evil.example/x', schema)).rejects.toThrow(
      'must start with one slash',
    );
  });

  it('reports a body that cannot be written as a bug and not as a lost connection', async () => {
    vi.stubGlobal('fetch', answer('{}'));
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const failure = await apiRequest('/v1/usaha', schema, { method: 'PUT', body: circular }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(TypeError);
    expect(failure).not.toBeInstanceOf(NetworkError);
  });
});

describe('apiDownload', () => {
  it('asks for a PDF with the cookie and returns the file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const blob = await apiDownload('/v1/reports/2026-10/pdf');

    expect(await blob.text()).toBe('%PDF-1.7');
    expect(blob.type).toBe('application/pdf');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/reports/2026-10/pdf',
      expect.objectContaining({ credentials: 'include', headers: { Accept: 'application/pdf' } }),
    );
  });

  it('refuses an empty answer and an answer that is not a PDF', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('', { headers: { 'Content-Type': 'application/pdf' } })),
    );
    await expect(apiDownload('/v1/reports/2026-10/pdf')).rejects.toBeInstanceOf(ContractError);

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }),
        ),
    );
    await expect(apiDownload('/v1/reports/2026-10/pdf')).rejects.toBeInstanceOf(ContractError);
  });

  it('refuses a page that has no type or a PDF type but is not a PDF', async () => {
    const page = {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['<html></html>'])),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(page));
    await expect(apiDownload('/v1/reports/2026-10/pdf')).rejects.toBeInstanceOf(ContractError);

    const labeled = {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['<html></html>'], { type: 'application/pdf' })),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(labeled));
    await expect(apiDownload('/v1/reports/2026-10/pdf')).rejects.toBeInstanceOf(ContractError);
  });

  it('gives the file the PDF type when the server sent none', async () => {
    // A response without a content type, which a test Response cannot build from a Blob of another realm
    const untyped = { ok: true, status: 200, blob: () => Promise.resolve(new Blob(['%PDF-1.7'])) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(untyped));

    const blob = await apiDownload('/v1/reports/2026-10/pdf');

    expect(blob.type).toBe('application/pdf');
  });

  it('fails like apiRequest does', async () => {
    vi.stubGlobal('fetch', answer('', 404));
    await expect(apiDownload('/v1/reports/2020-01/pdf')).rejects.toBeInstanceOf(ApiError);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(apiDownload('/v1/reports/2026-10/pdf')).rejects.toBeInstanceOf(NetworkError);
  });
});
