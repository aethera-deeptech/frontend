import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { relayKey } from '@/api/relay';
import { sampleNormal } from '@/pages/alat/sample-alat';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const relayBody = (extra: Record<string, unknown> = {}) => ({
  state: 'on',
  reportedAt: '2026-10-29T09:30:00+07:00',
  pending: null,
  last: null,
  schedule: null,
  ...extra,
});
const put = 'PUT /v1/devices/d4/power-loss';
const get = 'GET /v1/devices/d4/relay';
const plug = { 'GET /v1/devices/d4': { body: sampleNormal({ kind: 'plug' }) } };

// A service that stores the pick of a save, so the read after the save shows what was stored
function storingService(extra: Record<string, unknown> = {}) {
  let value = 'off';

  return {
    ...plug,
    [get]: () => ({ body: relayBody({ afterPowerLoss: value, ...extra }) }),
    [put]: () => {
      value = 'last';
      return { body: { afterPowerLoss: 'last' } };
    },
  };
}

function puts(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => new URL(url).pathname.endsWith('/power-loss') && init?.method === 'PUT',
  );
}

async function pick(name: RegExp) {
  await userEvent.click(await screen.findByRole('radio', { name }));
}

async function save() {
  await userEvent.click(screen.getByRole('button', { name: 'Simpan pilihan' }));
}

describe('PowerLossCard', () => {
  it('stays out when the API does not send the choice', async () => {
    stubApi({ ...plug, [get]: { body: relayBody() } });
    renderAt('/alat/d4');

    await screen.findByRole('heading', { name: 'Saklar' });

    expect(
      screen.queryByRole('heading', { name: 'Setelah listrik padam' }),
    ).not.toBeInTheDocument();
  });

  it('stays out when the API sends a value that this version does not know', async () => {
    stubApi({ ...plug, [get]: { body: relayBody({ afterPowerLoss: 'dim' }) } });
    renderAt('/alat/d4');

    expect(await screen.findByRole('heading', { name: 'Saklar' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Setelah listrik padam' }),
    ).not.toBeInTheDocument();
  });

  it('says first that the choice is not active, and shows the value of the service', async () => {
    stubApi({ ...plug, [get]: { body: relayBody({ afterPowerLoss: 'off' }) } });
    renderAt('/alat/d4');

    expect(await screen.findByRole('heading', { name: 'Setelah listrik padam' })).toBeVisible();
    expect(screen.getByText('Belum aktif')).toBeVisible();
    expect(
      screen.getByText(/Pilihan ini baru disimpan, belum dijalankan oleh colokan/),
    ).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Mati sampai Anda nyalakan' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Seperti sebelum listrik padam' })).not.toBeChecked();
  });

  it('warns about a machine that starts by itself, in the description of the option', async () => {
    stubApi({ ...plug, [get]: { body: relayBody({ afterPowerLoss: 'off' }) } });
    renderAt('/alat/d4');

    const last = await screen.findByRole('radio', { name: 'Seperti sebelum listrik padam' });

    expect(last).toHaveAccessibleDescription(
      /Mesin yang menyala bisa menyala sendiri saat listrik kembali/,
    );
  });

  it('does not save until the owner changes the choice, and then saves one field', async () => {
    const fetchMock = stubApi(storingService());
    renderAt('/alat/d4');

    await screen.findByRole('heading', { name: 'Setelah listrik padam' });
    const button = screen.getByRole('button', { name: 'Simpan pilihan' });

    expect(button).toHaveAttribute('aria-disabled', 'true');
    await save();
    expect(puts(fetchMock)).toHaveLength(0);

    await pick(/Seperti sebelum listrik padam/);
    expect(button).not.toHaveAttribute('aria-disabled');
    await save();

    expect(await screen.findByText('Pilihan disimpan')).toBeVisible();
    expect(screen.getByText(/Colokan belum menjalankannya/)).toBeVisible();
    const [call] = puts(fetchMock);

    expect(call?.[1]).toMatchObject({
      method: 'PUT',
      headers: expect.objectContaining({ 'X-Requested-With': 'aethera' }) as unknown,
    });
    const body = call?.[1]?.body;

    expect(typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined).toEqual({
      afterPowerLoss: 'last',
    });
    expect(screen.getByRole('radio', { name: 'Seperti sebelum listrik padam' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Simpan pilihan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps a command that waits and the schedule when the answer is merged in', async () => {
    const pending = {
      id: 'c1',
      action: 'off',
      status: 'pending',
      expiresAt: '2099-10-29T09:40:00+07:00',
    };
    const client = createQueryClient();

    stubApi(storingService({ pending }));
    renderAt('/alat/d4', undefined, { client });
    await pick(/Seperti sebelum listrik padam/);
    await save();
    await screen.findByText('Pilihan disimpan');

    const cached = client.getQueryData<{ pending: unknown; afterPowerLoss: string }>(
      relayKey('d4'),
    );

    expect(cached?.afterPowerLoss).toBe('last');
    expect(cached?.pending).toMatchObject({ id: 'c1' });
  });

  it('keeps the pick while the screen reads again', async () => {
    const client = createQueryClient();

    stubApi({ ...plug, [get]: { body: relayBody({ afterPowerLoss: 'off' }) } });
    renderAt('/alat/d4', undefined, { client });
    await pick(/Seperti sebelum listrik padam/);

    await act(async () => {
      await client.invalidateQueries({ queryKey: relayKey('d4') });
    });

    expect(screen.getByRole('radio', { name: 'Seperti sebelum listrik padam' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Simpan pilihan' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('follows another tab that changed the value when the owner has no pick', async () => {
    const client = createQueryClient();
    let value = 'off';

    stubApi({ ...plug, [get]: () => ({ body: relayBody({ afterPowerLoss: value }) }) });
    renderAt('/alat/d4', undefined, { client });
    await screen.findByRole('heading', { name: 'Setelah listrik padam' });
    value = 'last';

    await act(async () => {
      await client.invalidateQueries({ queryKey: relayKey('d4') });
    });

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Seperti sebelum listrik padam' })).toBeChecked();
    });
  });

  it('drops the news when the owner picks again', async () => {
    stubApi(storingService());
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();
    await screen.findByText('Pilihan disimpan');

    await pick(/Mati sampai Anda nyalakan/);

    expect(screen.queryByText('Pilihan disimpan')).not.toBeInTheDocument();
  });

  it.each([
    ['a busy answer', { status: 503, body: { code: 'busy' } }],
    ['a 500', { status: 500, body: {} }],
  ])('says that it is not sure after %s and keeps the pick', async (_label, answer) => {
    stubApi({
      ...plug,
      [get]: { body: relayBody({ afterPowerLoss: 'off' }) },
      [put]: answer,
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    expect(await screen.findByText('Belum pasti tersimpan')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Seperti sebelum listrik padam' })).toBeChecked();
  });

  it('says that it is not sure after a lost connection', async () => {
    stubApi({ ...plug, [get]: { body: relayBody({ afterPowerLoss: 'off' }) } });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    expect(await screen.findByText('Belum pasti tersimpan')).toBeVisible();
  });

  it('says that the choice is saved when the read after a lost answer shows the value', async () => {
    let reads = 0;

    stubApi({
      ...plug,
      [get]: () => {
        reads += 1;
        return { body: relayBody({ afterPowerLoss: reads === 1 ? 'off' : 'last' }) };
      },
      [put]: { status: 503, body: { code: 'busy' } },
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    expect(await screen.findByText('Pilihan disimpan')).toBeVisible();
    expect(screen.queryByText('Belum pasti tersimpan')).not.toBeInTheDocument();
  });

  it('says that the choice is not saved after a 422', async () => {
    stubApi({
      ...plug,
      [get]: { body: relayBody({ afterPowerLoss: 'off' }) },
      [put]: { status: 422, body: { code: 'validation_failed' } },
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    expect(await screen.findByText('Pilihan belum disimpan')).toBeVisible();
    expect(screen.queryByText('Belum pasti tersimpan')).not.toBeInTheDocument();
  });

  it('shows no banner and leaves the card out when the plug is a clamp or gone', async () => {
    let reads = 0;

    stubApi({
      ...plug,
      [get]: () => {
        reads += 1;
        return reads === 1
          ? { body: relayBody({ afterPowerLoss: 'off' }) }
          : { status: 409, body: { code: 'no_relay' } };
      },
      [put]: { status: 409, body: { code: 'no_relay' } },
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Setelah listrik padam' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Pilihan belum disimpan')).not.toBeInTheDocument();
  });
});

describe('PowerLossCard, the state over time', () => {
  const pending = {
    id: 'c1',
    action: 'off',
    status: 'pending',
    expiresAt: '2099-10-29T09:40:00+07:00',
  };
  const schedule = { enabled: true, offAt: '18:00', onAt: null, days: 'daily' };

  // The service answers as stubApi says, but a read of the relay view after the first one never ends, so the cache shows what the
  // call itself wrote
  function hangingReads(base: ReturnType<typeof stubApi>) {
    let reads = 0;

    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
      const relayRead =
        new URL(input).pathname === '/v1/devices/d4/relay' && (init?.method ?? 'GET') === 'GET';

      if (relayRead) {
        reads += 1;
        if (reads > 1) {
          return new Promise<Response>(() => undefined);
        }
      }
      return base(input, init);
    });
  }

  it('merges the answer into the view and does not replace it', async () => {
    const client = createQueryClient();

    hangingReads(
      stubApi({
        ...plug,
        [get]: { body: relayBody({ afterPowerLoss: 'off', pending, schedule }) },
        [put]: { body: { afterPowerLoss: 'last' } },
      }),
    );
    renderAt('/alat/d4', undefined, { client });
    await pick(/Seperti sebelum listrik padam/);
    await save();

    await waitFor(() => {
      expect(client.getQueryData<{ afterPowerLoss: string }>(relayKey('d4'))?.afterPowerLoss).toBe(
        'last',
      );
    });
    const cached = client.getQueryData<{ pending: unknown; schedule: unknown }>(relayKey('d4'));

    expect(cached?.pending).toMatchObject({ id: 'c1' });
    expect(cached?.schedule).toMatchObject({ offAt: '18:00' });
  });

  it('holds the group and the button while the call runs and sends one call', async () => {
    const base = stubApi({
      ...plug,
      [get]: { body: relayBody({ afterPowerLoss: 'off' }) },
    });
    let puts = 0;

    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
      if (new URL(input).pathname.endsWith('/power-loss') && init?.method === 'PUT') {
        puts += 1;
        return new Promise<Response>(() => undefined);
      }
      return base(input, init);
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    const button = await screen.findByRole('button', { name: 'Sedang menyimpan' });

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('radio', { name: 'Mati sampai Anda nyalakan' })).toBeDisabled();
    await userEvent.click(button);
    expect(puts).toBe(1);
  });

  it('ends the difference when the owner picks the value of the service again', async () => {
    const fetchMock = stubApi(storingService());
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await pick(/Mati sampai Anda nyalakan/);

    expect(screen.getByRole('button', { name: 'Simpan pilihan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await save();
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it('drops the hedge when the owner picks again after an open answer', async () => {
    stubApi({
      ...plug,
      [get]: { body: relayBody({ afterPowerLoss: 'off' }) },
      [put]: { status: 503, body: { code: 'busy' } },
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();
    await screen.findByText('Belum pasti tersimpan');

    await pick(/Mati sampai Anda nyalakan/);

    expect(screen.queryByText('Belum pasti tersimpan')).not.toBeInTheDocument();
  });

  it.each([
    ['a 403', { status: 403, body: { code: 'csrf_header_missing' } }],
    ['a 400', { status: 400, body: { code: 'invalid_json' } }],
  ])('says that the choice is not saved after %s', async (_label, answer) => {
    stubApi({
      ...plug,
      [get]: { body: relayBody({ afterPowerLoss: 'off' }) },
      [put]: answer,
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();

    expect(await screen.findByText('Pilihan belum disimpan')).toBeVisible();
  });

  it('saves after a failure with the same pick', async () => {
    let calls = 0;
    let value = 'off';

    stubApi({
      ...plug,
      [get]: () => ({ body: relayBody({ afterPowerLoss: value }) }),
      [put]: () => {
        calls += 1;
        if (calls === 1) {
          return { status: 422, body: { code: 'validation_failed' } };
        }
        value = 'last';
        return { body: { afterPowerLoss: 'last' } };
      },
    });
    renderAt('/alat/d4');
    await pick(/Seperti sebelum listrik padam/);
    await save();
    await screen.findByText('Pilihan belum disimpan');
    await save();

    expect(await screen.findByText('Pilihan disimpan')).toBeVisible();
    expect(screen.queryByText('Pilihan belum disimpan')).not.toBeInTheDocument();
  });

  it('ends the news of a save when another tab changes the value later', async () => {
    const client = createQueryClient();
    let value = 'off';

    stubApi({
      ...plug,
      [get]: () => ({ body: relayBody({ afterPowerLoss: value }) }),
      [put]: () => {
        value = 'last';
        return { body: { afterPowerLoss: 'last' } };
      },
    });
    renderAt('/alat/d4', undefined, { client });
    await pick(/Seperti sebelum listrik padam/);
    await save();
    await screen.findByText('Pilihan disimpan');
    value = 'off';

    await act(async () => {
      await client.invalidateQueries({ queryKey: relayKey('d4') });
    });

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Mati sampai Anda nyalakan' })).toBeChecked();
    });
    expect(screen.queryByText('Pilihan disimpan')).not.toBeInTheDocument();
  });

  it('does not keep the hedge when another tab changes the value after a read showed the pick', async () => {
    const client = createQueryClient();
    let value = 'off';

    stubApi({
      ...plug,
      [get]: () => ({ body: relayBody({ afterPowerLoss: value }) }),
      [put]: () => {
        // The service stored the value and the answer was lost
        value = 'last';
        return { status: 503, body: { code: 'busy' } };
      },
    });
    renderAt('/alat/d4', undefined, { client });
    await pick(/Seperti sebelum listrik padam/);
    await save();
    await screen.findByText('Pilihan disimpan');
    value = 'off';

    await act(async () => {
      await client.invalidateQueries({ queryKey: relayKey('d4') });
    });

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Mati sampai Anda nyalakan' })).toBeChecked();
    });
    expect(screen.queryByText('Belum pasti tersimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Pilihan disimpan')).not.toBeInTheDocument();
  });
});
