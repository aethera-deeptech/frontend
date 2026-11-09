import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const current = {
  id: '0b1f7a3e-6d2c-4f58-9a41-5c3e8d7b2a10',
  label: 'Chrome on Windows',
  createdAt: '2026-11-01T08:00:00+07:00',
  lastUsedAt: '2026-11-09T14:20:00+07:00',
  current: true,
};
const phone = {
  id: '7c2d9e41-3a85-4b6f-8e12-9d4a6b1c5f33',
  label: 'Safari on iPhone',
  createdAt: '2026-10-12T19:30:00+07:00',
  lastUsedAt: '2026-11-08T07:05:00+07:00',
  current: false,
};
const tablet = {
  id: '5e8a1c02-9b47-4d36-a1f0-2c7d3e9b4a68',
  label: 'Chrome on Android',
  createdAt: '2026-10-30T10:00:00+07:00',
  lastUsedAt: '2026-11-09T09:00:00+07:00',
  current: false,
};

const revokePath = 'POST /v1/auth/sessions/revoke-others';

function list(...items: unknown[]) {
  return { body: { items } };
}

function posts(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      init?.method === 'POST' && new URL(url).pathname === '/v1/auth/sessions/revoke-others',
  );
}

// The call answers when the test says so
function holdRevoke(fetchMock: ReturnType<typeof stubApi>) {
  const state: { finish?: (body: unknown) => void } = {};
  const answer = fetchMock.getMockImplementation();

  fetchMock.mockImplementation((input: string, init?: RequestInit) =>
    init?.method === 'POST' && new URL(input).pathname === '/v1/auth/sessions/revoke-others'
      ? new Promise<Response>((resolve) => {
          state.finish = (body) => {
            resolve(new Response(JSON.stringify(body), { status: 200 }));
          };
        })
      : (answer?.(input, init) ?? Promise.reject(new TypeError('no answer'))),
  );
  return state;
}

describe('the question before every other device is signed out', () => {
  it('asks, says what stays and offers Batal back to the list', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current, phone, tablet) });
    renderAt('/lainnya/sesi/keluarkan-semua');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Keluarkan semua perangkat lain?' }),
    ).toBeVisible();
    expect(
      screen.getByText('Perangkat lain harus masuk lagi. Perangkat ini tetap masuk.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ya, keluarkan semuanya' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/lainnya/sesi');
  });

  it('sends the call without a body, goes back to the list and says how many devices left', async () => {
    const fetchMock = stubApi({
      'GET /v1/auth/sessions': list(current),
      [revokePath]: { body: { ended: 2 } },
    });
    const router = renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/sesi');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findByText('Perangkat lain dikeluarkan')).toBeVisible();
    expect(screen.getByText('2 perangkat sudah keluar dari akun ini.')).toBeVisible();
    expect(posts(fetchMock)).toHaveLength(1);
    expect(posts(fetchMock)[0]?.[1]?.body).toBeUndefined();
  });

  it('says that there was nothing to end when the service ended nothing', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current), [revokePath]: { body: { ended: 0 } } });
    renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('Tidak ada perangkat lain')).toBeVisible();
    expect(screen.getByText('Tidak ada yang perlu dikeluarkan.')).toBeVisible();
    expect(screen.queryByText('Perangkat lain dikeluarkan')).not.toBeInTheDocument();
  });

  it('shows the list with only this device at once, without the rows that are gone', async () => {
    const fetchMock = stubApi({
      'GET /v1/auth/sessions': list(current, phone, tablet),
      [revokePath]: { body: { ended: 2 } },
    });
    // The read of the list after the call does not end, so the rows come from what the screen already knows
    let reads = 0;
    const answer = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' &&
      new URL(input).pathname === '/v1/auth/sessions' &&
      ++reads > 1
        ? new Promise<Response>(() => undefined)
        : (answer?.(input, init) ?? Promise.reject(new TypeError('no answer'))),
    );
    renderAt('/lainnya/sesi');

    await userEvent.click(
      await screen.findByRole('link', { name: 'Keluarkan semua perangkat lain' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('2 perangkat sudah keluar dari akun ini.')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Keluarkan Safari on iPhone/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Chrome on Android')).not.toBeInTheDocument();
    expect(screen.getByText('Chrome on Windows')).toBeVisible();
  });

  it('sends one call for two quick presses, and Batal does nothing while it runs', async () => {
    const fetchMock = stubApi({ 'GET /v1/auth/sessions': list(current, phone, tablet) });
    const held = holdRevoke(fetchMock);
    const router = renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.dblClick(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByRole('button', { name: 'Sedang mengeluarkan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Batal' }));
    expect(router.state.location.pathname).toBe('/lainnya/sesi/keluarkan-semua');
    expect(posts(fetchMock)).toHaveLength(1);

    held.finish?.({ ended: 2 });

    expect(await screen.findByText('2 perangkat sudah keluar dari akun ini.')).toBeVisible();
  });

  it('says that nothing changed when the service refuses the call, and offers the list and a new try', async () => {
    stubApi({
      'GET /v1/auth/sessions': list(current, phone),
      [revokePath]: { status: 403, body: { code: 'origin_not_allowed', message: 'No' } },
    });
    renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('Perangkat lain belum dikeluarkan')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lihat daftar perangkat' })).toHaveAttribute(
      'href',
      '/lainnya/sesi',
    );
  });

  it('does not say that nothing changed on a 500, because a server error can hide a call that went through', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current, phone), [revokePath]: { status: 500 } });
    renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('Belum pasti dikeluarkan')).toBeVisible();
    expect(screen.queryByText('Perangkat lain belum dikeluarkan')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat daftar perangkat' })).toBeVisible();
  });

  it('does not say that nothing changed when the answer has the wrong shape', async () => {
    stubApi({
      'GET /v1/auth/sessions': list(current, phone),
      [revokePath]: { body: { ended: 'many' } },
    });
    const router = renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('Belum pasti dikeluarkan')).toBeVisible();
    expect(router.state.location.pathname).toBe('/lainnya/sesi/keluarkan-semua');
  });

  it('sends one call for two presses in the same moment', async () => {
    const fetchMock = stubApi({ 'GET /v1/auth/sessions': list(current, phone, tablet) });
    holdRevoke(fetchMock);
    renderAt('/lainnya/sesi/keluarkan-semua');

    const button = await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' });
    // Both presses come before the screen has heard that the first call runs
    fireEvent.click(button);
    fireEvent.click(button);

    await screen.findByRole('button', { name: 'Sedang mengeluarkan' });
    expect(posts(fetchMock)).toHaveLength(1);
  });

  it('does not move a user who left while the call ran', async () => {
    const fetchMock = stubApi({ 'GET /v1/auth/sessions': list(current, phone, tablet) });
    const held = holdRevoke(fetchMock);
    const router = renderAt('/lainnya');

    await userEvent.click(
      await screen.findByRole('link', { name: /Perangkat yang masuk ke akun/ }),
    );
    await userEvent.click(
      await screen.findByRole('link', { name: 'Keluarkan semua perangkat lain' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));
    await screen.findByRole('button', { name: 'Sedang mengeluarkan' });

    // The user goes back to the menu while the service has not answered
    await act(() => router.navigate('/lainnya'));
    held.finish?.({ ended: 2 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(router.state.location.pathname).toBe('/lainnya');
  });

  it('does not say that nothing changed when the answer is lost, because the call may have gone through', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current, phone) });
    renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('Belum pasti dikeluarkan')).toBeVisible();
    expect(screen.getByText(/Perangkat lain mungkin sudah dikeluarkan/)).toBeVisible();
    expect(screen.queryByText('Perangkat lain belum dikeluarkan')).not.toBeInTheDocument();
  });

  it('does not say that nothing changed when the service was busy, and reads the list again', async () => {
    let reads = 0;
    stubApi({
      'GET /v1/auth/sessions': () => (++reads === 1 ? list(current, phone) : list(current)),
      [revokePath]: { status: 503, body: { code: 'busy', message: 'No', retryAfterSeconds: 2 } },
    });
    renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    expect(await screen.findByText('Belum pasti dikeluarkan')).toBeVisible();
    expect(
      screen.getByText(/Sistem sedang sibuk\. Perangkat lain mungkin sudah dikeluarkan/),
    ).toBeVisible();
    expect(screen.queryByText('Perangkat lain belum dikeluarkan')).not.toBeInTheDocument();
  });

  it('sends the user to Masuk when the session ended while the question was open', async () => {
    stubApi({
      'GET /v1/auth/sessions': list(current, phone),
      [revokePath]: { status: 401, body: { code: 'unauthorized', message: 'No' } },
      'GET /v1/auth/me': { status: 401, body: { code: 'unauthorized', message: 'No' } },
    });
    const router = renderAt('/lainnya/sesi/keluarkan-semua');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, keluarkan semuanya' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
  });
});
