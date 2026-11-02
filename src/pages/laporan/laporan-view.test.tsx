import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { LaporanView } from '@/pages/laporan/laporan-view';
import {
  sampleCollecting,
  sampleEmpty,
  sampleReady,
  sampleSeptember,
  sampleWeek,
} from '@/pages/laporan/sample-laporan';

function renderView(props: Partial<ComponentProps<typeof LaporanView>> = {}) {
  return render(
    <MemoryRouter>
      <LaporanView
        data={sampleReady()}
        period="2026-10"
        onPeriodChange={vi.fn()}
        download={{ status: 'idle' }}
        onDownload={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('LaporanView, ready', () => {
  it('shows the three savings with their own tag, line and amount', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 2, name: 'Hemat per bulan' })).toBeVisible();
    expect(screen.getByText('Sudah dicek 14 hari, 1 saran')).toBeInTheDocument();
    expect(screen.getByText('Rp64.000')).toBeInTheDocument();
    expect(screen.getByText('Sedang dicek, hari ke-9 dari 14, 1 saran')).toBeInTheDocument();
    expect(screen.getByText('Rp46.000')).toBeInTheDocument();
    expect(screen.getByText('Menunggu keputusan Anda, 3 saran')).toBeInTheDocument();
    expect(screen.getByText('Rp312.000')).toBeInTheDocument();
  });

  it('names the running month with its last day and the bill until then', () => {
    renderView();

    expect(screen.getByRole('combobox', { name: 'Periode' })).toHaveTextContent(
      'Oktober 2026, sampai 29 Okt',
    );
    expect(
      screen.getByText(
        'Tagihan sampai 29 Okt Rp1.965.000. Termasuk beban yang belum terpantau alat.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Energi per alat bulan ini, 4 teratas (kWh)' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Energi per potong, seluruh bengkel' }),
    ).toBeVisible();
  });

  it('names the last day by the clock of the business and not by the clock of the device', () => {
    renderView({ data: { ...sampleReady(), through: '2026-10-28T23:30:00+07:00' } });

    expect(screen.getByRole('combobox', { name: 'Periode' })).toHaveTextContent(
      'Oktober 2026, sampai 28 Okt',
    );
  });

  it('says that nothing was checked in a month without tips', () => {
    renderView({ data: sampleSeptember(), period: '2026-09' });

    expect(screen.getByText('Belum ada saran yang dicek')).toBeInTheDocument();
    expect(screen.getByText('Belum ada saran yang diterapkan')).toBeInTheDocument();
    expect(screen.getByText('Belum ada saran pada periode ini')).toBeInTheDocument();
    expect(screen.getAllByText('Rp0')).toHaveLength(3);
    expect(
      screen.getByText(
        'Tagihan September 2026 Rp2.052.000. Termasuk beban yang belum terpantau alat.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Energi per alat, 4 teratas (kWh)' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Energi per potong, seluruh bengkel' }),
    ).not.toBeInTheDocument();
  });

  it('lists the months and reports the one that was picked', async () => {
    const onPeriodChange = vi.fn();
    renderView({ onPeriodChange });

    await userEvent.click(screen.getByRole('combobox', { name: 'Periode' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Oktober 2026, sampai 29 Okt',
      'September 2026',
      'Agustus 2026',
      'Juli 2026',
    ]);
    await userEvent.click(screen.getByRole('option', { name: 'Agustus 2026' }));

    expect(onPeriodChange).toHaveBeenCalledWith('2026-08');
  });

  it('marks the content as busy while the picked month is loading', () => {
    const { container } = renderView({ period: '2026-09' });

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('asks for the download', async () => {
    const onDownload = vi.fn();
    renderView({ onDownload });

    await userEvent.click(screen.getByRole('button', { name: 'Unduh laporan (PDF)' }));

    expect(onDownload).toHaveBeenCalledOnce();
  });
});

describe('LaporanView, download', () => {
  it('disables the button while the file is prepared', () => {
    renderView({ download: { status: 'busy' } });

    expect(screen.getByRole('button', { name: 'Menyiapkan laporan' })).toBeDisabled();
  });

  it('says where the file went and offers to open it', () => {
    renderView({
      download: { status: 'done', fileName: 'Laporan-Oktober-2026.pdf', url: 'blob:report' },
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Berkas Laporan-Oktober-2026.pdf sudah diunduh.',
    );
    expect(screen.getByRole('link', { name: 'Buka laporan' })).toHaveAttribute(
      'href',
      'blob:report',
    );
  });

  it('says that the download failed and tries again on request', async () => {
    const onDownload = vi.fn();
    renderView({ download: { status: 'failed' }, onDownload });

    expect(screen.getByRole('alert')).toHaveTextContent('Laporan belum terunduh');
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(onDownload).toHaveBeenCalledOnce();
  });
});

describe('LaporanView, not ready', () => {
  it('says that a report needs 7 days of data when there is no device', () => {
    renderView({ data: sampleEmpty() });

    expect(screen.getByRole('heading', { name: 'Laporan belum tersedia' })).toBeVisible();
    expect(screen.getByText(/Belum ada alat\? Tambah alat dulu\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tambah alat' })).toHaveAttribute(
      'href',
      '/alat/tambah',
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows how far the first days of data are', () => {
    renderView({ data: sampleCollecting() });

    expect(
      screen.getByText(
        'Sistem sedang mengumpulkan data awal (hari ke-4 dari 7). Laporan muncul setelah 7 hari data terkumpul.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Unduh/ })).not.toBeInTheDocument();
  });
});

describe('LaporanView, a week', () => {
  const week = () => sampleWeek();

  it('shows the bill and the devices of seven days and names the week in the select', () => {
    renderView({ data: week(), period: '2026-W43' });

    expect(screen.getByRole('combobox', { name: 'Periode' })).toHaveTextContent(
      '19 sampai 25 Okt 2026',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Tagihan 7 hari' })).toBeVisible();
    expect(screen.getByText('Rp474.000')).toBeInTheDocument();
    expect(screen.getByText('Termasuk beban belum terpantau alat')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Energi per alat' })).toHaveTextContent('Setrika uap');
    expect(screen.getByText('Tagihan dan energi bengkel Anda selama 7 hari')).toBeInTheDocument();
  });

  it('does not show the savings, which are rates of 30 days, and links to the monthly report', () => {
    renderView({ data: week(), period: '2026-W43' });

    expect(screen.queryByRole('heading', { name: 'Hemat per bulan' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rp312.000')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Penghematan dihitung per 30 hari, jadi laporan mingguan tidak menampilkannya.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat laporan bulanan' })).toHaveAttribute(
      'href',
      '/laporan',
    );
  });

  it('says that the oldest week is not full and that the bill covers the days with data', () => {
    renderView({ data: sampleWeek({ period: '2026-W40', billRp: 338_000 }), period: '2026-W40' });

    expect(screen.getByText('Minggu 28 Sep sampai 4 Okt belum penuh')).toBeVisible();
    expect(screen.getByText('Laporan hanya mencakup hari yang punya data.')).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tagihan hari yang tercatat' }),
    ).toBeVisible();
    expect(
      screen.getByText('Tagihan dan energi bengkel Anda selama hari yang tercatat'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tagihan 7 hari')).not.toBeInTheDocument();
  });

  it('shows no banner for a week that is full', () => {
    renderView({ data: week(), period: '2026-W43' });

    expect(screen.queryByText(/belum penuh/)).not.toBeInTheDocument();
  });

  it('offers the months and then the weeks in a group', async () => {
    renderView({ data: week(), period: '2026-W43' });

    await userEvent.click(screen.getByRole('combobox', { name: 'Periode' }));

    expect(
      await screen.findByRole('option', { name: 'Oktober 2026, sampai 29 Okt' }),
    ).toBeVisible();
    expect(screen.getByRole('group', { name: 'Minggu' })).toBeVisible();
    expect(screen.getByRole('option', { name: '12 sampai 18 Okt 2026' })).toBeVisible();
    expect(screen.getByRole('option', { name: '28 Sep sampai 4 Okt, belum penuh' })).toBeVisible();
  });

  it('passes the week that the user picks', async () => {
    const onPeriodChange = vi.fn();
    renderView({ data: week(), period: '2026-W43', onPeriodChange });

    await userEvent.click(screen.getByRole('combobox', { name: 'Periode' }));
    await userEvent.click(await screen.findByRole('option', { name: '12 sampai 18 Okt 2026' }));

    expect(onPeriodChange).toHaveBeenCalledWith('2026-W42');
  });
});
