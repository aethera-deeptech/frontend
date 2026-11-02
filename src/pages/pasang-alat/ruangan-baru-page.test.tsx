import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const rooms = {
  items: [
    { id: 'jahit', name: 'Ruang jahit' },
    { id: 'gudang', name: 'Gudang' },
  ],
};

function bodyOf(fetchMock: ReturnType<typeof stubApi>): unknown {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => new URL(url).pathname === '/v1/rooms' && init?.method === 'POST',
  );
  const body = call?.[1]?.body;

  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

async function goToName() {
  await userEvent.click(await screen.findByRole('button', { name: /WATTLINK Plug/ }));
  await userEvent.click(
    screen.getByRole('checkbox', { name: 'Saya setuju data listrik alat ini dibaca' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
}

async function openRoomForm() {
  await goToName();
  await userEvent.type(await screen.findByRole('textbox', { name: 'Nama alat' }), 'Mesin jahit 2');
  await userEvent.click(await screen.findByRole('link', { name: 'Tambah ruangan' }));
  await screen.findByRole('heading', { level: 1, name: 'Ruangan baru' });
}

describe('Tambah ruangan', () => {
  it('opens from the form of the device and keeps the name that the user typed', async () => {
    stubApi({ 'GET /v1/rooms': { body: rooms } });
    const router = renderAt('/alat/tambah');

    await openRoomForm();

    expect(router.state.location.pathname).toBe('/alat/tambah/ruangan');
    expect(screen.getByLabelText('Nama ruangan')).toHaveAccessibleDescription(
      'Pakai nama tempat alat berada, misalnya ruang jahit.',
    );
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute(
      'href',
      '/alat/tambah/nama',
    );
    expect(document.title).toBe('Ruangan baru · WATTLINK');

    await userEvent.click(screen.getByRole('link', { name: 'Kembali' }));

    expect(await screen.findByRole('textbox', { name: 'Nama alat' })).toHaveValue('Mesin jahit 2');
  });

  it('asks for a name and does not call the API without one', async () => {
    const fetchMock = stubApi({ 'GET /v1/rooms': { body: rooms } });
    renderAt('/alat/tambah');

    await openRoomForm();
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(screen.getByLabelText('Nama ruangan')).toHaveAccessibleDescription('Isi nama ruangan.');
    expect(screen.getByLabelText('Nama ruangan')).toHaveFocus();
    expect(bodyOf(fetchMock)).toBeUndefined();
  });

  it('asks for a name of at most 40 characters', async () => {
    stubApi({ 'GET /v1/rooms': { body: rooms } });
    renderAt('/alat/tambah');

    await openRoomForm();
    await userEvent.type(screen.getByLabelText('Nama ruangan'), 'x'.repeat(41));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(screen.getByLabelText('Nama ruangan')).toHaveAccessibleDescription(
      'Nama ruangan paling panjang 40 huruf.',
    );
  });

  it('adds the room and comes back to the form with the new room chosen', async () => {
    // The API holds the new room after the call, so a read after it returns the room too
    let added = false;
    const fetchMock = stubApi({
      'GET /v1/rooms': () => ({
        body: {
          items: added ? [...rooms.items, { id: 'cetak', name: 'Ruang cetak' }] : rooms.items,
        },
      }),
      'POST /v1/rooms': () => {
        added = true;
        return { status: 201, body: { id: 'cetak', name: 'Ruang cetak' } };
      },
    });
    const router = renderAt('/alat/tambah');

    await openRoomForm();
    await userEvent.type(screen.getByLabelText('Nama ruangan'), ' Ruang cetak ');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/alat/tambah/nama');
    });
    expect(bodyOf(fetchMock)).toEqual({ name: 'Ruang cetak' });
    expect(await screen.findByRole('combobox', { name: 'Ruangan' })).toHaveTextContent(
      'Ruang cetak',
    );
    expect(screen.getByRole('textbox', { name: 'Nama alat' })).toHaveValue('Mesin jahit 2');
  });

  it('says that the name is taken, in the field, and clears the text on edit', async () => {
    stubApi({
      'GET /v1/rooms': { body: rooms },
      'POST /v1/rooms': { status: 409, body: { code: 'room_exists', message: 'No' } },
    });
    renderAt('/alat/tambah');

    await openRoomForm();
    await userEvent.type(screen.getByLabelText('Nama ruangan'), 'Ruang jahit');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(
      await screen.findByText('Nama ruangan ini sudah dipakai. Pakai nama lain.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Nama ruangan')).toBeInvalid();

    await userEvent.type(screen.getByLabelText('Nama ruangan'), '2');

    expect(
      screen.queryByText('Nama ruangan ini sudah dipakai. Pakai nama lain.'),
    ).not.toBeInTheDocument();
  });

  it('says that the business has 100 rooms and holds the button', async () => {
    const fetchMock = stubApi({
      'GET /v1/rooms': { body: rooms },
      'POST /v1/rooms': { status: 409, body: { code: 'too_many_rooms', message: 'No' } },
    });
    renderAt('/alat/tambah');

    await openRoomForm();
    await userEvent.type(screen.getByLabelText('Nama ruangan'), 'Ruang cetak');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Ruangan sudah penuh')).toBeVisible();
    expect(
      screen.getByText('Satu usaha bisa punya sampai 100 ruangan. Pakai ruangan yang sudah ada.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Simpan' })).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('says that the fields are not right when the API refuses them', async () => {
    stubApi({
      'GET /v1/rooms': { body: rooms },
      'POST /v1/rooms': { status: 422, body: { code: 'validation_failed', message: 'No' } },
    });
    renderAt('/alat/tambah');

    await openRoomForm();
    await userEvent.type(screen.getByLabelText('Nama ruangan'), 'Ruang cetak');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Periksa isian Anda')).toBeVisible();
  });

  it('starts over when the steps before were skipped', async () => {
    stubApi({ 'GET /v1/rooms': { body: rooms } });
    const router = renderAt('/alat/tambah/ruangan');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/alat/tambah');
    });
  });
});
