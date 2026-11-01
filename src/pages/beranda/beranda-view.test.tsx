import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { BerandaView } from '@/pages/beranda/beranda-view';
import { sampleCollecting, sampleEmpty, sampleReady } from '@/pages/beranda/sample-beranda';

const now = new Date(2026, 9, 29, 12, 0);

function renderView(props: Partial<ComponentProps<typeof BerandaView>> = {}) {
  return render(
    <MemoryRouter>
      <BerandaView
        data={sampleReady()}
        connection="online"
        onDecision={vi.fn()}
        now={now}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('BerandaView, ready', () => {
  it('shows the business, the saving and the status of the devices', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Konveksi Maju Jaya' })).toBeVisible();
    expect(screen.getByText('Ringkasan 29 Okt 2026')).toBeInTheDocument();
    expect(screen.getByText('Rp312.000')).toBeInTheDocument();
    expect(screen.getByText('dari 2 saran')).toBeInTheDocument();
    expect(screen.getByText('Status 7 alat')).toBeInTheDocument();
    expect(screen.getByText('Anomali 1')).toBeInTheDocument();
    expect(screen.getByText('Nyala 3')).toBeInTheDocument();
  });

  it('leaves out the statuses that no device has', () => {
    renderView({
      data: sampleReady({ statusCounts: { anomali: 0, offline: 0, siaga: 0, nyala: 2, mati: 0 } }),
    });

    expect(screen.getByText('Nyala 2')).toBeInTheDocument();
    expect(screen.queryByText(/^Anomali/)).not.toBeInTheDocument();
    expect(screen.getByText('Status 2 alat')).toBeInTheDocument();
  });

  it('lists the tips and reports the decision for the tip that was chosen', async () => {
    const onDecision = vi.fn();
    renderView({ onDecision });

    expect(screen.getByRole('heading', { level: 2, name: 'Saran' })).toBeInTheDocument();
    const tip = within(
      screen.getByRole('article', { name: 'Kurangi waktu pemanasan setrika uap' }),
    );
    expect(tip.getByText('Hemat sekitar Rp104.000 per bulan')).toBeInTheDocument();

    await userEvent.click(tip.getByRole('button', { name: 'Terapkan' }));
    await userEvent.click(tip.getByRole('button', { name: 'Nanti' }));

    expect(onDecision).toHaveBeenNthCalledWith(1, 'r2', 'apply');
    expect(onDecision).toHaveBeenNthCalledWith(2, 'r2', 'defer');
  });

  it('disables the buttons of the tip that is being sent', () => {
    renderView({ busyId: 'r1' });

    const buttons = screen.getAllByRole('button', { name: 'Terapkan' });

    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });

  it('hides the Saran heading when there are no tips', () => {
    renderView({ data: sampleReady({ recommendations: [] }) });

    expect(screen.queryByRole('heading', { name: 'Saran' })).not.toBeInTheDocument();
    expect(screen.getByText('dari 0 saran')).toBeInTheDocument();
  });

  it('shows the bill, the energy for each device and the energy for each piece', () => {
    renderView();

    expect(screen.getByText('Rp2.100.000')).toBeInTheDocument();
    expect(screen.getByText('perkiraan sampai 31 Okt')).toBeInTheDocument();
    expect(screen.getByText(/potensi hemat Rp312\.000 per bulan/)).toBeInTheDocument();
    expect(screen.getByText('Tagihan sampai hari ini, Rp1.960.000')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Energi per alat' })).toHaveTextContent(
      'Setrika uap160',
    );
    expect(screen.getByText('Terverifikasi')).toBeInTheDocument();
    expect(screen.getByText('Hemat 9,8%')).toBeInTheDocument();
  });

  it('names the day of the data when it is not from today', () => {
    renderView({ now: new Date(2026, 10, 2, 12, 0) });

    expect(screen.getByText('Tagihan sampai 29 Okt, Rp1.960.000')).toBeInTheDocument();
  });

  it('shows an estimate with the word Perkiraan', () => {
    renderView({
      data: sampleReady({
        energyPerPiece: { status: 'estimate', beforeKwh: 0.41, afterKwh: 0.37 },
      }),
    });

    expect(screen.getByText('Perkiraan')).toBeInTheDocument();
    expect(screen.queryByText('Terverifikasi')).not.toBeInTheDocument();
  });

  it('shows the progress while the energy for each piece is still collected', () => {
    renderView({
      data: sampleReady({
        energyPerPiece: { status: 'collecting', collectedDays: 3, neededDays: 14 },
      }),
    });

    expect(screen.getByText('Hari ke-3 dari 14')).toBeInTheDocument();
  });
});

describe('BerandaView, connection', () => {
  it('says that the data is old when the device is offline', () => {
    renderView({ connection: 'offline' });

    expect(screen.getByRole('status')).toHaveTextContent('Data belum diperbarui');
    expect(screen.getByText(/Terakhir diperbarui 29 Okt 2026, 09:30\./)).toBeInTheDocument();
    expect(screen.getByText('Status 7 alat per 29 Okt, 09:30')).toBeInTheDocument();
  });

  it('says that the data is arriving after the connection came back', () => {
    renderView({ connection: 'catching-up' });

    expect(screen.getByRole('status')).toHaveTextContent('Data sedang menyusul');
    expect(screen.getByText('Status 7 alat, sedang diperbarui')).toBeInTheDocument();
  });

  it('shows no banner when everything is current', () => {
    renderView();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('BerandaView, the other phases', () => {
  it('explains what to do when no device is installed', () => {
    renderView({ data: sampleEmpty() });

    expect(screen.getByRole('heading', { name: 'Belum ada alat terpasang' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tambah alat' })).toHaveAttribute(
      'href',
      '/alat/tambah',
    );
    expect(screen.queryByRole('link', { name: 'Catat produksi' })).not.toBeInTheDocument();
    expect(screen.queryByText('Perkiraan hemat per bulan')).not.toBeInTheDocument();
  });

  it('offers to record the production once a device is installed', () => {
    renderView();

    expect(screen.getByRole('link', { name: 'Catat produksi' })).toHaveAttribute(
      'href',
      '/lainnya/produksi',
    );
  });

  it('shows the first days of data while the system is collecting', () => {
    renderView({ data: sampleCollecting() });

    expect(screen.getByRole('status')).toHaveTextContent('Sistem sedang mengumpulkan data awal');
    expect(screen.getByText('Saran pertama muncul setelah 7 hari data.')).toBeInTheDocument();
    expect(screen.getByText('Hari ke-4 dari 7')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Energi per alat' })).toHaveTextContent(
      'Setrika uap22',
    );
  });
});
