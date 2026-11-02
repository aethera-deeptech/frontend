import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderAt, sampleGateway, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const noHub = { 'GET /v1/gateways': { body: { items: [] } } };

function bodyOf(fetchMock: ReturnType<typeof stubApi>, path: string): unknown {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => new URL(url).pathname === path && init?.method === 'POST',
  );
  const body = call?.[1]?.body;

  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

async function fill(code = 'K7M2Q9XA', name = 'Hub pabrik') {
  await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), code);
  await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), name);
}

describe('Tambah alat, the first step', () => {
  it('opens the choice of the kind of device when the business has a hub', async () => {
    stubApi({});
    const router = renderAt('/alat/tambah');

    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeVisible();
    expect(router.state.location.pathname).toBe('/alat/tambah');
  });

  it('says that the hub loads, then opens the hub step when the business has none', async () => {
    let answer: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            answer = resolve;
          }),
      ),
    );
    const router = renderAt('/alat/tambah');

    expect(await screen.findByText('Memuat WATTLINK Hub')).toBeVisible();

    answer(new Response(JSON.stringify({ items: [] })));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/alat/tambah/hub');
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hubungkan WATTLINK Hub' }),
    ).toBeVisible();
  });

  it('does not block the user when the list of hubs cannot be loaded', async () => {
    stubApi({ 'GET /v1/gateways': { status: 503 } });
    const router = renderAt('/alat/tambah');

    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeVisible();
    expect(router.state.location.pathname).toBe('/alat/tambah');
  });
});

describe('Hubungkan WATTLINK Hub', () => {
  it('shows the form with the rules of the code', async () => {
    stubApi(noHub);
    renderAt('/alat/tambah/hub');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hubungkan WATTLINK Hub' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toHaveAccessibleDescription(
      'Huruf besar dan angka 2 sampai 9. Kode berlaku 10 menit.',
    );
    expect(screen.getByLabelText('Nama WATTLINK Hub')).toHaveAccessibleDescription(
      'Pakai nama yang mudah Anda kenali.',
    );
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/alat');
    expect(document.title).toBe('Hubungkan WATTLINK Hub · WATTLINK');
  });

  it('names every field that is empty and focuses the first one', async () => {
    const fetchMock = stubApi(noHub);
    renderAt('/alat/tambah/hub');

    await userEvent.click(await screen.findByRole('button', { name: 'Hubungkan' }));

    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toHaveAccessibleDescription(
      'Isi kode WATTLINK Hub.',
    );
    expect(screen.getByLabelText('Nama WATTLINK Hub')).toHaveAccessibleDescription(
      'Isi nama WATTLINK Hub.',
    );
    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toHaveFocus();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('says the rules of the code when it has the wrong shape and does not call the API', async () => {
    const fetchMock = stubApi(noHub);
    renderAt('/alat/tambah/hub');

    await fill('K7M2Q9X1', 'Hub pabrik');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toBeInvalid();
    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toHaveFocus();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('asks for a name of at most 40 characters', async () => {
    stubApi(noHub);
    renderAt('/alat/tambah/hub');

    await fill('K7M2Q9XA', 'x'.repeat(41));
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(screen.getByLabelText('Nama WATTLINK Hub')).toHaveAccessibleDescription(
      'Nama paling panjang 40 huruf.',
    );
  });

  it('counts a name by characters, so 21 emoji are allowed', async () => {
    const fetchMock = stubApi({
      ...noHub,
      'POST /v1/gateways': { status: 201, body: sampleGateway },
    });
    renderAt('/alat/tambah/hub');

    await fill('K7M2Q9XA', '\u{1F50C}'.repeat(21));
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    await waitFor(() => {
      expect(bodyOf(fetchMock, '/v1/gateways')).toBeDefined();
    });
  });

  it('does not call a 404 without the code of the API a wrong code', async () => {
    stubApi({ ...noHub, 'POST /v1/gateways': { status: 404 } });
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('Terjadi kesalahan')).toBeVisible();
    expect(screen.queryByText('Kode tidak dikenali')).not.toBeInTheDocument();
  });

  it('sends the code in capital letters without spaces and opens the choice of the kind', async () => {
    const fetchMock = stubApi({
      ...noHub,
      'POST /v1/gateways': { status: 201, body: sampleGateway },
    });
    // Start at the choice, so the empty list is cached and the claim has to fill it
    const router = renderAt('/alat/tambah');
    await screen.findByRole('heading', { level: 1, name: 'Hubungkan WATTLINK Hub' });

    await fill(' k7m2 q9xa ', ' Hub pabrik ');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    // The list of hubs still answers with no hub, so the choice only shows because the claim filled the list
    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeVisible();
    expect(router.state.location.pathname).toBe('/alat/tambah');
    expect(bodyOf(fetchMock, '/v1/gateways')).toEqual({
      claimCode: 'K7M2Q9XA',
      name: 'Hub pabrik',
    });
  });

  it('does nothing when the form is sent again while the call runs', async () => {
    const fetchMock = vi.fn((input: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? new Promise<Response>(() => undefined)
          : new Response(
              JSON.stringify(new URL(input).pathname === '/v1/gateways' ? { items: [] } : null),
            ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), '{Enter}');
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), '{Enter}');

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Sedang menghubungkan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('says that the code is not known, in the banner and in the field, and clears it on edit', async () => {
    stubApi({
      ...noHub,
      'POST /v1/gateways': { status: 404, body: { code: 'claim_code_unknown', message: 'No' } },
    });
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('Kode tidak dikenali')).toBeVisible();
    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toBeInvalid();
    expect(screen.getByLabelText('Kode di layar WATTLINK Hub')).toHaveAccessibleDescription(
      'Huruf besar dan angka 2 sampai 9. Kode berlaku 10 menit.',
    );

    await userEvent.type(screen.getByLabelText('Kode di layar WATTLINK Hub'), 'x');

    expect(screen.queryByText('Kode tidak dikenali')).not.toBeInTheDocument();
  });

  it('says that the hub belongs to another business', async () => {
    stubApi({
      ...noHub,
      'POST /v1/gateways': {
        status: 409,
        body: { code: 'gateway_claimed_elsewhere', message: 'No' },
      },
    });
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('WATTLINK Hub sudah terdaftar')).toBeVisible();
    expect(screen.getByText('WATTLINK Hub ini sudah dipakai usaha lain.')).toBeVisible();
  });

  it('says that the business reached the limit of hubs', async () => {
    stubApi({
      ...noHub,
      'POST /v1/gateways': { status: 409, body: { code: 'too_many_gateways', message: 'No' } },
    });
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('Batas WATTLINK Hub tercapai')).toBeVisible();
    expect(screen.getByText('Satu usaha bisa punya sampai 10 WATTLINK Hub.')).toBeVisible();
  });

  it('holds the button while the API says to wait, and says how long', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const fetchMock = stubApi({
      ...noHub,
      'POST /v1/gateways': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 30 },
      },
    });
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('Terlalu banyak percobaan')).toBeVisible();
    expect(screen.getByText('Coba lagi dalam 30 detik.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hubungkan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('says that the fields are not right when the API refuses them', async () => {
    stubApi({
      ...noHub,
      'POST /v1/gateways': { status: 422, body: { code: 'validation_failed', message: 'No' } },
    });
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('Periksa isian Anda')).toBeVisible();
  });

  it('says that the connection is lost', async () => {
    stubApi(noHub);
    renderAt('/alat/tambah/hub');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
  });

  it('goes back to the list of devices', async () => {
    stubApi(noHub);
    const router = renderAt('/alat/tambah/hub');

    await userEvent.click(await screen.findByRole('link', { name: 'Kembali' }));

    expect(router.state.location.pathname).toBe('/alat');
  });
});

describe('Beri nama alat, with no hub', () => {
  it('offers the hub step when the search says that the business has no hub', async () => {
    stubApi({
      'GET /v1/rooms': { body: { items: [{ id: 'jahit', name: 'Ruang jahit' }] } },
      'POST /v1/pairings': { status: 409, body: { code: 'no_gateway', message: 'No' } },
    });
    const router = renderAt('/alat/tambah');

    await userEvent.click(await screen.findByRole('button', { name: /WATTLINK Plug/ }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Saya setuju data listrik alat ini dibaca' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nama alat' }), 'Mesin');
    await userEvent.click(await screen.findByRole('combobox', { name: 'Ruangan' }));
    await userEvent.click(screen.getByRole('option', { name: 'Ruang jahit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cari alat' }));

    expect(await screen.findByText('WATTLINK Hub belum terhubung')).toBeVisible();

    await userEvent.click(screen.getByRole('link', { name: 'Hubungkan WATTLINK Hub' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/alat/tambah/hub');
    });
  });
});
