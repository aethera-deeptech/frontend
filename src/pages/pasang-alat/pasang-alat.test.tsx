import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

const rooms = {
  items: [
    { id: 'jahit', name: 'Ruang jahit' },
    { id: 'produksi', name: 'Ruang produksi' },
    { id: 'gudang', name: 'Gudang' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

async function goToName(kind: 'Colokan pintar' | 'Penjepit arus') {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(kind) }));
  if (kind === 'Penjepit arus') {
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Saya tahu cara memasang dengan aman' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  }
  await userEvent.click(
    screen.getByRole('checkbox', { name: 'Saya setuju data listrik alat ini dibaca' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
}

async function fillName(name: string, room: string) {
  await userEvent.type(await screen.findByRole('textbox', { name: 'Nama alat' }), name);
  await userEvent.click(await screen.findByRole('combobox', { name: 'Ruangan' }));
  await userEvent.click(screen.getByRole('option', { name: room }));
  await userEvent.click(screen.getByRole('button', { name: 'Cari alat' }));
}

describe('Tambah alat, choose the kind', () => {
  it('offers the two kinds of device', async () => {
    stubApi({});
    renderAt('/alat/tambah');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tambah alat' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Colokan pintar/ })).toHaveTextContent(
      'Untuk mesin yang dicolok ke stopkontak',
    );
    expect(screen.getByRole('button', { name: /Penjepit arus/ })).toHaveTextContent(
      'Dipasang di panel listrik',
    );
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/alat');
  });

  it('goes to the consent for a plug and to the warning for a clamp', async () => {
    stubApi({});
    const router = renderAt('/alat/tambah');

    await userEvent.click(await screen.findByRole('button', { name: /Colokan pintar/ }));
    expect(router.state.location.pathname).toBe('/alat/tambah/persetujuan');

    await act(() => router.navigate('/alat/tambah'));
    await userEvent.click(await screen.findByRole('button', { name: /Penjepit arus/ }));
    expect(router.state.location.pathname).toBe('/alat/tambah/peringatan');
  });
});

describe('Tambah alat, the warning and the consent', () => {
  it('lets the user go on only after the box is ticked', async () => {
    stubApi({});
    const router = renderAt('/alat/tambah');
    await userEvent.click(await screen.findByRole('button', { name: /Penjepit arus/ }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sebelum memasang penjepit arus' }),
    ).toBeVisible();
    expect(screen.getByText('Ada risiko sengatan listrik dan kebakaran')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled();

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Saya tahu cara memasang dengan aman' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    expect(router.state.location.pathname).toBe('/alat/tambah/persetujuan');
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled();
    expect(screen.getByText('Yang dibaca sistem')).toBeInTheDocument();
    expect(screen.getByText('Yang tidak dilakukan sistem')).toBeInTheDocument();
  });

  it('sends a visit that skipped a step back to the first one', async () => {
    stubApi({});
    const router = renderAt('/alat/tambah/nama');

    expect(await screen.findByRole('heading', { name: 'Tambah alat' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/alat/tambah');

    await act(() => router.navigate('/alat/tambah/persetujuan'));
    expect(router.state.location.pathname).toBe('/alat/tambah');

    await act(() => router.navigate('/alat/tambah/peringatan'));
    expect(router.state.location.pathname).toBe('/alat/tambah');
  });

  it('sends a clamp that skipped the warning back to it', async () => {
    stubApi({});
    const router = renderAt('/alat/tambah');
    await userEvent.click(await screen.findByRole('button', { name: /Penjepit arus/ }));
    await act(() => router.navigate('/alat/tambah/persetujuan'));

    expect(router.state.location.pathname).toBe('/alat/tambah/peringatan');
  });
});

describe('Tambah alat, the history', () => {
  it('sends a clamp user back to the start when the safety tick was taken away on the way back', async () => {
    stubApi({ 'GET /v1/rooms': { body: rooms } });
    const router = renderAt('/alat/tambah');
    await goToName('Penjepit arus');
    expect(router.state.location.pathname).toBe('/alat/tambah/nama');

    await act(() => router.navigate(-2));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Saya tahu cara memasang dengan aman' }),
    );
    await act(() => router.navigate(2));

    expect(router.state.location.pathname).toBe('/alat/tambah');
  });
});

describe('Tambah alat, the name', () => {
  it('asks for a name and a room', async () => {
    const fetchMock = stubApi({ 'GET /v1/rooms': { body: rooms } });
    renderAt('/alat/tambah');
    await goToName('Colokan pintar');

    await userEvent.click(await screen.findByRole('button', { name: 'Cari alat' }));

    expect(await screen.findByText('Isi nama alat.')).toBeInTheDocument();
    expect(screen.getByText('Pilih ruangan.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('says that the rooms could not be loaded', async () => {
    stubApi({ 'GET /v1/rooms': { status: 503 } });
    renderAt('/alat/tambah');
    await goToName('Colokan pintar');

    expect(await screen.findByRole('alert')).toHaveTextContent('Daftar ruangan tidak bisa dimuat');
  });

  it('says that the search could not start and keeps the form', async () => {
    stubApi({ 'GET /v1/rooms': { body: rooms }, 'POST /v1/pairings': { status: 500 } });
    renderAt('/alat/tambah');
    await goToName('Colokan pintar');

    await fillName('Mesin jahit 2', 'Ruang jahit');

    expect(await screen.findByText('Pencarian belum bisa dimulai')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nama alat' })).toHaveValue('Mesin jahit 2');
  });
});

describe('Tambah alat, the search', () => {
  it('sends the device, searches and says when the device is connected', async () => {
    const fetchMock = stubApi({
      'GET /v1/rooms': { body: rooms },
      'POST /v1/pairings': { body: { id: 'p1' } },
      'GET /v1/pairings/p1': { body: { status: 'connected' } },
    });
    const router = renderAt('/alat/tambah');
    await goToName('Penjepit arus');

    await fillName('  Mesin jahit 2 ', 'Ruang produksi');

    expect(await screen.findByText('Alat terhubung, menunggu data pertama')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/alat/tambah/mencari/p1');
    expect(screen.getByText('Alat Anda sudah ditemukan.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat daftar alat' })).toHaveAttribute(
      'href',
      '/alat',
    );
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    const body = post?.[1]?.body;
    expect(typeof body === 'string' ? JSON.parse(body) : undefined).toEqual({
      kind: 'clamp',
      name: 'Mesin jahit 2',
      roomId: 'produksi',
    });
  });

  it('shows that it is searching while the API has not found the device', async () => {
    stubApi({ 'GET /v1/pairings/p1': { body: { status: 'searching' } } });
    renderAt('/alat/tambah/mencari/p1');

    expect(screen.getByRole('status')).toHaveTextContent('Mencari alat di dekat Anda');
    expect(await screen.findByText('Pasang alat, lalu hubungkan ke Wi-Fi.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Mencari alat di dekat Anda');
  });

  it('says that the device did not connect and searches again with the same answers', async () => {
    const fetchMock = stubApi({
      'GET /v1/rooms': { body: rooms },
      'POST /v1/pairings': { body: { id: 'p1' } },
      'GET /v1/pairings/p1': { body: { status: 'failed' } },
    });
    renderAt('/alat/tambah');
    await goToName('Colokan pintar');
    await fillName('Mesin jahit 2', 'Gudang');

    expect(await screen.findByText('Alat belum terhubung')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2);
    });
  });

  it('says that a new search could not start', async () => {
    let posts = 0;
    stubApi({
      'GET /v1/rooms': { body: rooms },
      'POST /v1/pairings': () => (++posts === 1 ? { body: { id: 'p1' } } : { status: 500 }),
      'GET /v1/pairings/p1': { body: { status: 'failed' } },
    });
    renderAt('/alat/tambah');
    await goToName('Colokan pintar');
    await fillName('Mesin jahit 2', 'Gudang');

    await userEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('Pencarian belum bisa dimulai')).toBeInTheDocument();
  });

  it('starts over when the answers are gone, for example after a reload', async () => {
    stubApi({ 'GET /v1/pairings/p1': { body: { status: 'failed' } } });
    const router = renderAt('/alat/tambah/mencari/p1');

    await userEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));

    expect(router.state.location.pathname).toBe('/alat/tambah');
  });

  it('says that the status could not be loaded', async () => {
    stubApi({ 'GET /v1/pairings/p1': { status: 503 } });
    renderAt('/alat/tambah/mencari/p1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Status alat tidak bisa dimuat');
  });
});
