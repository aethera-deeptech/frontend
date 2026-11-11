import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { gatewaysKey } from '@/api/gateways';
import { returnPath } from '@/pages/auth/return-path';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const minutesAgo = (count: number) => new Date(Date.now() - count * 60_000).toISOString();

const working = { id: 'g1', name: 'Hub pabrik', lastSeenAt: minutesAgo(3), keyRevoked: false };
const other = { id: 'g2', name: 'Hub gudang', lastSeenAt: minutesAgo(180), keyRevoked: false };
const cut = { id: 'g3', name: 'Hub lama', lastSeenAt: minutesAgo(60 * 24 * 5), keyRevoked: true };

const del = 'DELETE /v1/gateways/g1';
const wrongPasswordText =
  'Kata sandi salah. Periksa lalu coba lagi. Sampai 5 kata sandi salah per jam. Hitungan ini dipakai bersama untuk penghapusan akun dan penghapusan WATTLINK Hub.';

function list(...items: unknown[]) {
  return { 'GET /v1/gateways': { body: { items } } };
}

function deletes(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => new URL(url).pathname.startsWith('/v1/gateways/') && init?.method === 'DELETE',
  );
}

async function typePassword(value = 'rahasia123') {
  await userEvent.type(screen.getByLabelText('Kata sandi Anda'), value);
}

async function press(name = 'Ya, hapus WATTLINK Hub') {
  await userEvent.click(screen.getByRole('button', { name }));
}

describe('Hapus WATTLINK Hub, the entry and the page', () => {
  it('has a text link on each row that names the hub, and opens the question', async () => {
    stubApi(list(working, other));
    const router = renderAt('/lainnya/hub');

    expect(await screen.findByRole('link', { name: 'Hapus Hub gudang' })).toBeVisible();
    await userEvent.click(screen.getByRole('link', { name: 'Hapus Hub pabrik' }));

    expect(router.state.location.pathname).toBe('/lainnya/hub/g1/hapus');
  });

  it('does not offer the link while the list failed', async () => {
    stubApi({ 'GET /v1/gateways': { status: 500, body: {} } });
    renderAt('/lainnya/hub');

    expect(await screen.findByText('Daftar WATTLINK Hub tidak bisa dimuat')).toBeVisible();
    expect(screen.queryByRole('link', { name: /^Hapus / })).not.toBeInTheDocument();
  });

  it('asks before anything is deleted, has no menu, and names the hub and its last data', async () => {
    stubApi(list(working, other));
    renderAt('/lainnya/hub/g1/hapus');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hapus WATTLINK Hub ini?' }),
    ).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument();
    expect(await screen.findByText('Hub pabrik')).toBeVisible();
    expect(screen.getByText(/^Data terakhir masuk/)).toBeVisible();
    expect(screen.queryByText(/satu-satunya WATTLINK Hub/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/lainnya/hub');
    expect(screen.getByRole('link', { name: 'Unduh laporan dulu' })).toHaveAttribute(
      'href',
      '/laporan',
    );
  });

  it('says what goes and what stays, without a promise about how the hub joins again', async () => {
    stubApi(list(working, other));
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    expect(screen.getByText('Semua alat yang tersambung lewat hub ini.')).toBeVisible();
    expect(screen.getByText(/penghematan yang sudah terbukti/)).toBeVisible();
    expect(screen.getByText(/bulan-bulan lalu ikut mengecil untuk seluruh usaha/)).toBeVisible();
    expect(screen.getByText(/dipasang lagi sebagai alat baru tanpa riwayat/)).toBeVisible();
    expect(screen.queryByText(/Tambah alat|menghubungkan hub lagi/)).not.toBeInTheDocument();
    expect(screen.getByText(/ruangan Anda tetap ada/)).toBeVisible();
    expect(screen.getByText(/Salinan di cadangan dan catatan sistem/)).toBeVisible();
    expect(screen.queryByText(/BOOT|tombol/i)).not.toBeInTheDocument();
  });

  it('warns that the only hub leaves the business without data', async () => {
    stubApi(list(working));
    renderAt('/lainnya/hub/g1/hapus');

    expect(
      await screen.findByText(/Ini satu-satunya WATTLINK Hub Anda\. Data baru tidak masuk lagi\./),
    ).toBeVisible();
  });

  it('says that a hub that is not in the list is not found, and has no password field', async () => {
    stubApi(list(working));
    renderAt('/lainnya/hub/zzz/hapus');

    expect(
      await screen.findByRole('heading', { name: 'WATTLINK Hub tidak ditemukan' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Kata sandi Anda')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke daftar hub' })).toHaveAttribute(
      'href',
      '/lainnya/hub',
    );
  });

  it('shows the limit that the account page shows, and asks for the password first', async () => {
    const fetchMock = stubApi(list(working, other));
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    expect(
      screen.getByText(
        'Kata sandi akun ini. Sampai 5 kata sandi salah per jam. Hitungan ini dipakai bersama untuk penghapusan akun dan penghapusan WATTLINK Hub.',
      ),
    ).toBeVisible();
    await press();

    expect(await screen.findByText('Isi kata sandi Anda.')).toBeVisible();
    expect(deletes(fetchMock)).toHaveLength(0);
  });

  it('keeps the address of the question out of the way back after a sign in', () => {
    expect(returnPath({ from: '/lainnya/hub/g1/hapus' })).toBe('/');
    expect(returnPath({ from: '/lainnya/hub/g1/hapus?x=1' })).toBe('/');
    expect(returnPath({ from: '/lainnya/hub' })).toBe('/lainnya/hub');
  });
});

describe('Hapus WATTLINK Hub, a clear yes', () => {
  it('deletes with the password, drops what depended on the hub and opens the list with the news', async () => {
    let deleted = false;
    const fetchMock = stubApi({
      ...list(working, other),
      [del]: () => {
        deleted = true;
        return { status: 204 };
      },
    });
    const inner = global.fetch;

    // The read of the list that follows the delete never ends, so the list on screen is what the page left in the cache
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) =>
      deleted && new URL(input).pathname === '/v1/gateways'
        ? new Promise<Response>(() => undefined)
        : inner(input, init),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['beranda'], { id: 'b' });
    client.setQueryData(['report', 'current'], { id: 'r' });
    client.setQueryData(['recommendations'], { items: [] });
    client.setQueryData(['devices', 'd1'], { id: 'd1' });
    client.setQueryData(['pairing', 'p1'], { id: 'p1' });
    client.setQueryData(['rooms'], { items: [{ id: 'r1', name: 'Gudang' }] });
    const router = renderAt('/lainnya/hub/g1/hapus', undefined, { client });

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/hub');
    });
    expect(await screen.findByText('WATTLINK Hub dihapus')).toBeVisible();
    expect(screen.getByText('Hub pabrik dan alat di belakangnya sudah dihapus.')).toBeVisible();
    expect(screen.queryByText('Hub pabrik', { selector: 'p.text-h2' })).not.toBeInTheDocument();
    expect(screen.getByText('Hub gudang')).toBeVisible();
    // What depended on the hub is gone, the sums that were made from it are marked old, and the rooms stay
    expect(client.getQueryState(['beranda'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['report', 'current'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['recommendations'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['rooms'])?.isInvalidated).toBe(false);
    expect(client.getQueryData(['devices', 'd1'])).toBeUndefined();
    expect(client.getQueryData(['pairing', 'p1'])).toBeUndefined();
    expect(client.getQueryData(['rooms'])).toBeDefined();
    expect(client.getQueryData(gatewaysKey)).toEqual({ items: [other] });
    const [call] = deletes(fetchMock);

    expect(new URL(call?.[0] ?? '').pathname).toBe('/v1/gateways/g1');
    expect(call?.[1]).toMatchObject({
      method: 'DELETE',
      headers: expect.objectContaining({ 'X-Requested-With': 'aethera' }) as unknown,
    });
    const body = call?.[1]?.body;

    expect(typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined).toEqual({
      password: 'rahasia123',
    });
    // The news leaves the history, so a reload does not show it again
    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
  });

  it('keeps the user on the page while the call runs', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubApi({ ...list(working, other), [del]: { status: 204 } });
    const inner = global.fetch;

    vi.stubGlobal('fetch', (input: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? gate.then(() => inner(input, init)) : inner(input, init),
    );
    const router = renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();
    await userEvent.click(screen.getByRole('link', { name: 'Batal' }));

    expect(router.state.location.pathname).toBe('/lainnya/hub/g1/hapus');
    release?.();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/hub');
    });
  });

  it('sends one call for two quick presses and says that it runs', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = stubApi({ ...list(working, other), [del]: { status: 204 } });
    const inner = global.fetch;

    // The answer of the delete waits until the test lets it go, so the second press meets a call that runs
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? gate.then(() => inner(input, init)) : inner(input, init),
    );
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();
    await press('Sedang menghapus');

    expect((await screen.findAllByText('Sedang menghapus. Jangan tutup halaman.')).length).toBe(2);
    // The way back does nothing while the call runs
    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('aria-disabled', 'true');
    release?.();
    await waitFor(() => {
      expect(deletes(fetchMock)).toHaveLength(1);
    });
  });
});

describe('Hapus WATTLINK Hub, a clear no', () => {
  it('says that the password is wrong, clears and focuses the field, and stays', async () => {
    stubApi({
      ...list(working, other),
      [del]: { status: 403, body: { code: 'invalid_credentials' } },
    });
    const router = renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword('salah');
    await press();

    expect(await screen.findByText(wrongPasswordText)).toBeVisible();
    const field = screen.getByLabelText('Kata sandi Anda');

    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
    expect(router.state.location.pathname).toBe('/lainnya/hub/g1/hapus');
    await typePassword('x');
    expect(screen.queryByText(wrongPasswordText)).not.toBeInTheDocument();
  });

  it.each([
    ['a 403 with another code', { status: 403, body: { code: 'csrf_header_missing' } }],
    ['a 422', { status: 422, body: { code: 'validation_failed' } }],
    ['a 400', { status: 400, body: { code: 'invalid_json' } }],
  ])(
    'says that the hub is not deleted and not that the password is wrong for %s',
    async (_label, answer) => {
      stubApi({ ...list(working, other), [del]: answer });
      renderAt('/lainnya/hub/g1/hapus');

      await screen.findByLabelText('Kata sandi Anda');
      await typePassword();
      await press();

      expect(await screen.findByText('WATTLINK Hub belum dihapus')).toBeVisible();
      expect(screen.queryByText(/Kata sandi salah/)).not.toBeInTheDocument();
      expect(screen.queryByText('Belum pasti dihapus')).not.toBeInTheDocument();
    },
  );

  it('holds the button after a 429 and says the wait', async () => {
    const fetchMock = stubApi({
      ...list(working, other),
      [del]: { status: 429, body: { code: 'rate_limited', retryAfterSeconds: 90 } },
    });
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    expect(await screen.findByText('Terlalu banyak percobaan')).toBeVisible();
    expect(screen.getByText('Coba lagi dalam 90 detik.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ya, hapus WATTLINK Hub' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await press();

    expect(deletes(fetchMock)).toHaveLength(1);
  });

  it('opens the list with a note when the hub is already gone, and no open answer came before', async () => {
    stubApi({
      ...list(working, other),
      [del]: { status: 404, body: { code: 'not_found' } },
    });
    const router = renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/hub');
    });
    expect(await screen.findByText('WATTLINK Hub sudah tidak ada')).toBeVisible();
    expect(screen.queryByText('WATTLINK Hub dihapus')).not.toBeInTheDocument();
  });

  it('does not call a 404 without the code of the API a hub that is gone', async () => {
    stubApi({ ...list(working, other), [del]: { status: 404, body: {} } });
    const router = renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    expect(await screen.findByText('WATTLINK Hub belum dihapus')).toBeVisible();
    expect(router.state.location.pathname).toBe('/lainnya/hub/g1/hapus');
  });

  it('sends the user to Masuk when the session ended', async () => {
    stubApi({
      ...list(working, other),
      [del]: { status: 401, body: { code: 'unauthorized', message: 'No' } },
      'GET /v1/auth/me': { status: 401, body: { code: 'unauthorized', message: 'No' } },
    });
    const router = renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
  });
});

describe('Hapus WATTLINK Hub, an open answer', () => {
  it.each([
    [
      'a busy answer',
      { status: 503, body: { code: 'busy', retryAfterSeconds: 2 } },
      'Sistem sedang sibuk.',
    ],
    ['a 500', { status: 500, body: {} }, 'Terjadi kesalahan di sistem.'],
    ['a 408 from a proxy', { status: 408, body: {} }, 'Terjadi kesalahan di sistem.'],
  ])('says that it is not sure after %s', async (_label, answer, cause) => {
    stubApi({ ...list(working, other), [del]: answer });
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    expect(await screen.findByText('Belum pasti dihapus')).toBeVisible();
    expect(screen.getByText(new RegExp(cause.replaceAll('.', '\\.')))).toBeVisible();
    expect(
      screen.getByText(/Jika kata sandinya benar, mengulang tidak memakai jatah percobaan\./),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Jika Anda keluar sekarang, sebagian data mungkin sudah terhapus. Ulangi sampai selesai.',
      ),
    ).toBeVisible();
    // The offer of a report ends, because it would be incomplete
    expect(screen.queryByRole('link', { name: 'Unduh laporan dulu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Batal' })).not.toBeInTheDocument();
  });

  it('counts a repeat that meets a 404 as the end of the deletion', async () => {
    let calls = 0;
    stubApi({
      ...list(working, other),
      [del]: () => {
        calls += 1;
        return calls === 1
          ? { status: 503, body: { code: 'busy', retryAfterSeconds: 1 } }
          : { status: 404, body: { code: 'not_found' } };
      },
    });
    const router = renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();
    expect(await screen.findByText('Belum pasti dihapus')).toBeVisible();
    // The password stays for the repeat
    expect(screen.getByLabelText('Kata sandi Anda')).toHaveValue('rahasia123');
    await press('Coba lagi');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/hub');
    });
    expect(await screen.findByText('WATTLINK Hub dihapus')).toBeVisible();
    expect(screen.queryByText('WATTLINK Hub sudah tidak ada')).not.toBeInTheDocument();
  });

  it('keeps the open state after a later wrong password', async () => {
    let calls = 0;
    stubApi({
      ...list(working, other),
      [del]: () => {
        calls += 1;
        return calls === 1
          ? { status: 500, body: {} }
          : { status: 403, body: { code: 'invalid_credentials' } };
      },
    });
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await userEvent.clear(screen.getByLabelText('Kata sandi Anda'));
    await typePassword('salah');
    await press('Coba lagi');

    expect(await screen.findByText(wrongPasswordText)).toBeVisible();
    expect(
      screen.getByText(/Jika Anda keluar sekarang, sebagian data mungkin sudah terhapus/),
    ).toBeVisible();
  });

  it('marks the row as unfinished when the user goes back, and offers to repeat instead of connecting again', async () => {
    stubApi({
      ...list(cut, other),
      'DELETE /v1/gateways/g3': { status: 500, body: {} },
    });
    const router = renderAt('/lainnya/hub/g3/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await userEvent.click(screen.getByRole('button', { name: 'Ya, hapus WATTLINK Hub' }));
    await screen.findByText('Belum pasti dihapus');
    await userEvent.click(screen.getByRole('link', { name: 'Kembali ke daftar hub' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/hub');
    });
    const row = (await screen.findByText('Hub lama')).closest('li');

    if (!row) {
      throw new Error('The row is missing');
    }
    expect(within(row).getByText(/Penghapusan belum selesai/)).toBeVisible();
    expect(within(row).queryByRole('link', { name: /Hubungkan lagi/ })).not.toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Ulangi hapus Hub lama' })).toHaveAttribute(
      'href',
      '/lainnya/hub/g3/hapus',
    );
    // The other hub is not marked
    const otherRow = screen.getByText('Hub gudang').closest('li');

    expect(otherRow).not.toHaveTextContent('Penghapusan belum selesai');
    // The hint leaves the history, so a reload does not show it
    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
  });
});

describe('Hapus WATTLINK Hub, the edges of the page', () => {
  it('says that the list failed when it cannot name the hub, and offers a new try', async () => {
    stubApi({ 'GET /v1/gateways': { status: 500, body: {} } });
    renderAt('/lainnya/hub/g1/hapus');

    expect(await screen.findByText('Daftar WATTLINK Hub tidak bisa dimuat')).toBeVisible();
    expect(screen.queryByLabelText('Kata sandi Anda')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali ke daftar hub' })).toBeVisible();
  });

  it('waits 60 seconds when a 429 does not say how long', async () => {
    stubApi({ ...list(working, other), [del]: { status: 429, body: { code: 'rate_limited' } } });
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();

    expect(await screen.findByText('Coba lagi dalam 60 detik.')).toBeVisible();
  });

  it('adds the line about the wait when a 429 follows an open answer', async () => {
    let calls = 0;
    stubApi({
      ...list(working, other),
      [del]: () => {
        calls += 1;
        return calls === 1
          ? { status: 500, body: {} }
          : { status: 429, body: { code: 'rate_limited', retryAfterSeconds: 30 } };
      },
    });
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await press('Coba lagi');

    expect(await screen.findByText(/Penghapusan mungkin sebagian berjalan/)).toBeVisible();
    expect(screen.getByText('Coba lagi dalam 30 detik.')).toBeVisible();
  });

  it('does not say that nothing was deleted after a refusal that follows an open answer', async () => {
    let calls = 0;
    stubApi({
      ...list(working, other),
      [del]: () => {
        calls += 1;
        return calls === 1
          ? { status: 500, body: {} }
          : { status: 400, body: { code: 'invalid_json' } };
      },
    });
    renderAt('/lainnya/hub/g1/hapus');

    await screen.findByLabelText('Kata sandi Anda');
    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await press('Coba lagi');

    expect(await screen.findByText('Belum berhasil')).toBeVisible();
    expect(screen.queryByText('WATTLINK Hub belum dihapus')).not.toBeInTheDocument();
  });
});
