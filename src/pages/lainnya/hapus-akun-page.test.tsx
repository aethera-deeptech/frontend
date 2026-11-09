import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleSettings } from '@/pages/pengaturan/sample-settings';
import { renderAt, stubApi } from '@/test/stub-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

const del = 'DELETE /v1/account';
const wrongPasswordText =
  'Kata sandi salah. Periksa lalu coba lagi. Sampai 5 percobaan per jam, termasuk yang gagal.';

function deletes(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => new URL(url).pathname === '/v1/account' && init?.method === 'DELETE',
  );
}

async function typePassword(value = 'rahasia123') {
  await userEvent.type(screen.getByLabelText('Kata sandi Anda'), value);
}

async function press(name = 'Ya, hapus akun') {
  await userEvent.click(screen.getByRole('button', { name }));
}

describe('Hapus akun, the entry and the page', () => {
  it('has its own card in the menu, in the danger tone with words that say it cannot be undone', async () => {
    stubApi({});
    const router = renderAt('/lainnya');

    const link = await screen.findByRole('link', { name: /Hapus akun dan usaha/ });

    expect(link).toHaveTextContent('Hapus usaha dan semua datanya. Tidak bisa dibatalkan.');
    // The row is not in the card of Keluar, so a tap for Keluar cannot open it
    const card = link.closest('section');

    if (!card) {
      throw new Error('The row has no card');
    }
    expect(within(card).queryByRole('link', { name: /^Keluar/ })).toBeNull();
    await userEvent.click(link);

    expect(router.state.location.pathname).toBe('/lainnya/hapus-akun');
  });

  it('asks before anything is deleted, has no menu, and names the business and the account', async () => {
    stubApi({});
    renderAt('/lainnya/hapus-akun');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hapus akun dan semua data?' }),
    ).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument();
    expect(
      await screen.findByText('Usaha Konveksi Maju Jaya. Akun dewi@example.com.'),
    ).toBeVisible();
    expect(document.title).toBe('Hapus akun dan semua data? · WATTLINK');
    expect(
      screen.getByText('Sampai 5 percobaan per jam, termasuk yang gagal.', { exact: false }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/lainnya');
    expect(screen.getByRole('link', { name: 'Unduh laporan dulu' })).toHaveAttribute(
      'href',
      '/laporan',
    );
  });

  it('says what goes and what stays in plain words', () => {
    stubApi({});
    renderAt('/lainnya/hapus-akun');

    expect(screen.getByText(/Riwayat listrik, anomali, saran, dan catatan produksi/)).toBeVisible();
    expect(screen.getByText('WATTLINK Hub tidak bisa mengirim data lagi.')).toBeVisible();
    expect(
      screen.getByText(/WATTLINK Plug yang masih mendapat listrik tetap di keadaan saklarnya/),
    ).toBeVisible();
    expect(screen.getByText(/Salinan di cadangan dan catatan sistem, jika ada/)).toBeVisible();
  });

  it('asks for the password first and sends nothing without it', async () => {
    const fetchMock = stubApi({ [del]: { status: 204 } });
    renderAt('/lainnya/hapus-akun');

    await press();

    expect(await screen.findByText('Isi kata sandi Anda.')).toBeVisible();
    expect(screen.getByLabelText('Kata sandi Anda')).toHaveFocus();
    expect(deletes(fetchMock)).toHaveLength(0);
  });
});

describe('Hapus akun, a clear yes', () => {
  it('deletes with the password, empties the cache and opens Masuk with the news', async () => {
    const fetchMock = stubApi({ [del]: { status: 204 } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['beranda'], { businessName: 'Maju' });
    const router = renderAt('/lainnya/hapus-akun', undefined, { client });

    await typePassword();
    await press();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
    expect(await screen.findByText('Akun sudah dihapus')).toBeVisible();
    expect(screen.getByText('Akun dan data usaha Anda sudah dihapus.')).toBeVisible();
    await waitFor(() => {
      expect(client.getQueryData(['beranda'])).toBeUndefined();
    });
    const [call] = deletes(fetchMock);

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

  it('sends one call for two quick presses and says that it runs', async () => {
    let answer: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;

      if (path === '/v1/account' && init?.method === 'DELETE') {
        return new Promise<Response>((resolve) => {
          answer = resolve;
        });
      }
      if (path === '/v1/settings') {
        return Promise.resolve(new Response(JSON.stringify(sampleSettings())));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' }),
        ),
      );
    });

    vi.stubGlobal('fetch', fetchMock);
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await press('Sedang menghapus');

    // The visible line and the words for a screen reader both carry the sentence
    expect((await screen.findAllByText('Sedang menghapus. Jangan tutup halaman.')).length).toBe(2);
    expect(deletes(fetchMock as unknown as ReturnType<typeof stubApi>)).toHaveLength(1);
    answer(new Response(null, { status: 204 }));
  });

  it('keeps the user on the page while the call runs', async () => {
    let answer: (response: Response) => void = () => undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const path = new URL(input).pathname;

        if (path === '/v1/account' && init?.method === 'DELETE') {
          return new Promise<Response>((resolve) => {
            answer = resolve;
          });
        }
        return Promise.resolve(
          new Response(
            path === '/v1/settings'
              ? JSON.stringify(sampleSettings())
              : JSON.stringify({ email: 'a@b.id', emailVerified: true, businessName: 'Maju' }),
          ),
        );
      }),
    );
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await userEvent.click(screen.getByRole('link', { name: 'Batal' }));

    expect(router.state.location.pathname).toBe('/lainnya/hapus-akun');
    answer(new Response(null, { status: 204 }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
  });
});

describe('Hapus akun, a clear no', () => {
  it('says that the password is wrong, clears and focuses the field, and stays signed in', async () => {
    const fetchMock = stubApi({
      [del]: { status: 403, body: { code: 'invalid_credentials' } },
    });
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword('salah');
    await press();

    expect(await screen.findByText(wrongPasswordText)).toBeVisible();
    const field = screen.getByLabelText('Kata sandi Anda');

    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    // The 403 is not a sign out, so the page stays and the session is not asked again
    expect(router.state.location.pathname).toBe('/lainnya/hapus-akun');
    expect(
      fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === '/v1/auth/me'),
    ).toHaveLength(0);
    // The text goes away when the user types again
    await typePassword('x');
    expect(screen.queryByText(wrongPasswordText)).not.toBeInTheDocument();
  });

  it.each([
    ['a 403 with another code', { status: 403, body: { code: 'csrf_header_missing' } }],
    [
      'a 422',
      { status: 422, body: { code: 'validation_failed', fields: { password: 'required' } } },
    ],
    ['a 400', { status: 400, body: { code: 'invalid_json' } }],
  ])(
    'says that the account is not deleted and not that the password is wrong for %s',
    async (_label, answer) => {
      stubApi({ [del]: answer });
      renderAt('/lainnya/hapus-akun');

      await typePassword();
      await press();

      expect(await screen.findByText('Akun belum dihapus')).toBeVisible();
      expect(screen.queryByText(/Kata sandi salah/)).not.toBeInTheDocument();
      expect(screen.queryByText('Belum pasti dihapus')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Batal' })).toBeVisible();
    },
  );

  it('holds the button after a 429 and says the wait', async () => {
    const fetchMock = stubApi({
      [del]: { status: 429, body: { code: 'rate_limited', retryAfterSeconds: 90 } },
    });
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();

    expect(await screen.findByText('Terlalu banyak percobaan')).toBeVisible();
    expect(screen.getByText('Coba lagi dalam 90 detik.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ya, hapus akun' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await press();

    expect(deletes(fetchMock)).toHaveLength(1);
    // No earlier open answer, so no word about a deletion that may have run
    expect(screen.queryByText(/mungkin sebagian berjalan/)).not.toBeInTheDocument();
  });
});

describe('Hapus akun, an open answer', () => {
  it.each([
    [
      'a busy answer',
      { status: 503, body: { code: 'busy', retryAfterSeconds: 2 } },
      'Sistem sedang sibuk.',
    ],
    ['a 500', { status: 500, body: {} }, 'Terjadi kesalahan di sistem.'],
    [
      'a lost connection',
      undefined,
      'Tidak bisa terhubung ke sistem. Periksa koneksi internet Anda.',
    ],
  ])('says that it is not sure after %s', async (_label, answer, cause) => {
    stubApi(answer ? { [del]: answer } : {});
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();

    expect(await screen.findByText('Belum pasti dihapus')).toBeVisible();
    expect(screen.getByText(new RegExp(cause.replaceAll('.', '\\.')))).toBeVisible();
    expect(
      screen.getByText(/Penghapusan mungkin sudah berjalan sebagian atau selesai/),
    ).toBeVisible();
    // The text under the field and the banner both name the limit
    expect(screen.getAllByText(/Sampai 5 percobaan per jam, termasuk yang gagal\./)).toHaveLength(
      2,
    );
    expect(
      screen.getByText(
        'Jika Anda keluar sekarang, sebagian data mungkin sudah terhapus. Ulangi sampai selesai.',
      ),
    ).toBeVisible();
    // Batal would read as a cancel, so it says where it leads
    expect(screen.getByRole('link', { name: 'Kembali ke Lainnya' })).toHaveAttribute(
      'href',
      '/lainnya',
    );
    expect(screen.queryByRole('link', { name: 'Batal' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  });

  it('does not read the data again after a busy answer, and keeps the password for the repeat', async () => {
    let calls = 0;
    const fetchMock = stubApi({
      [del]: () => {
        calls += 1;
        return calls === 1 ? { status: 503, body: { code: 'busy' } } : { status: 204 };
      },
    });
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword();
    const readsBefore = fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? 'GET') === 'GET',
    ).length;

    await press();
    await screen.findByText('Belum pasti dihapus');

    // The rule that reads every query again after a busy write is skipped for this call
    expect(
      fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET'),
    ).toHaveLength(readsBefore);
    expect(screen.getByLabelText('Kata sandi Anda')).toHaveValue('rahasia123');

    await press('Coba lagi');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
    expect(await screen.findByText('Akun sudah dihapus')).toBeVisible();
    expect(deletes(fetchMock)).toHaveLength(2);
  });

  it('goes to Masuk with a hedged note when a repeat meets a 401 after an open answer', async () => {
    let calls = 0;

    stubApi({
      [del]: () => {
        calls += 1;
        return calls === 1 ? { status: 503, body: { code: 'busy' } } : { status: 401, body: {} };
      },
    });
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await press('Coba lagi');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
    expect(await screen.findByText('Anda sudah keluar')).toBeVisible();
    // Only a sign in that works proves the account is there, so the text does not send the user to try one
    expect(
      screen.getByText(
        'Jika Anda bisa masuk, akun belum terhapus dan penghapusan bisa diulang. Jika tidak bisa masuk, akun mungkin sudah terhapus.',
      ),
    ).toBeVisible();
  });

  it('says that the wait is for a deletion that may have run when a 429 follows an open answer', async () => {
    let calls = 0;

    stubApi({
      [del]: () => {
        calls += 1;
        return calls === 1
          ? { status: 503, body: { code: 'busy' } }
          : { status: 429, body: { code: 'rate_limited', retryAfterSeconds: 60 } };
      },
    });
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await press('Coba lagi');

    expect(await screen.findByText('Terlalu banyak percobaan')).toBeVisible();
    expect(
      screen.getByText(
        /Penghapusan mungkin sebagian berjalan\. Coba lagi setelah hitungan selesai\./,
      ),
    ).toBeVisible();
  });

  it('keeps the open state after a later wrong password, because the data that went does not come back', async () => {
    let calls = 0;

    stubApi({
      [del]: () => {
        calls += 1;
        return calls === 1
          ? { status: 503, body: { code: 'busy' } }
          : { status: 403, body: { code: 'invalid_credentials' } };
      },
    });
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await press('Coba lagi');

    expect(await screen.findByText(wrongPasswordText)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali ke Lainnya' })).toBeVisible();
  });
});

describe('Hapus akun, what an open answer leaves behind', () => {
  async function openThen(answer: { status: number; body?: unknown }) {
    let calls = 0;

    stubApi({
      [del]: () => {
        calls += 1;
        return calls === 1 ? { status: 503, body: { code: 'busy' } } : answer;
      },
    });
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await press('Coba lagi');
    return router;
  }

  const warning =
    'Jika Anda keluar sekarang, sebagian data mungkin sudah terhapus. Ulangi sampai selesai.';

  it('keeps the warning and the limit after a later wrong password', async () => {
    await openThen({ status: 403, body: { code: 'invalid_credentials' } });

    expect(await screen.findByText(wrongPasswordText)).toBeVisible();
    expect(screen.getByText(warning)).toBeVisible();
  });

  it('does not say that nothing was deleted after a later refusal', async () => {
    await openThen({ status: 422, body: { code: 'validation_failed' } });

    expect(await screen.findByText('Belum berhasil')).toBeVisible();
    expect(screen.queryByText('Akun belum dihapus')).not.toBeInTheDocument();
    expect(screen.getByText(warning)).toBeVisible();
  });

  it('keeps the warning after a 429 and adds the line about the wait', async () => {
    await openThen({ status: 429, body: { code: 'rate_limited', retryAfterSeconds: 60 } });

    expect(
      await screen.findByText(
        /Penghapusan mungkin sebagian berjalan\. Coba lagi setelah hitungan selesai\./,
      ),
    ).toBeVisible();
    expect(screen.getByText(new RegExp(warning.replaceAll('.', '\\.')))).toBeVisible();
  });

  it('takes the offer of a report away, because it would be incomplete', async () => {
    stubApi({});
    renderAt('/lainnya/hapus-akun');
    expect(screen.getByRole('link', { name: 'Unduh laporan dulu' })).toBeVisible();

    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');

    expect(screen.queryByRole('link', { name: 'Unduh laporan dulu' })).not.toBeInTheDocument();
  });

  it('lets the user leave after an open answer', async () => {
    stubApi({ [del]: { status: 503, body: { code: 'busy' } } });
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();
    await screen.findByText('Belum pasti dihapus');
    await userEvent.click(screen.getByRole('link', { name: 'Kembali ke Lainnya' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya');
    });
  });

  it('counts a 408 from a proxy as open and not as a refusal', async () => {
    stubApi({ [del]: { status: 408, body: {} } });
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();

    expect(await screen.findByText('Belum pasti dihapus')).toBeVisible();
    expect(screen.queryByText('Akun belum dihapus')).not.toBeInTheDocument();
  });

  it('waits 60 seconds when a 429 does not say how long', async () => {
    stubApi({ [del]: { status: 429, body: { code: 'rate_limited' } } });
    renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();

    expect(await screen.findByText('Terlalu banyak percobaan')).toBeVisible();
    expect(screen.getByText('Coba lagi dalam 60 detik.')).toBeVisible();
  });
});

describe('Hapus akun, a session that ended', () => {
  it('goes to Masuk with no note when the first answer is a 401', async () => {
    stubApi({ [del]: { status: 401, body: {} } });
    const router = renderAt('/lainnya/hapus-akun');

    await typePassword();
    await press();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
    expect(screen.queryByText('Anda sudah keluar')).not.toBeInTheDocument();
    expect(screen.queryByText('Akun sudah dihapus')).not.toBeInTheDocument();
  });
});

describe('Masuk, the news of another screen', () => {
  it('shows the news once and keeps the address that the guard remembered', async () => {
    stubApi({});
    const router = renderAt('/masuk', { notice: 'deleted', from: '/alat' }, { session: false });

    expect(await screen.findByText('Akun sudah dihapus')).toBeVisible();
    await waitFor(() => {
      expect(router.state.location.state).toEqual({ from: '/alat' });
    });
  });

  it('shows no news for a state that is not one', async () => {
    stubApi({});
    renderAt('/masuk', { notice: 'lain' }, { session: false });

    expect(await screen.findByRole('heading', { level: 1, name: 'Masuk' })).toBeVisible();
    expect(screen.queryByText('Akun sudah dihapus')).not.toBeInTheDocument();
    expect(screen.queryByText('Anda sudah keluar')).not.toBeInTheDocument();
  });

  it('gives way to the failure of a sign in', async () => {
    stubApi({ 'POST /v1/auth/login': { status: 401, body: { code: 'invalid_credentials' } } });
    renderAt('/masuk', { notice: 'maybe-deleted' }, { session: false });

    expect(await screen.findByText('Anda sudah keluar')).toBeVisible();
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Tidak bisa masuk')).toBeVisible();
    expect(screen.queryByText('Anda sudah keluar')).not.toBeInTheDocument();
    expect(within(document.body).queryAllByRole('alert').length).toBeGreaterThan(0);
  });
});

describe('Masuk, the words for a screen reader', () => {
  // The frame has a live region of its own, so the words are read from all of them
  const announced = () =>
    Array.from(document.querySelectorAll('[aria-live="polite"]'))
      .map((region) => region.textContent)
      .join(' ')
      .trim();

  it('drops the news from the live region when a sign in fails', async () => {
    stubApi({ 'POST /v1/auth/login': { status: 401, body: { code: 'invalid_credentials' } } });
    renderAt('/masuk', { notice: 'maybe-deleted' }, { session: false });

    await waitFor(() => {
      expect(announced()).toContain('Anda sudah keluar');
    });
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await screen.findByText('Tidak bisa masuk');

    expect(announced()).not.toContain('Anda sudah keluar');
  });
});
