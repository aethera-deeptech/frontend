import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { relayKey, type Relay } from '@/api/relay';
import { RelayCardView } from '@/pages/alat/relay-card';
import { sampleNormal } from '@/pages/alat/sample-alat';
import { sampleRelay } from '@/pages/alat/sample-relay';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

// The clock of the business at 09:32, two minutes after the plug reported
const now = new Date(2026, 9, 29, 9, 32);

function renderCard(relay: Relay, props: Partial<Parameters<typeof RelayCardView>[0]> = {}) {
  const onSend = vi.fn();

  render(
    <RelayCardView
      relay={relay}
      offline={false}
      now={now}
      sending={false}
      sendFailed={false}
      waitSeconds={0}
      onSend={onSend}
      {...props}
    />,
  );
  return onSend;
}

describe('RelayCardView, the state of the plug', () => {
  it('says that the plug is on, when the plug said so, and offers to switch it off', async () => {
    const onSend = renderCard(sampleRelay());

    expect(screen.getByRole('heading', { level: 2, name: 'Saklar' })).toBeVisible();
    expect(screen.getByText('Menyala')).toBeVisible();
    expect(screen.getByText('Status dari alat pukul 09:30')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Nyalakan' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Matikan' }));

    expect(onSend).toHaveBeenCalledWith('off');
  });

  it('says that the plug is off and offers to switch it on', async () => {
    const onSend = renderCard(sampleRelay({ state: 'off' }));

    expect(screen.getByText('Mati')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Matikan' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Nyalakan' }));

    expect(onSend).toHaveBeenCalledWith('on');
  });

  it('offers both when the plug never said its state', () => {
    renderCard(sampleRelay({ state: 'unknown', reportedAt: null }));

    expect(screen.getByText('Belum diketahui')).toBeVisible();
    expect(screen.getByText('Alat belum pernah melapor status saklar.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nyalakan' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Matikan' })).toBeVisible();
  });

  it('names the schedule when the schedule made the last switch', () => {
    renderCard(
      sampleRelay({
        state: 'off',
        last: {
          action: 'off',
          status: 'applied',
          source: 'schedule',
          at: '2026-10-29T17:30:00+07:00',
        },
      }),
    );

    expect(screen.getByText('Terakhir diganti oleh jadwal pukul 17:30.')).toBeVisible();
  });
});

describe('RelayCardView, a command on its way', () => {
  const pending = {
    id: 'c1',
    action: 'off',
    status: 'pending',
    expiresAt: '2026-10-29T09:40:00+07:00',
  } as const;

  it('says that the plug is waited for and holds the buttons', async () => {
    const onSend = renderCard(sampleRelay({ pending }));

    expect(screen.getByText('Menunggu alat')).toBeVisible();
    expect(
      screen.getByText(
        'Perintah Matikan dikirim. Alat menjalankannya saat terhubung ke WATTLINK Hub, paling lama sampai 09:40.',
      ),
    ).toBeVisible();

    const button = screen.getByRole('button', { name: 'Matikan' });
    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('holds the buttons while the command is sent', async () => {
    const onSend = renderCard(sampleRelay(), { sending: true });

    await userEvent.click(screen.getByRole('button', { name: 'Matikan' }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('says how long to wait after too many commands', async () => {
    const onSend = renderCard(sampleRelay(), { waitSeconds: 700 });

    expect(screen.getByText('Terlalu banyak perintah')).toBeVisible();
    expect(screen.getByText(/dalam 12\smenit\./)).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Matikan' }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('says that the command did not reach the service', () => {
    renderCard(sampleRelay(), { sendFailed: true });

    expect(screen.getByRole('alert')).toHaveTextContent('Perintah belum terkirim');
  });

  it('says what happens to a command for a plug that does not answer', () => {
    renderCard(sampleRelay(), { offline: true });

    expect(
      screen.getByText(
        'Alat tidak terhubung. Jika Anda menekan Matikan, perintah menunggu sampai alat terhubung kembali, paling lama 10 menit.',
      ),
    ).toBeVisible();
  });

  it('names both buttons for an offline plug of an unknown state', () => {
    renderCard(sampleRelay({ state: 'unknown', reportedAt: null }), { offline: true });

    expect(screen.getByText(/menekan Nyalakan atau Matikan,/)).toBeVisible();
  });
});

describe('RelayCardView, the result of the last command', () => {
  it('says that the plug was switched off', () => {
    renderCard(
      sampleRelay({
        state: 'off',
        last: {
          action: 'off',
          status: 'applied',
          source: 'owner',
          at: '2026-10-29T09:31:00+07:00',
        },
      }),
    );

    expect(screen.getByText('Colokan sudah dimatikan')).toBeVisible();
    expect(screen.getByText('Pukul 09:31.')).toBeVisible();
  });

  it('says that the plug was switched on', () => {
    renderCard(
      sampleRelay({
        last: { action: 'on', status: 'applied', source: 'owner', at: '2026-10-29T09:31:00+07:00' },
      }),
    );

    expect(screen.getByText('Colokan sudah dinyalakan')).toBeVisible();
  });

  it('says that the hub could not switch the plug', () => {
    renderCard(
      sampleRelay({
        last: { action: 'off', status: 'failed', source: 'owner', at: '2026-10-29T09:31:00+07:00' },
      }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Colokan belum berganti');
  });

  it('says that nobody fetched the command and what the plug did last', () => {
    renderCard(
      sampleRelay({
        last: {
          action: 'off',
          status: 'expired',
          source: 'owner',
          at: '2026-10-29T09:31:00+07:00',
        },
      }),
    );

    expect(screen.getByText('Perintah tidak sampai')).toBeVisible();
    expect(
      screen.getByText(
        'Alat tidak menerima perintah dalam 10 menit. Menurut status terakhir, colokan masih menyala. Periksa sambungan WATTLINK Hub, lalu coba lagi.',
      ),
    ).toBeVisible();
  });

  it('leaves out the claim about the plug when its state is not known', () => {
    renderCard(
      sampleRelay({
        state: 'unknown',
        reportedAt: null,
        last: {
          action: 'off',
          status: 'expired',
          source: 'owner',
          at: '2026-10-29T09:31:00+07:00',
        },
      }),
    );

    expect(screen.queryByText(/Menurut status terakhir/)).not.toBeInTheDocument();
  });

  it('keeps a result that the screen saw appear, whatever the clock of the phone says', () => {
    renderCard(
      sampleRelay({
        last: {
          action: 'off',
          status: 'applied',
          source: 'owner',
          at: '2026-10-29T08:00:00+07:00',
        },
      }),
      { resultIsNew: true },
    );

    expect(screen.getByText('Colokan sudah dimatikan')).toBeVisible();
  });

  it('drops a result that is no longer news', () => {
    renderCard(
      sampleRelay({
        last: {
          action: 'off',
          status: 'applied',
          source: 'owner',
          at: '2026-10-29T08:00:00+07:00',
        },
      }),
    );

    expect(screen.queryByText(/Colokan sudah/)).not.toBeInTheDocument();
  });

  it('shows no result while a newer command waits', () => {
    renderCard(
      sampleRelay({
        pending: {
          id: 'c2',
          action: 'on',
          status: 'sent',
          expiresAt: '2026-10-29T09:41:00+07:00',
        },
        last: { action: 'off', status: 'failed', source: 'owner', at: '2026-10-29T09:31:00+07:00' },
      }),
    );

    expect(screen.queryByText('Colokan belum berganti')).not.toBeInTheDocument();
    expect(screen.getByText('Menunggu alat')).toBeVisible();
  });
});

describe('RelayCard on the page of a device', () => {
  const relayBody = {
    state: 'on',
    reportedAt: '2026-10-29T09:30:00+07:00',
    pending: null,
    last: null,
    schedule: null,
  };

  it('leaves the card out for a device that has no switch', async () => {
    stubApi({ 'GET /v1/devices/d4': { body: sampleNormal() } });
    renderAt('/alat/d4');

    await screen.findByRole('heading', { name: 'Info alat' });

    expect(screen.queryByRole('heading', { name: 'Saklar' })).not.toBeInTheDocument();
  });

  it('shows the card for a plug and switches it off', async () => {
    let sent = false;
    const pending = {
      id: 'c1',
      action: 'off',
      status: 'pending',
      expiresAt: '2099-10-29T09:40:00+07:00',
    };
    const fetchMock = stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      // After the command the service holds it until a gateway fetches it
      'GET /v1/devices/d4/relay': () => ({
        body: { ...relayBody, pending: sent ? pending : null },
      }),
      'POST /v1/devices/d4/relay': () => {
        sent = true;
        return { status: 202, body: pending };
      },
    });
    renderAt('/alat/d4');

    await userEvent.click(await screen.findByRole('button', { name: 'Matikan' }));

    expect(await screen.findByText('Menunggu alat')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/devices/d4/relay',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ state: 'off' }) }),
    );
    expect(screen.getByRole('button', { name: 'Matikan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('says how long to wait when the service has had too many commands', async () => {
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      'GET /v1/devices/d4/relay': { body: relayBody },
      'POST /v1/devices/d4/relay': {
        status: 429,
        body: { code: 'rate_limited', retryAfterSeconds: 700 },
      },
    });
    renderAt('/alat/d4');

    await userEvent.click(await screen.findByRole('button', { name: 'Matikan' }));

    expect(await screen.findByText('Terlalu banyak perintah')).toBeVisible();
    expect(screen.getByText(/dalam 12\smenit\./)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Matikan' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('says that the command did not go out when the connection fails', async () => {
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      'GET /v1/devices/d4/relay': { body: relayBody },
    });
    renderAt('/alat/d4');

    await userEvent.click(await screen.findByRole('button', { name: 'Matikan' }));

    expect(await screen.findByText('Perintah belum terkirim')).toBeVisible();
  });

  it('tells the owner when the switch cannot be read and reads again on request', async () => {
    let calls = 0;
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      'GET /v1/devices/d4/relay': () => {
        calls += 1;
        return calls === 1 ? { status: 500 } : { body: relayBody };
      },
    });
    renderAt('/alat/d4');

    await userEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Matikan' })).toBeVisible();
    });
    expect(calls).toBe(2);
  });

  it('shows the card of an offline plug with the line about the wait', async () => {
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal({ status: 'offline' }) },
      'GET /v1/devices/d4/relay': { body: relayBody },
    });
    renderAt('/alat/d4');

    expect(
      await screen.findByText(/Alat tidak terhubung\. Jika Anda menekan Matikan/),
    ).toBeVisible();
  });

  it('says a minute when the service gives no wait time with the 429', async () => {
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      'GET /v1/devices/d4/relay': { body: relayBody },
      'POST /v1/devices/d4/relay': { status: 429, body: { code: 'rate_limited' } },
    });
    renderAt('/alat/d4');

    await userEvent.click(await screen.findByRole('button', { name: 'Matikan' }));

    expect(await screen.findByText(/dalam 1\smenit\./)).toBeVisible();
  });

  it('leaves the card out when the command finds that the plug is gone', async () => {
    let gone = false;
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      'GET /v1/devices/d4/relay': () =>
        gone ? { status: 409, body: { code: 'no_relay' } } : { body: relayBody },
      'POST /v1/devices/d4/relay': () => {
        gone = true;
        return { status: 409, body: { code: 'no_relay' } };
      },
    });
    renderAt('/alat/d4');

    await userEvent.click(await screen.findByRole('button', { name: 'Matikan' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Saklar' })).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Perintah belum terkirim')).not.toBeInTheDocument();
  });

  it('leaves the card out when a later read finds that the plug is gone', async () => {
    let gone = false;
    const client = createQueryClient();
    stubApi({
      'GET /v1/devices/d4': { body: sampleNormal() },
      'GET /v1/devices/d4/relay': () => (gone ? { status: 404 } : { body: relayBody }),
    });
    renderAt('/alat/d4', undefined, { client });

    await screen.findByRole('button', { name: 'Matikan' });
    gone = true;
    await act(async () => {
      await client.invalidateQueries({ queryKey: relayKey('d4') });
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Saklar' })).not.toBeInTheDocument();
    });
  });
});
