import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleDevices, sampleNormal } from '@/pages/alat/sample-alat';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const resetAt = '2026-10-29T10:12:00+07:00';

function answers() {
  return {
    'GET /v1/devices': { body: sampleDevices() },
    'GET /v1/devices/d4': { body: sampleNormal() },
  };
}

function posts(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      init?.method === 'POST' && new URL(url).pathname === '/v1/devices/d4/energy-reset',
  );
}

describe('the card Total energi', () => {
  it('shows the total, says that it holds all data and links to the question', async () => {
    stubApi(answers());
    renderAt('/alat/d4');

    expect(await screen.findByText('1.260 kWh')).toBeVisible();
    expect(screen.getByText('Semua data yang tersimpan')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mulai dari nol' })).toHaveAttribute(
      'href',
      '/alat/d4/mulai-dari-nol',
    );
  });

  it('names the hour when the count starts after a reset', async () => {
    stubApi({
      ...answers(),
      'GET /v1/devices/d4': { body: sampleNormal({ energySince: { resetAt, kwh: 0 } }) },
    });
    renderAt('/alat/d4');

    expect(await screen.findByText('0 kWh')).toBeVisible();
    expect(screen.getByText('Dihitung mulai 29 Okt 2026, 11:00')).toBeVisible();
  });

  it('is left out when the API does not send the total', async () => {
    stubApi({
      ...answers(),
      'GET /v1/devices/d4': { body: { ...sampleNormal(), energySince: undefined } },
    });
    renderAt('/alat/d4');

    expect(await screen.findByText('Daya sekarang')).toBeVisible();
    expect(screen.queryByText('Total energi')).not.toBeInTheDocument();
  });

  it('keeps Hari ini and Bulan ini as they are', async () => {
    stubApi(answers());
    renderAt('/alat/d4');

    expect(await screen.findByText('4,2 kWh')).toBeVisible();
    expect(screen.getByText('142 kWh')).toBeVisible();
  });
});

describe('the question Mulai dari nol', () => {
  it('names the device, says what stays and what cannot come back', async () => {
    stubApi(answers());
    renderAt('/alat/d4/mulai-dari-nol');

    expect(await screen.findByText('Mesin jahit 1')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Mulai dari nol?' })).toBeVisible();
    expect(screen.getByText('Meter di dalam alat tetap menghitung.')).toBeVisible();
    expect(screen.getByText('Total yang lama tidak bisa dikembalikan.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ya, mulai dari nol' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/alat/d4');
    expect(document.title).toBe('Mulai dari nol? · WATTLINK');
  });

  it('keeps the search of the list in the way back', async () => {
    stubApi(answers());
    renderAt('/alat/d4/mulai-dari-nol?status=nyala');

    expect(await screen.findByRole('link', { name: 'Batal' })).toHaveAttribute(
      'href',
      '/alat/d4?status=nyala',
    );
  });

  it('sends the reset without a body and returns to the device with the news', async () => {
    let done = false;
    const fetchMock = stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d4': () => ({
        body: sampleNormal({
          energySince: done ? { resetAt, kwh: 0 } : { resetAt: null, kwh: 12 },
        }),
      }),
      'POST /v1/devices/d4/energy-reset': () => {
        done = true;
        return { body: { resetAt } };
      },
    });
    const router = renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));

    expect(await screen.findByText('Total energi mulai dari nol')).toBeVisible();
    expect(screen.getByText('Hitungan mulai pukul 11:00.')).toBeVisible();
    expect(router.state.location.pathname).toBe('/alat/d4');
    // The card shows the new total, because the detail was read again
    expect(await screen.findByText('Dihitung mulai 29 Okt 2026, 11:00')).toBeVisible();
    const [, init] = posts(fetchMock)[0] ?? [];
    expect(init?.body).toBeUndefined();
  });

  it('replaces the question in the history, so Back does not ask it again', async () => {
    stubApi({
      ...answers(),
      'POST /v1/devices/d4/energy-reset': { body: { resetAt } },
    });
    const router = renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));
    await screen.findByText('Total energi mulai dari nol');

    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('does not send a second call while the first one runs', async () => {
    let finish: (response: Response) => void = () => undefined;
    const fetchMock = stubApi(answers());
    const base = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) =>
      init?.method === 'POST'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : (base?.(input, init) ?? Promise.reject(new TypeError('No answer'))),
    );
    renderAt('/alat/d4/mulai-dari-nol');

    const button = await screen.findByRole('button', { name: 'Ya, mulai dari nol' });
    await userEvent.click(button);
    await screen.findByRole('button', { name: 'Sedang memulai' });
    await userEvent.click(screen.getByRole('button', { name: 'Sedang memulai' }));

    expect(posts(fetchMock)).toHaveLength(1);
    finish(new Response(JSON.stringify({ resetAt }), { status: 200 }));
    await screen.findByText('Total energi mulai dari nol');
  });

  it('says that nothing changed when the call fails, drops the lists and lets the user try again', async () => {
    let fail = true;
    const fetchMock = stubApi({
      ...answers(),
      'POST /v1/devices/d4/energy-reset': () => (fail ? { status: 500 } : { body: { resetAt } }),
    });
    const router = renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));

    expect(await screen.findByText('Total energi belum dimulai dari nol')).toBeVisible();
    expect(screen.getByText('Periksa sambungan Anda, lalu coba lagi.')).toBeVisible();
    expect(screen.queryByText('Yang tidak berubah')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/alat/d4/mulai-dari-nol');

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('Hitungan mulai pukul 11:00.')).toBeVisible();
    expect(posts(fetchMock)).toHaveLength(2);
  });

  it('does nothing on Batal while the call runs, so the news of the reset cannot be missed', async () => {
    let finish: (response: Response) => void = () => undefined;
    const fetchMock = stubApi(answers());
    const base = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) =>
      init?.method === 'POST'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : (base?.(input, init) ?? Promise.reject(new TypeError('No answer'))),
    );
    const router = renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));
    await screen.findByRole('button', { name: 'Sedang memulai' });
    await userEvent.click(screen.getByRole('link', { name: 'Batal' }));

    expect(router.state.location.pathname).toBe('/alat/d4/mulai-dari-nol');
    finish(new Response(JSON.stringify({ resetAt }), { status: 200 }));
    expect(await screen.findByText('Total energi mulai dari nol')).toBeVisible();
    expect(router.state.location.pathname).toBe('/alat/d4');
  });

  it('shows 0 kWh at once, without waiting for the device to be read again', async () => {
    let reset = false;
    const fetchMock = stubApi({
      ...answers(),
      'POST /v1/devices/d4/energy-reset': { body: { resetAt } },
    });
    const base = fetchMock.getMockImplementation();
    // After the reset, the read of the device never answers
    fetchMock.mockImplementation((input, init) => {
      const path = new URL(input).pathname;

      if (init?.method === 'POST') {
        reset = true;
      }
      return reset && path === '/v1/devices/d4' && (init?.method ?? 'GET') === 'GET'
        ? new Promise<Response>(() => undefined)
        : (base?.(input, init) ?? Promise.reject(new TypeError('No answer')));
    });
    renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));

    expect(await screen.findByText('Total energi mulai dari nol')).toBeVisible();
    // The cache tells the card in the next tick, and the read that follows never answers
    expect(await screen.findByText('0 kWh')).toBeVisible();
    expect(screen.getByText('Dihitung mulai 29 Okt 2026, 11:00')).toBeVisible();
  });

  it('does not say that nothing changed when the answer was lost, because the service may have reset', async () => {
    // No answer is listed for the call, so it fails like a lost connection
    stubApi(answers());
    renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));

    expect(await screen.findByText('Belum pasti total energi sudah mulai dari nol')).toBeVisible();
    expect(screen.queryByText('Total energi belum dimulai dari nol')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  });

  it('says that the device is gone when the reset itself answers 404', async () => {
    stubApi({
      ...answers(),
      'POST /v1/devices/d4/energy-reset': { status: 404, body: { code: 'not_found' } },
    });
    renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, mulai dari nol' }));

    expect(await screen.findByText('Alat tidak ditemukan')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali ke daftar' })).toHaveAttribute(
      'href',
      '/alat',
    );
    expect(screen.queryByText('Total energi belum dimulai dari nol')).not.toBeInTheDocument();
  });

  it('says that the device is gone for a 404 and links to the list', async () => {
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d4': { status: 404, body: { code: 'not_found' } },
    });
    renderAt('/alat/d4/mulai-dari-nol');

    expect(await screen.findByText('Alat tidak ditemukan')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali ke daftar' })).toHaveAttribute(
      'href',
      '/alat',
    );
  });

  it('offers to read the device again when it cannot be loaded', async () => {
    let calls = 0;
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d4': () => {
        calls += 1;
        return calls === 1 ? { status: 500 } : { body: sampleNormal() };
      },
    });
    renderAt('/alat/d4/mulai-dari-nol');

    await userEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ya, mulai dari nol' })).toBeVisible();
    });
  });
});
