import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleDevices, sampleNormal } from '@/pages/alat/sample-alat';
import { sampleRelay } from '@/pages/alat/sample-relay';
import { renderAt, stubApi } from '@/test/stub-api';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const schedule = { enabled: true, offAt: '17:30', onAt: '08:00', days: 'mon-fri' };

function answers(relay = sampleRelay()) {
  return {
    'GET /v1/devices': { body: sampleDevices() },
    'GET /v1/devices/d4': { body: sampleNormal() },
    'GET /v1/devices/d4/relay': { body: relay },
  };
}

describe('the card Jadwal harian', () => {
  it('offers to set a schedule when the plug has none', async () => {
    stubApi(answers());
    renderAt('/alat/d4');

    expect(await screen.findByText('Belum ada jadwal')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Atur jadwal' })).toHaveAttribute(
      'href',
      '/alat/d4/jadwal',
    );
  });

  it('shows the times and the days of the schedule with a link to change them', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule } })));
    renderAt('/alat/d4');

    expect(await screen.findByText('Mati pukul 17:30, nyala pukul 08:00')).toBeVisible();
    expect(screen.getByText('Senin sampai Jumat')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ubah jadwal' })).toHaveAttribute(
      'href',
      '/alat/d4/jadwal',
    );
    expect(screen.queryByText('Dijeda')).not.toBeInTheDocument();
  });

  it('names the part that is left out when the plug has no on time', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule, onAt: null } })));
    renderAt('/alat/d4');

    expect(await screen.findByText('Mati pukul 17:30')).toBeVisible();
  });

  it('says that a paused schedule does not run', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule, enabled: false } })));
    renderAt('/alat/d4');

    expect(await screen.findByText('Dijeda')).toBeVisible();
    expect(screen.getByText('Jadwal tidak berjalan.')).toBeVisible();
  });

  it('says what was saved when the form sends the owner back', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule } })));
    renderAt('/alat/d4', { scheduleSaved: schedule });

    expect(await screen.findByText('Jadwal tersimpan')).toBeVisible();
    expect(
      screen.getByText('Colokan mati pukul 17:30 dan nyala pukul 08:00, Senin sampai Jumat.'),
    ).toBeVisible();
  });

  it('says that a saved schedule without an on time only switches off', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule, onAt: null, days: 'daily' } })));
    renderAt('/alat/d4', { scheduleSaved: { ...schedule, onAt: null, days: 'daily' } });

    expect(await screen.findByText('Colokan mati pukul 17:30, Setiap hari.')).toBeVisible();
  });

  it('says that a saved paused schedule does not switch', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule, enabled: false } })));
    renderAt('/alat/d4', { scheduleSaved: { ...schedule, enabled: false } });

    expect(
      await screen.findByText(
        'Jadwal dijeda. Jam tersimpan, tetapi colokan tidak berganti sendiri.',
      ),
    ).toBeVisible();
  });

  it('says that the schedule was removed', async () => {
    stubApi(answers());
    renderAt('/alat/d4', { scheduleRemoved: true });

    expect(await screen.findByText('Jadwal dihapus')).toBeVisible();
    expect(screen.getByText('Colokan tidak lagi mati dan nyala sendiri.')).toBeVisible();
  });

  it('ignores a history state that is not from the form', async () => {
    stubApi(answers());
    renderAt('/alat/d4', { scheduleSaved: { offAt: 'late' } });

    await screen.findByText('Belum ada jadwal');
    expect(screen.queryByText('Jadwal tersimpan')).not.toBeInTheDocument();
  });
});

describe('the form of the schedule', () => {
  it('starts a new schedule at 17:00 on weekdays and sends it without an on time', async () => {
    let saved = false;
    const fetchMock = stubApi({
      ...answers(),
      'PUT /v1/devices/d4/schedule': () => {
        saved = true;
        return { body: { enabled: true, offAt: '17:00', onAt: null, days: 'mon-fri' } };
      },
    });
    renderAt('/alat/d4/jadwal');

    expect(await screen.findByRole('heading', { level: 1, name: 'Atur jadwal' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Mati pukul' })).toHaveTextContent('17:00');
    expect(screen.getByText('Jam mengikuti zona waktu usaha Anda, WIB.')).toBeVisible();
    expect(screen.queryByRole('checkbox', { name: 'Jadwal berjalan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus jadwal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Nyala pukul' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Senin sampai Jumat' })).toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Jadwal tersimpan')).toBeVisible();
    expect(saved).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/devices/d4/schedule',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ offAt: '17:00', onAt: null, days: 'mon-fri', enabled: true }),
      }),
    );
    expect(screen.getByText('Colokan mati pukul 17:00, Senin sampai Jumat.')).toBeVisible();
  });

  it('asks for an on time behind its checkbox and sends the days that the owner picks', async () => {
    const fetchMock = stubApi({
      ...answers(),
      'PUT /v1/devices/d4/schedule': {
        body: { enabled: true, offAt: '17:00', onAt: '08:00', days: 'daily' },
      },
    });
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Nyalakan lagi otomatis' }));
    expect(screen.getByRole('combobox', { name: 'Nyala pukul' })).toHaveTextContent('08:00');
    await userEvent.click(screen.getByRole('radio', { name: 'Setiap hari' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await screen.findByText('Jadwal tersimpan');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/devices/d4/schedule',
      expect.objectContaining({
        body: JSON.stringify({ offAt: '17:00', onAt: '08:00', days: 'daily', enabled: true }),
      }),
    );
  });

  it('refuses an on time that is the same as the off time and sends nothing', async () => {
    const fetchMock = stubApi(answers());
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Nyalakan lagi otomatis' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Mati pukul' }));
    await userEvent.click(await screen.findByRole('option', { name: '08:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Jam nyala harus beda dari jam mati.')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/schedule'),
      expect.anything(),
    );
  });

  it('clears the clash message when the off time moves away from the on time', async () => {
    stubApi(answers());
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Nyalakan lagi otomatis' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Mati pukul' }));
    await userEvent.click(await screen.findByRole('option', { name: '08:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText('Jam nyala harus beda dari jam mati.')).toBeVisible();

    await userEvent.click(screen.getByRole('combobox', { name: 'Mati pukul' }));
    await userEvent.click(await screen.findByRole('option', { name: '09:00' }));

    await waitFor(() => {
      expect(screen.queryByText('Jam nyala harus beda dari jam mati.')).not.toBeInTheDocument();
    });
  });

  it('shows the schedule that runs and lets the owner pause it', async () => {
    const fetchMock = stubApi({
      ...answers(sampleRelay({ schedule: { ...schedule } })),
      'PUT /v1/devices/d4/schedule': { body: { ...schedule, enabled: false } },
    });
    renderAt('/alat/d4/jadwal');

    expect(await screen.findByRole('heading', { level: 1, name: 'Ubah jadwal' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Mati pukul' })).toHaveTextContent('17:30');
    expect(screen.getByRole('combobox', { name: 'Nyala pukul' })).toHaveTextContent('08:00');
    expect(screen.getByRole('checkbox', { name: 'Jadwal berjalan' })).toBeChecked();
    expect(screen.queryByText(/Jadwal dijeda/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Jadwal berjalan' }));
    expect(
      screen.getByText('Jadwal dijeda. Jam tersimpan, tetapi colokan tidak berganti sendiri.'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await screen.findByText('Jadwal tersimpan');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/devices/d4/schedule',
      expect.objectContaining({
        body: JSON.stringify({ offAt: '17:30', onAt: '08:00', days: 'mon-fri', enabled: false }),
      }),
    );
  });

  it('keeps a time of the service that is not on the list of 15 minutes', async () => {
    stubApi(answers(sampleRelay({ schedule: { ...schedule, offAt: '17:20' } })));
    renderAt('/alat/d4/jadwal');

    expect(await screen.findByRole('combobox', { name: 'Mati pukul' })).toHaveTextContent('17:20');
  });

  it('removes the schedule and says so on the page of the plug', async () => {
    let removed = false;
    const fetchMock = stubApi({
      ...answers(sampleRelay({ schedule: { ...schedule } })),
      'GET /v1/devices/d4/relay': () => ({
        body: sampleRelay({ schedule: removed ? null : { ...schedule } }),
      }),
      'DELETE /v1/devices/d4/schedule': () => {
        removed = true;
        return { status: 204 };
      },
    });
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('button', { name: 'Hapus jadwal' }));

    expect(await screen.findByText('Jadwal dihapus')).toBeVisible();
    expect(await screen.findByText('Belum ada jadwal')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/devices/d4/schedule',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('stays on the form with the values when the save fails', async () => {
    stubApi({
      ...answers(),
      'PUT /v1/devices/d4/schedule': { status: 500, body: { code: 'internal' } },
    });
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Jadwal belum tersimpan')).toBeVisible();
    expect(screen.getByText('Periksa sambungan Anda, lalu coba lagi.')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Atur jadwal' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Mati pukul' })).toHaveTextContent('17:00');
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled();
  });

  it('stays on the form when the removal fails', async () => {
    stubApi({
      ...answers(sampleRelay({ schedule: { ...schedule } })),
      'DELETE /v1/devices/d4/schedule': { status: 500, body: { code: 'internal' } },
    });
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('button', { name: 'Hapus jadwal' }));

    expect(await screen.findByText('Jadwal belum dihapus')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hapus jadwal' })).toBeEnabled();
  });

  it('names the call that failed last when the removal and then the save fail', async () => {
    stubApi({
      ...answers(sampleRelay({ schedule: { ...schedule } })),
      'DELETE /v1/devices/d4/schedule': { status: 500, body: { code: 'internal' } },
      'PUT /v1/devices/d4/schedule': { status: 500, body: { code: 'internal' } },
    });
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('button', { name: 'Hapus jadwal' }));
    expect(await screen.findByText('Jadwal belum dihapus')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Jadwal belum tersimpan')).toBeVisible();
    expect(screen.queryByText('Jadwal belum dihapus')).not.toBeInTheDocument();
  });

  it('says that the plug has no switch when the save finds it gone', async () => {
    stubApi({
      ...answers(),
      'PUT /v1/devices/d4/schedule': { status: 409, body: { code: 'no_relay' } },
    });
    renderAt('/alat/d4/jadwal');

    await userEvent.click(await screen.findByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Alat ini tidak punya saklar')).toBeVisible();
    expect(screen.queryByText('Periksa sambungan Anda, lalu coba lagi.')).not.toBeInTheDocument();
  });

  it('goes back to the plug without saving', async () => {
    stubApi(answers());
    renderAt('/alat/d4/jadwal?status=online');

    expect(await screen.findByRole('link', { name: 'Batal' })).toHaveAttribute(
      'href',
      '/alat/d4?status=online',
    );
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute(
      'href',
      '/alat/d4?status=online',
    );
  });

  it('says that a clamp has no switch to schedule', async () => {
    stubApi({
      ...answers(),
      'GET /v1/devices/d4/relay': { status: 409, body: { code: 'no_relay' } },
    });
    renderAt('/alat/d4/jadwal');

    expect(await screen.findByText('Alat ini tidak punya saklar')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/alat/d4');
  });

  it('says that the schedule cannot be read and reads again on request', async () => {
    let calls = 0;
    stubApi({
      ...answers(),
      'GET /v1/devices/d4/relay': () => {
        calls += 1;
        return calls === 1 ? { status: 500 } : { body: sampleRelay() };
      },
    });
    renderAt('/alat/d4/jadwal');

    expect(await screen.findByText('Jadwal tidak bisa dimuat')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Atur jadwal' })).toBeVisible();
    });
    expect(calls).toBe(2);
  });
});
