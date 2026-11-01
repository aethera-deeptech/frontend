import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleSettings } from '@/pages/pengaturan/sample-settings';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function patchBody(fetchMock: ReturnType<typeof stubApi>): unknown {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
  const body = call?.[1]?.body;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

describe('Lainnya', () => {
  it('lists the screens that have no tab of their own', async () => {
    stubApi({});
    renderAt('/lainnya');

    expect(await screen.findByRole('link', { name: /Catat produksi/ })).toHaveAttribute(
      'href',
      '/lainnya/produksi',
    );
    expect(screen.getByRole('link', { name: /Pengaturan/ })).toHaveAttribute(
      'href',
      '/lainnya/pengaturan',
    );
  });
});

describe('Pengaturan', () => {
  it('shows that the settings load, then the settings', async () => {
    stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    renderAt('/lainnya/pengaturan');

    expect(screen.getByRole('status')).toHaveTextContent('Memuat pengaturan');
    expect(screen.getByRole('heading', { level: 1, name: 'Pengaturan' })).toBeVisible();
    expect(await screen.findByText('Konveksi Maju Jaya')).toBeInTheDocument();
  });

  it('says that the settings could not be loaded and tries again on request', async () => {
    let calls = 0;
    stubApi({
      'GET /v1/settings': () => {
        calls += 1;
        return calls === 1 ? { status: 503 } : { body: sampleSettings() };
      },
    });
    renderAt('/lainnya/pengaturan');

    expect(await screen.findByRole('alert')).toHaveTextContent('Pengaturan tidak bisa dimuat');
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('Konveksi Maju Jaya')).toBeInTheDocument();
  });
});

describe('Nama usaha', () => {
  it('saves the name and confirms it on the overview', async () => {
    let saved = false;
    const fetchMock = stubApi({
      'GET /v1/settings': () => ({
        body: saved
          ? { ...sampleSettings(), businessName: 'Konveksi Maju Sejahtera' }
          : sampleSettings(),
      }),
      'PATCH /v1/settings': () => {
        saved = true;
        return { status: 204 };
      },
    });
    const router = renderAt('/lainnya/pengaturan/nama');

    const input = await screen.findByRole('textbox', { name: 'Nama usaha' });
    expect(input).toHaveValue('Konveksi Maju Jaya');
    await userEvent.clear(input);
    await userEvent.type(input, '  Konveksi Maju Sejahtera ');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Nama usaha sudah diperbarui.')).toBeInTheDocument();
    // The overview asks again and shows the new name
    expect(await screen.findByText('Konveksi Maju Sejahtera')).toBeInTheDocument();
    expect(screen.queryByText('Konveksi Maju Jaya')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lainnya/pengaturan');
    expect(patchBody(fetchMock)).toEqual({ businessName: 'Konveksi Maju Sejahtera' });
  });

  it('does not save an empty name', async () => {
    const fetchMock = stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    renderAt('/lainnya/pengaturan/nama');

    await userEvent.clear(await screen.findByRole('textbox', { name: 'Nama usaha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Nama usaha wajib diisi.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('goes back without saving on Batal', async () => {
    stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    const router = renderAt('/lainnya/pengaturan/nama');

    await userEvent.click(await screen.findByRole('link', { name: 'Batal' }));

    expect(router.state.location.pathname).toBe('/lainnya/pengaturan');
  });

  it('says that saving failed and keeps the form', async () => {
    stubApi({
      'GET /v1/settings': { body: sampleSettings() },
      'PATCH /v1/settings': { status: 500 },
    });
    renderAt('/lainnya/pengaturan/nama');

    await userEvent.click(await screen.findByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Pengaturan belum tersimpan')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nama usaha' })).toBeInTheDocument();
  });
});

describe('Tarif listrik', () => {
  it('saves the tariff that the user typed with its dots', async () => {
    const fetchMock = stubApi({
      'GET /v1/settings': { body: sampleSettings() },
      'PATCH /v1/settings': { status: 204 },
    });
    renderAt('/lainnya/pengaturan/tarif');

    const input = await screen.findByRole('textbox', { name: 'Tarif per kWh (Rp)' });
    expect(input).toHaveValue('1.444');
    expect(input).toHaveAccessibleDescription(/tarif bawaan Rp1\.444 per kWh/);
    await userEvent.clear(input);
    await userEvent.type(input, '1.500');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Tarif listrik sudah diperbarui.')).toBeInTheDocument();
    expect(patchBody(fetchMock)).toEqual({ tariffRpPerKwh: 1500 });
  });

  it.each(['abc', '0', '1444.7', '1.444,70', '14.4'])(
    'does not save %s as a tariff',
    async (typed) => {
      const fetchMock = stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
      renderAt('/lainnya/pengaturan/tarif');

      const input = await screen.findByRole('textbox', { name: 'Tarif per kWh (Rp)' });
      await userEvent.clear(input);
      await userEvent.type(input, typed);
      await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

      expect(
        await screen.findByText(
          'Isi tarif dengan angka bulat lebih dari 0, misalnya 1444 atau 1.444.',
        ),
      ).toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
    },
  );

  it('goes back without a request when the default tariff is saved unchanged', async () => {
    const fetchMock = stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    const router = renderAt('/lainnya/pengaturan/tarif');

    await screen.findByRole('textbox', { name: 'Tarif per kWh (Rp)' });
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/pengaturan');
    });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('offers the default tariff only while the user has a tariff of their own', async () => {
    const fetchMock = stubApi({
      'GET /v1/settings': {
        body: sampleSettings({
          tariff: { rpPerKwh: 1500, isDefault: false, defaultRpPerKwh: 1444 },
        }),
      },
      'PATCH /v1/settings': { status: 204 },
    });
    renderAt('/lainnya/pengaturan/tarif');

    await userEvent.click(await screen.findByRole('button', { name: 'Pakai tarif bawaan' }));

    expect(await screen.findByText('Tarif listrik sudah diperbarui.')).toBeInTheDocument();
    expect(patchBody(fetchMock)).toEqual({ tariffRpPerKwh: null });
  });

  it('has no default tariff button while the default is in use', async () => {
    stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    renderAt('/lainnya/pengaturan/tarif');

    await screen.findByRole('textbox', { name: 'Tarif per kWh (Rp)' });

    expect(screen.queryByRole('button', { name: 'Pakai tarif bawaan' })).not.toBeInTheDocument();
  });
});

describe('Jam kerja', () => {
  it('saves the days and the hours', async () => {
    const fetchMock = stubApi({
      'GET /v1/settings': { body: sampleSettings() },
      'PATCH /v1/settings': { status: 204 },
    });
    renderAt('/lainnya/pengaturan/jam-kerja');

    await userEvent.click(await screen.findByRole('combobox', { name: 'Hari kerja' }));
    await userEvent.click(screen.getByRole('option', { name: 'Senin sampai Jumat' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Jam selesai' }));
    await userEvent.click(screen.getByRole('option', { name: '16:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Jam kerja sudah diperbarui.')).toBeInTheDocument();
    expect(patchBody(fetchMock)).toEqual({
      workHours: { days: 'mon-fri', start: '08:00', end: '16:00' },
    });
  });

  it('does not save an end that is not after the start', async () => {
    const fetchMock = stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    renderAt('/lainnya/pengaturan/jam-kerja');

    await userEvent.click(await screen.findByRole('combobox', { name: 'Jam selesai' }));
    await userEvent.click(screen.getByRole('option', { name: '07:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Jam selesai harus setelah jam mulai.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('shows a time from the API that is not on the half hour list', async () => {
    stubApi({
      'GET /v1/settings': {
        body: sampleSettings({ workHours: { days: 'daily', start: '08:15', end: '17:00' } }),
      },
    });
    renderAt('/lainnya/pengaturan/jam-kerja');

    expect(await screen.findByRole('combobox', { name: 'Jam mulai' })).toHaveTextContent('08:15');
  });
});

describe('Kepekaan anomali', () => {
  it('saves the level that the user picked', async () => {
    const fetchMock = stubApi({
      'GET /v1/settings': { body: sampleSettings() },
      'PATCH /v1/settings': { status: 204 },
    });
    renderAt('/lainnya/pengaturan/kepekaan');

    const select = await screen.findByRole('combobox', { name: 'Kepekaan' });
    expect(select).toHaveTextContent('Sedang');
    await userEvent.click(select);
    await userEvent.click(screen.getByRole('option', { name: 'Tinggi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Kepekaan anomali sudah diperbarui.')).toBeInTheDocument();
    expect(patchBody(fetchMock)).toEqual({ anomalySensitivity: 'tinggi' });
  });

  it('explains the three levels', async () => {
    stubApi({ 'GET /v1/settings': { body: sampleSettings() } });
    renderAt('/lainnya/pengaturan/kepekaan');

    const select = await screen.findByRole('combobox', { name: 'Kepekaan' });

    expect(select).toHaveAccessibleDescription(/Rendah menandai lebih sedikit anomali/);
  });
});
