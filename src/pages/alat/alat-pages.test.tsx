import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleDevices, sampleNormal } from '@/pages/alat/sample-alat';
import { matchWideScreen, renderAt, restoreScreen, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  restoreScreen();
});

describe('the list of devices', () => {
  it('loads the devices and shows them', async () => {
    stubApi({ 'GET /v1/devices': { body: sampleDevices() } });
    renderAt('/alat');

    expect(await screen.findByRole('status')).toHaveTextContent('Memuat daftar alat');
    expect(await screen.findByText('6 alat terpasang, 1 anomali, 1 offline')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Alat' })).toBeInTheDocument();
    expect(document.title).toBe('Alat · WATTLINK');
  });

  it('offers to add a device and to record the production', async () => {
    stubApi({ 'GET /v1/devices': { body: sampleDevices() } });
    renderAt('/alat');

    await screen.findByText('6 alat terpasang, 1 anomali, 1 offline');

    expect(screen.getByRole('link', { name: 'Tambah alat' })).toHaveAttribute(
      'href',
      '/alat/tambah',
    );
    expect(screen.getByRole('link', { name: 'Catat produksi' })).toHaveAttribute(
      'href',
      '/lainnya/produksi',
    );
  });

  it('hides the production button on a phone and keeps it on a wide screen when a device is open', async () => {
    matchWideScreen();
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d4': { body: sampleNormal() },
    });
    renderAt('/alat/d4');

    await screen.findByRole('heading', { name: 'Info alat' });

    // jsdom has no layout, so the class says what a phone hides and a wide screen shows
    expect(screen.getByRole('link', { name: 'Catat produksi' })).toHaveClass(
      'hidden',
      'lg:inline-flex',
    );
  });

  it('does not offer the production while no device is installed', async () => {
    stubApi({ 'GET /v1/devices': { body: { items: [] } } });
    renderAt('/alat');

    // The header does not repeat the button that the empty state holds
    expect(await screen.findAllByRole('link', { name: 'Tambah alat' })).toHaveLength(1);

    expect(screen.queryByRole('link', { name: 'Catat produksi' })).not.toBeInTheDocument();
  });

  it('shows only the chosen status and keeps it in the address', async () => {
    stubApi({ 'GET /v1/devices': { body: sampleDevices() } });
    const router = renderAt('/alat');

    await screen.findByText('6 alat terpasang, 1 anomali, 1 offline');
    await userEvent.click(screen.getByRole('combobox', { name: 'Tampilkan' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Mati' }));

    await waitFor(() => {
      expect(within(screen.getByRole('main')).getAllByRole('listitem')).toHaveLength(1);
    });
    expect(router.state.location.search).toBe('?status=mati');
  });

  it('keeps the chosen status in the address when a device opens', async () => {
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d6': {
        body: sampleNormal({ id: 'd6', name: 'Mesin obras', status: 'mati' }),
      },
    });
    const router = renderAt('/alat?status=mati');

    await userEvent.click(await screen.findByRole('link', { name: /Mesin obras/ }));

    expect(router.state.location.pathname).toBe('/alat/d6');
    expect(router.state.location.search).toBe('?status=mati');
    expect(await screen.findByRole('link', { name: 'Kembali' })).toHaveAttribute(
      'href',
      '/alat?status=mati',
    );
  });

  it('says that the list could not be loaded and tries again on request', async () => {
    let calls = 0;
    stubApi({
      'GET /v1/devices': () => (++calls === 1 ? { status: 503 } : { body: sampleDevices() }),
    });
    renderAt('/alat');

    expect(await screen.findByRole('alert')).toHaveTextContent('Daftar alat tidak bisa dimuat');

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('6 alat terpasang, 1 anomali, 1 offline')).toBeInTheDocument();
  });

  it('opens the first device at once on a wide screen', async () => {
    matchWideScreen();
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d1': { body: sampleNormal({ id: 'd1', name: 'Kompresor' }) },
    });
    const router = renderAt('/alat');

    expect(await screen.findByRole('heading', { name: 'Info alat' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/alat/d1');
  });
});

describe('the detail of a device', () => {
  it('loads the device and shows it', async () => {
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d4': { body: sampleNormal() },
    });
    renderAt('/alat/d4');

    expect(await screen.findByRole('heading', { name: 'Info alat' })).toBeInTheDocument();
    // The list next to the detail shows the power of the open device as well
    expect(screen.getAllByText('780 W')).toHaveLength(2);
  });

  it('says that the device does not exist when the API says 404', async () => {
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/zzz': { status: 404 },
    });
    renderAt('/alat/zzz');

    expect(await screen.findByRole('status')).toHaveTextContent('Alat tidak ditemukan');
    expect(screen.getByRole('link', { name: 'Kembali ke daftar' })).toHaveAttribute(
      'href',
      '/alat',
    );
  });

  it('says that the device could not be loaded for any other failure', async () => {
    stubApi({
      'GET /v1/devices': { body: sampleDevices() },
      'GET /v1/devices/d4': { status: 500 },
    });
    renderAt('/alat/d4');

    expect(await screen.findByRole('alert')).toHaveTextContent('Alat tidak bisa dimuat');
  });
});

describe('the form to rename a device', () => {
  const answers = () => ({
    'GET /v1/devices': { body: sampleDevices() },
    'GET /v1/devices/d4': { body: sampleNormal() },
  });

  it('starts with the current name', async () => {
    stubApi(answers());
    renderAt('/alat/d4/ganti-nama');

    expect(await screen.findByLabelText('Nama alat')).toHaveValue('Mesin jahit 1');
    expect(screen.getByText('Pakai nama yang mudah Anda kenali.')).toBeInTheDocument();
  });

  it('refuses an empty name and does not send anything', async () => {
    const fetchMock = stubApi(answers());
    renderAt('/alat/d4/ganti-nama');

    await userEvent.clear(await screen.findByLabelText('Nama alat'));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Isi nama alat.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nama alat')).toBeInvalid();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/devices/d4'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('refuses a name that is too long', async () => {
    stubApi(answers());
    renderAt('/alat/d4/ganti-nama');

    const field = await screen.findByLabelText('Nama alat');
    await userEvent.clear(field);
    await userEvent.type(field, 'a'.repeat(41));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Nama alat paling panjang 40 huruf.')).toBeInTheDocument();
  });

  it('saves the new name, goes back to the device and shows the new name in the detail and the list', async () => {
    let saved = false;
    const fetchMock = stubApi({
      'GET /v1/devices': () => ({
        body: saved
          ? {
              ...sampleDevices(),
              items: sampleDevices().items.map((item) =>
                item.id === 'd4' ? { ...item, name: 'Mesin jahit utama' } : item,
              ),
            }
          : sampleDevices(),
      }),
      'GET /v1/devices/d4': () => ({
        body: sampleNormal(saved ? { name: 'Mesin jahit utama' } : {}),
      }),
      'PATCH /v1/devices/d4': () => {
        saved = true;
        return { status: 204 };
      },
    });
    const router = renderAt('/alat/d4/ganti-nama');

    const field = await screen.findByLabelText('Nama alat');
    await userEvent.clear(field);
    await userEvent.type(field, '  Mesin jahit utama ');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/alat/d4');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/devices/d4',
      expect.objectContaining({ method: 'PATCH', body: '{"name":"Mesin jahit utama"}' }),
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Mesin jahit utama' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Mesin jahit utama/ })).toBeInTheDocument();
    expect(screen.queryByText('Mesin jahit 1')).not.toBeInTheDocument();
  });

  it('refuses a name of only spaces', async () => {
    const fetchMock = stubApi(answers());
    renderAt('/alat/d4/ganti-nama');

    const field = await screen.findByLabelText('Nama alat');
    await userEvent.clear(field);
    await userEvent.type(field, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Isi nama alat.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/devices/d4'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('stays on the form when the name could not be saved', async () => {
    stubApi({ ...answers(), 'PATCH /v1/devices/d4': { status: 500 } });
    renderAt('/alat/d4/ganti-nama');

    await userEvent.click(await screen.findByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nama belum tersimpan');
    expect(screen.getByLabelText('Nama alat')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Nama alat'), 'x');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled();
  });

  it('goes back without saving when the user cancels', async () => {
    stubApi(answers());
    renderAt('/alat/d4/ganti-nama');

    expect(await screen.findByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/alat/d4');
  });
});
