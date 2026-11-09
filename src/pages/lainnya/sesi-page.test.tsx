import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const hoursAgo = (count: number) => new Date(Date.now() - count * 3_600_000).toISOString();
const daysAgo = (count: number) => hoursAgo(count * 24);

const current = {
  id: '0b1f7a3e-6d2c-4f58-9a41-5c3e8d7b2a10',
  label: 'Chrome on Windows',
  createdAt: daysAgo(3),
  lastUsedAt: hoursAgo(0),
  current: true,
};
const phone = {
  id: '7c2d9e41-3a85-4b6f-8e12-9d4a6b1c5f33',
  label: 'Safari on iPhone',
  createdAt: daysAgo(20),
  lastUsedAt: hoursAgo(3),
  current: false,
};
const unreadable = {
  id: '5e8a1c02-9b47-4d36-a1f0-2c7d3e9b4a68',
  label: 'Unknown device',
  createdAt: daysAgo(40),
  lastUsedAt: daysAgo(2),
  current: false,
};

const deletePath = (id: string) => `DELETE /v1/auth/sessions/${id}`;

// The row of a device. The shell of the app has lists of its own, so the rows are found by the name that they hold.
async function rowOf(name: string) {
  const row = (await screen.findByText(name)).closest('li');

  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

function list(...items: unknown[]) {
  return { body: { items } };
}

function calls(fetchMock: ReturnType<typeof stubApi>, method: string, path: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => (init?.method ?? 'GET') === method && new URL(url).pathname === path,
  );
}

describe('Perangkat yang masuk ke akun', () => {
  it('is reached from the menu and goes back to it', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current) });
    const router = renderAt('/lainnya');

    await userEvent.click(
      await screen.findByRole('link', { name: /Perangkat yang masuk ke akun/ }),
    );

    expect(router.state.location.pathname).toBe('/lainnya/sesi');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Perangkat yang masuk ke akun' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/lainnya');
  });

  it('shows this device first with a tag, the sign in date and the way to sign out', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current, phone) });
    renderAt('/lainnya/sesi');

    const row = await rowOf('Chrome on Windows');

    expect(row).toHaveTextContent('Perangkat ini');
    expect(row).toHaveTextContent(/Masuk \d{1,2} \w{3} 20\d\d/);
    // The time of the last use of this session can be 10 minutes old, so it is not shown
    expect(row).not.toHaveTextContent('Terakhir dipakai');
    expect(
      screen.queryByRole('button', { name: /Keluarkan Chrome on Windows/ }),
    ).not.toBeInTheDocument();
    // This device comes first, before the other one
    expect(
      screen
        .getByText('Chrome on Windows')
        .compareDocumentPosition(screen.getByText('Safari on iPhone')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Keluar' })).toHaveAttribute(
      'href',
      '/lainnya/keluar',
    );
  });

  it('shows the other devices with the last use and a button that names the device and the time', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current, phone) });
    renderAt('/lainnya/sesi');

    const row = await rowOf('Safari on iPhone');

    expect(row).toHaveTextContent('Terakhir dipakai 3 jam lalu.');
    expect(
      screen.getByRole('button', {
        name: 'Keluarkan Safari on iPhone, terakhir dipakai 3 jam lalu',
      }),
    ).toBeVisible();
  });

  it('does not make a stranger of a device that the service could not read', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current, unreadable) });
    renderAt('/lainnya/sesi');

    expect(await screen.findByText('Jenis perangkat tidak terbaca')).toBeVisible();
    expect(screen.queryByText('Unknown device')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Keluarkan Jenis perangkat tidak terbaca, terakhir dipakai 2 hari lalu',
      }),
    ).toBeVisible();
  });

  it('says that no other device is signed in', async () => {
    stubApi({ 'GET /v1/auth/sessions': list(current) });
    renderAt('/lainnya/sesi');

    expect(
      await screen.findByText('Tidak ada perangkat lain yang masuk ke akun ini.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /Keluarkan/ })).not.toBeInTheDocument();
  });

  it('keeps the row and locks every button while the call runs, then removes the row and names the device', async () => {
    let reads = 0;
    let finish: (() => void) | undefined;
    const fetchMock = stubApi({
      'GET /v1/auth/sessions': () =>
        ++reads === 1 ? list(current, phone, unreadable) : list(current, unreadable),
      [deletePath(phone.id)]: { status: 204 },
    });
    // The call to end the session answers when the test says so
    const answer = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? new Promise<Response>((resolve) => {
            finish = () => {
              resolve(new Response(null, { status: 204 }));
            };
          })
        : (answer?.(input, init) ?? Promise.reject(new TypeError('no answer'))),
    );
    renderAt('/lainnya/sesi');

    await userEvent.click(
      await screen.findByRole('button', { name: /Keluarkan Safari on iPhone/ }),
    );

    // The row has not left, because the service has not answered
    expect(
      await screen.findByRole('button', { name: /Keluarkan Safari on iPhone/ }),
    ).toHaveTextContent('Sedang mengeluarkan');
    expect(screen.getByText('Safari on iPhone')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Keluarkan Jenis perangkat tidak terbaca/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    // A press on a locked button sends nothing
    await userEvent.click(
      screen.getByRole('button', { name: /Keluarkan Jenis perangkat tidak terbaca/ }),
    );
    expect(calls(fetchMock, 'DELETE', `/v1/auth/sessions/${unreadable.id}`)).toHaveLength(0);

    finish?.();

    expect(await screen.findByText('Perangkat dikeluarkan')).toBeVisible();
    expect(screen.getByText('Safari on iPhone sudah keluar dari akun ini.')).toBeVisible();
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Keluarkan Safari on iPhone/ }),
      ).not.toBeInTheDocument();
    });
    expect(reads).toBe(2);
    // The focus moved to the news, because the button that was pressed is gone
    expect(screen.getByText('Perangkat dikeluarkan').closest('[tabindex="-1"]')).toHaveFocus();
  });

  it('says that the device is already gone on a 404 and reads the list again', async () => {
    let reads = 0;
    stubApi({
      'GET /v1/auth/sessions': () => (++reads === 1 ? list(current, phone) : list(current)),
      [deletePath(phone.id)]: { status: 404, body: { code: 'not_found', message: 'No' } },
    });
    renderAt('/lainnya/sesi');

    await userEvent.click(
      await screen.findByRole('button', { name: /Keluarkan Safari on iPhone/ }),
    );

    expect(await screen.findByText('Perangkat itu sudah keluar')).toBeVisible();
    expect(screen.queryByText('Perangkat belum dikeluarkan')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Keluarkan/ })).not.toBeInTheDocument();
    });
    expect(reads).toBe(2);
  });

  it('does not say that nothing happened when the service was busy, and reads the list again', async () => {
    let reads = 0;
    stubApi({
      'GET /v1/auth/sessions': () => (++reads === 1 ? list(current, phone) : list(current)),
      [deletePath(phone.id)]: {
        status: 503,
        body: { code: 'busy', message: 'No', retryAfterSeconds: 2 },
      },
    });
    renderAt('/lainnya/sesi');

    await userEvent.click(
      await screen.findByRole('button', { name: /Keluarkan Safari on iPhone/ }),
    );

    expect(await screen.findByText('Belum pasti dikeluarkan')).toBeVisible();
    expect(screen.getByText(/Perangkat itu mungkin sudah dikeluarkan/)).toBeVisible();
    expect(screen.queryByText('Perangkat belum dikeluarkan')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(reads).toBe(2);
    });
  });

  it('says that the device was not ended when the call fails, and keeps the row', async () => {
    stubApi({
      'GET /v1/auth/sessions': list(current, phone),
      [deletePath(phone.id)]: { status: 500 },
    });
    renderAt('/lainnya/sesi');

    await userEvent.click(
      await screen.findByRole('button', { name: /Keluarkan Safari on iPhone/ }),
    );

    expect(await screen.findByText('Perangkat belum dikeluarkan')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('periksa koneksi internet');
    expect(screen.getByRole('button', { name: /Keluarkan Safari on iPhone/ })).toBeVisible();
  });

  it('says that the list is loading, and that it could not be loaded, and tries again on request', async () => {
    let reads = 0;
    stubApi({
      'GET /v1/auth/sessions': () => (++reads === 1 ? { status: 500 } : list(current)),
    });
    renderAt('/lainnya/sesi');

    expect(await screen.findByText('Daftar perangkat tidak bisa dimuat')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('Chrome on Windows')).toBeVisible();
  });

  it('says that the system is busy when the list cannot be read in time', async () => {
    stubApi({
      'GET /v1/auth/sessions': {
        status: 503,
        body: { code: 'busy', message: 'No', retryAfterSeconds: 2 },
      },
    });
    renderAt('/lainnya/sesi');

    expect(await screen.findByText('Daftar perangkat tidak bisa dimuat')).toBeVisible();
    expect(screen.getByText('Sistem sedang sibuk. Coba lagi dalam beberapa detik.')).toBeVisible();
    expect(screen.queryByText(/periksa koneksi internet/)).not.toBeInTheDocument();
  });
});
