import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { gatewaysKey } from '@/api/gateways';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const minutesAgo = (count: number) => new Date(Date.now() - count * 60_000).toISOString();

const working = { id: 'g1', name: 'Hub pabrik', lastSeenAt: minutesAgo(3), keyRevoked: false };
const quiet = { id: 'g2', name: 'Hub gudang', lastSeenAt: minutesAgo(180), keyRevoked: false };
const cut = { id: 'g3', name: 'Hub lama', lastSeenAt: minutesAgo(60 * 24 * 5), keyRevoked: true };

function list(...items: unknown[]) {
  return { 'GET /v1/gateways': { body: { items } } };
}

async function rowOf(name: string) {
  const row = (await screen.findByText(name)).closest('li');

  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

describe('WATTLINK Hub list', () => {
  it('is reached from the menu and goes back to it', async () => {
    stubApi(list(working));
    const router = renderAt('/lainnya');

    await userEvent.click(await screen.findByRole('link', { name: /WATTLINK Hub/ }));

    expect(router.state.location.pathname).toBe('/lainnya/hub');
    expect(await screen.findByRole('heading', { level: 1, name: 'WATTLINK Hub' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/lainnya');
  });

  it('tells a hub that sends data from one that is quiet and from one that has to be connected again', async () => {
    stubApi(list(working, quiet, cut));
    renderAt('/lainnya/hub');

    const ok = await rowOf('Hub pabrik');
    const idle = await rowOf('Hub gudang');
    const stopped = await rowOf('Hub lama');

    expect(ok).toHaveTextContent('Terhubung');
    expect(ok).toHaveTextContent('Data terakhir masuk beberapa menit lalu.');
    expect(idle).toHaveTextContent('Tidak terhubung');
    expect(idle).toHaveTextContent('Data terakhir masuk 3 jam lalu.');
    expect(stopped).toHaveTextContent('Perlu dihubungkan lagi');
    // A cut hub has no "last data" line, because the time says nothing about a hub that cannot send
    expect(stopped).not.toHaveTextContent('Data terakhir masuk');
    expect(stopped).toHaveTextContent('tidak mengirim data sampai Anda menghubungkannya lagi');
    // The one that needs the owner comes first, the rest keep the order of the service
    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
    const order = ['Hub lama', 'Hub pabrik', 'Hub gudang'].map((name) =>
      names.findIndex((text) => text.startsWith(name)),
    );

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index >= 0)).toBe(true);
  });

  it('reads a backend that does not send keyRevoked yet as a hub that is not cut', async () => {
    stubApi(list({ id: 'g1', name: 'Hub pabrik', lastSeenAt: minutesAgo(2) }));
    renderAt('/lainnya/hub');

    expect(await rowOf('Hub pabrik')).toHaveTextContent('Terhubung');
  });

  it('does not call a hub with a time that is not a moment connected', async () => {
    stubApi(list({ id: 'g1', name: 'Hub pabrik', lastSeenAt: 'kemarin', keyRevoked: false }));
    renderAt('/lainnya/hub');

    expect(await rowOf('Hub pabrik')).toHaveTextContent('Tidak terhubung');
  });

  it('shows an empty list with the way to connect the first hub', async () => {
    stubApi(list());
    renderAt('/lainnya/hub');

    expect(await screen.findByText('Belum ada WATTLINK Hub di usaha ini.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Hubungkan WATTLINK Hub' })).toHaveAttribute(
      'href',
      '/alat/tambah/hub',
    );
  });

  it('hides the link to add a hub at the limit and says why', async () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({
      id: `g${index.toString()}`,
      name: `Hub ${index.toString()}`,
      lastSeenAt: minutesAgo(1),
      keyRevoked: false,
    }));

    stubApi(list(...ten));
    renderAt('/lainnya/hub');

    expect(await screen.findByText('Satu usaha bisa punya sampai 10 WATTLINK Hub.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Hubungkan WATTLINK Hub' })).not.toBeInTheDocument();
  });

  it('shows the link to add a hub under a list that has room', async () => {
    stubApi(list(working));
    renderAt('/lainnya/hub');

    await rowOf('Hub pabrik');

    expect(screen.getByRole('link', { name: 'Hubungkan WATTLINK Hub' })).toBeVisible();
  });

  it('says that the list cannot be read and tries again on the button', async () => {
    let calls = 0;

    stubApi({
      'GET /v1/gateways': () => {
        calls += 1;
        return calls === 1 ? { status: 500, body: {} } : { body: { items: [working] } };
      },
    });
    renderAt('/lainnya/hub');

    expect(await screen.findByText('Daftar WATTLINK Hub tidak bisa dimuat')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await rowOf('Hub pabrik')).toBeVisible();
  });

  it('says that the system is busy when the list answers 503 busy', async () => {
    stubApi({ 'GET /v1/gateways': { status: 503, body: { code: 'busy' } } });
    renderAt('/lainnya/hub');

    expect(await screen.findByText('Daftar WATTLINK Hub tidak bisa dimuat')).toBeVisible();
    expect(screen.getByText(/Sistem sedang sibuk/)).toBeVisible();
  });
});

describe('Connecting a hub from the list', () => {
  const claimed = { id: 'g3', name: 'Hub lama', lastSeenAt: cut.lastSeenAt, keyRevoked: false };

  async function connectAgain(name?: string) {
    const link = within(await rowOf('Hub lama')).getByRole('link', {
      name: 'Hubungkan lagi Hub lama',
    });

    await userEvent.click(link);
    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    if (name !== undefined) {
      const field = screen.getByLabelText('Nama WATTLINK Hub');

      await userEvent.clear(field);
      await userEvent.type(field, name);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));
  }

  it('opens the claim page with the name of the hub and leads back to the list', async () => {
    stubApi(list(working, cut));
    const router = renderAt('/lainnya/hub');

    await userEvent.click(
      within(await rowOf('Hub lama')).getByRole('link', { name: 'Hubungkan lagi Hub lama' }),
    );

    expect(router.state.location.pathname).toBe('/alat/tambah/hub');
    expect(await screen.findByLabelText('Nama WATTLINK Hub')).toHaveValue('Hub lama');
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/lainnya/hub');
  });

  it('returns to the list with the hub connected when the code is the one of the same hub', async () => {
    stubApi({
      ...list(working, cut),
      'POST /v1/gateways': { status: 201, body: claimed },
    });
    const router = renderAt('/lainnya/hub');

    await connectAgain();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lainnya/hub');
    });
    expect(await screen.findByText('WATTLINK Hub terhubung lagi')).toBeVisible();
    // The hub is on the list once, and it is no longer cut
    const row = await rowOf('Hub lama');

    expect(row).not.toHaveTextContent('Perlu dihubungkan lagi');
    // The time of the hub has not moved since the claim, so no batch of the new key has arrived
    expect(row).toHaveTextContent('Menunggu data');
    expect(screen.getAllByText('Hub lama')).toHaveLength(1);
    // The news leaves the history, so the way Back or a reload does not show it again
    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
  });

  it('says that the hub is a new one when the code is the one of another hub', async () => {
    stubApi({
      ...list(cut),
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g9', name: 'Hub baru', lastSeenAt: minutesAgo(0), keyRevoked: false },
      },
    });
    renderAt('/lainnya/hub');

    await connectAgain('Hub baru');

    expect(await screen.findByText('Ini WATTLINK Hub baru')).toBeVisible();
    // The banner and the words for a screen reader both carry the sentence
    expect(
      screen.getAllByText(/WATTLINK Hub yang tadi masih perlu dihubungkan lagi/).length,
    ).toBeGreaterThan(0);
    // The cut hub stays cut next to the new one
    expect(await rowOf('Hub lama')).toHaveTextContent('Perlu dihubungkan lagi');
    expect(await rowOf('Hub baru')).toBeVisible();
  });

  it('leads back to the list after a hub is added with the link under the list', async () => {
    stubApi({
      ...list(working),
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g8', name: 'Hub kantor', lastSeenAt: minutesAgo(0), keyRevoked: false },
      },
    });
    const router = renderAt('/lainnya/hub');

    await userEvent.click(await screen.findByRole('link', { name: 'Hubungkan WATTLINK Hub' }));
    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), 'Hub kantor');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('WATTLINK Hub dihubungkan')).toBeVisible();
    expect(router.state.location.pathname).toBe('/lainnya/hub');
    expect(await rowOf('Hub kantor')).toBeVisible();
  });

  it('keeps the way of the first step when the claim page is not opened from the list', async () => {
    stubApi({
      ...list(),
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g8', name: 'Hub kantor', lastSeenAt: minutesAgo(0), keyRevoked: false },
      },
    });
    const router = renderAt('/alat/tambah/hub');

    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), 'Hub kantor');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/alat/tambah');
    });
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/alat');
  });
});

describe('Tambah alat with a cut hub', () => {
  it('blocks the choice when every hub is cut and leads to the claim page', async () => {
    stubApi(list(cut, { ...cut, id: 'g4', name: 'Hub lama dua' }));
    renderAt('/alat/tambah');

    expect(await screen.findByText('WATTLINK Hub perlu dihubungkan lagi')).toBeVisible();
    expect(screen.queryByRole('button', { name: /WATTLINK Plug/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hubungkan WATTLINK Hub' })).toHaveAttribute(
      'href',
      '/alat/tambah/hub',
    );
  });

  it('opens the choice again after a hub is connected from the block', async () => {
    stubApi({
      ...list(cut),
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g3', name: 'Hub lama', lastSeenAt: cut.lastSeenAt, keyRevoked: false },
      },
    });
    renderAt('/alat/tambah');

    await userEvent.click(await screen.findByRole('link', { name: 'Hubungkan WATTLINK Hub' }));
    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), 'Hub lama');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeVisible();
  });

  it('keeps the choice and warns when only some of the hubs are cut', async () => {
    stubApi(list(working, cut));
    renderAt('/alat/tambah');

    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeVisible();
    expect(screen.getByText('Ada WATTLINK Hub yang perlu dihubungkan lagi')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lihat WATTLINK Hub' })).toHaveAttribute(
      'href',
      '/lainnya/hub',
    );
  });

  it('shows no warning when no hub is cut', async () => {
    stubApi(list(working));
    renderAt('/alat/tambah');

    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeVisible();
    expect(screen.queryByText(/perlu dihubungkan lagi/)).not.toBeInTheDocument();
  });
});

describe('State that a visit brings', () => {
  it.each([
    ['a text', 'selesai'],
    ['an empty object', {}],
    ['a claim that is not an object', { claimed: 'ya' }],
    ['a claim with no name', { claimed: { kind: 'again' } }],
    ['a claim with a name that is not a text', { claimed: { name: 5, kind: 'again' } }],
    ['a claim with no kind', { claimed: { name: 'Hub lama' } }],
    ['a claim with a kind that is not known', { claimed: { name: 'Hub lama', kind: 'lain' } }],
  ])('shows no news for %s', async (_label, state) => {
    stubApi(list(working));
    renderAt('/lainnya/hub', state);

    await rowOf('Hub pabrik');

    expect(screen.queryByText('WATTLINK Hub terhubung lagi')).not.toBeInTheDocument();
    expect(screen.queryByText('Ini WATTLINK Hub baru')).not.toBeInTheDocument();
    expect(screen.queryByText('WATTLINK Hub dihubungkan')).not.toBeInTheDocument();
  });

  it.each([
    ['a text', 'selesai'],
    ['an empty object', {}],
    ['a flag that is not true', { fromHubList: 'ya', hubName: 'Hub lama' }],
  ])('does not take %s for the way of the hub list on the claim page', async (_label, state) => {
    stubApi(list(working));
    renderAt('/alat/tambah/hub', state);

    expect(await screen.findByLabelText('Nama WATTLINK Hub')).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/alat');
  });

  it('ignores a hub id or a hub name on the claim page that is not a text', async () => {
    stubApi(list(working));
    renderAt('/alat/tambah/hub', { fromHubList: true, hubId: 7, hubName: 9 });

    expect(await screen.findByLabelText('Nama WATTLINK Hub')).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/lainnya/hub');
  });
});

describe('The state of a hub over time', () => {
  it('uses the limit of 15 minutes', async () => {
    stubApi(
      list(
        { id: 'a', name: 'Hub empat belas', lastSeenAt: minutesAgo(14), keyRevoked: false },
        { id: 'b', name: 'Hub enam belas', lastSeenAt: minutesAgo(16), keyRevoked: false },
      ),
    );
    renderAt('/lainnya/hub');

    expect(await rowOf('Hub empat belas')).toHaveTextContent('Terhubung');
    expect(await rowOf('Hub enam belas')).toHaveTextContent('Tidak terhubung');
  });

  it('counts a time that is ahead of the clock of this device as connected', async () => {
    stubApi(
      list({
        id: 'a',
        name: 'Hub depan',
        lastSeenAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        keyRevoked: false,
      }),
    );
    renderAt('/lainnya/hub');

    expect(await rowOf('Hub depan')).toHaveTextContent('Terhubung');
  });

  it('says that a hub that was just claimed waits for its first data, and calls it connected once its time moves', async () => {
    const claimedAt = minutesAgo(0);
    let reads = 0;

    stubApi({
      'GET /v1/gateways': () => {
        reads += 1;
        return {
          body: {
            items:
              reads === 1
                ? [working]
                : [
                    working,
                    { id: 'g8', name: 'Hub kantor', lastSeenAt: minutesAgo(1), keyRevoked: false },
                  ],
          },
        };
      },
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g8', name: 'Hub kantor', lastSeenAt: claimedAt, keyRevoked: false },
      },
    });
    const client = createQueryClient();

    renderAt('/lainnya/hub', undefined, { client });
    await userEvent.click(await screen.findByRole('link', { name: 'Hubungkan WATTLINK Hub' }));
    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), 'Hub kantor');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    const row = await rowOf('Hub kantor');

    expect(row).toHaveTextContent('Menunggu data');
    expect(row).toHaveTextContent('Data pertama belum masuk');
    expect(row).not.toHaveTextContent('Data terakhir masuk');

    await act(async () => {
      await client.invalidateQueries({ queryKey: gatewaysKey });
    });

    await waitFor(() => {
      expect(screen.getByText('Hub kantor').closest('li')).toHaveTextContent('Terhubung');
    });
    expect(screen.getByText('Hub kantor').closest('li')).not.toHaveTextContent('Menunggu data');
  });

  it('keeps the rows and shows the error above them when a new read fails', async () => {
    let reads = 0;

    stubApi({
      'GET /v1/gateways': () => {
        reads += 1;
        return reads === 1 ? { body: { items: [working] } } : { status: 500, body: {} };
      },
    });
    const client = createQueryClient();

    renderAt('/lainnya/hub', undefined, { client });
    await rowOf('Hub pabrik');
    await act(async () => {
      await client.invalidateQueries({ queryKey: gatewaysKey });
    });

    expect(await screen.findByText('Daftar WATTLINK Hub tidak bisa dimuat')).toBeVisible();
    expect(await rowOf('Hub pabrik')).toBeVisible();
  });
});

describe('Connecting a hub that the list already had', () => {
  it('says that it is connected again, also when the owner came from the link under the list', async () => {
    stubApi({
      ...list(working, cut),
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g3', name: 'Hub lama', lastSeenAt: cut.lastSeenAt, keyRevoked: false },
      },
    });
    renderAt('/lainnya/hub');

    await userEvent.click(await screen.findByRole('link', { name: 'Hubungkan WATTLINK Hub' }));
    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    await userEvent.type(screen.getByLabelText('Nama WATTLINK Hub'), 'Hub lama');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('WATTLINK Hub terhubung lagi')).toBeVisible();
    expect(screen.queryByText('WATTLINK Hub dihubungkan')).not.toBeInTheDocument();
  });

  it('does not call the hub new when the owner came from a cut hub and typed the code of a hub that was on the list', async () => {
    stubApi({
      ...list(working, cut),
      'POST /v1/gateways': {
        status: 201,
        body: { id: 'g1', name: 'Hub pabrik', lastSeenAt: working.lastSeenAt, keyRevoked: false },
      },
    });
    renderAt('/lainnya/hub');

    await userEvent.click(
      within(await rowOf('Hub lama')).getByRole('link', { name: 'Hubungkan lagi Hub lama' }),
    );
    await userEvent.type(await screen.findByLabelText('Kode di layar WATTLINK Hub'), 'K7M2Q9XA');
    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan' }));

    expect(await screen.findByText('WATTLINK Hub terhubung lagi')).toBeVisible();
    expect(screen.queryByText('Ini WATTLINK Hub baru')).not.toBeInTheDocument();
  });
});
