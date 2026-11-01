import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { RecommendationDetail } from '@/api/recommendations';
import { SaranDetailView } from '@/pages/saran/saran-detail-view';
import { sampleDetail } from '@/pages/saran/sample-saran';

function renderDetail(detail: RecommendationDetail, onDecision = vi.fn()) {
  render(
    <MemoryRouter>
      <SaranDetailView detail={detail} onDecision={onDecision} />
    </MemoryRouter>,
  );
  return onDecision;
}

describe('SaranDetailView, waiting for a decision', () => {
  it('shows the saving, the reason and how it is calculated', () => {
    renderDetail(sampleDetail());

    expect(
      screen.getByRole('heading', { name: 'Matikan mesin jahit 3 di luar jam kerja' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Menunggu keputusan')).toBeInTheDocument();
    expect(screen.getByText('Mesin jahit 3')).toBeInTheDocument();
    expect(screen.getByText('Rp118.000')).toBeInTheDocument();
    expect(screen.getByText('Memakai tarif bawaan, belum diverifikasi')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mengapa disarankan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cara hitung' })).toBeInTheDocument();
    expect(screen.getByText('Tarif bawaan, belum Anda isi')).toBeInTheDocument();
  });

  it('reports each of the three decisions', async () => {
    const onDecision = renderDetail(sampleDetail());

    await userEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nanti' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tolak' }));

    expect(onDecision.mock.calls).toEqual([['apply'], ['defer'], ['reject']]);
  });

  it('offers no Nanti on a tip that is already deferred and says so', () => {
    renderDetail(sampleDetail({ status: 'deferred' }));

    expect(screen.queryByRole('button', { name: 'Nanti' })).not.toBeInTheDocument();
    expect(screen.getByText(/Anda menunda saran ini dan saran tetap ada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terapkan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tolak' })).toBeInTheDocument();
  });

  it('has a way back to the list', () => {
    renderDetail(sampleDetail());

    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/saran');
  });
});

describe('SaranDetailView, applied', () => {
  const applied = sampleDetail({
    status: 'applied',
    appliedAt: new Date(2026, 9, 21, 8, 0).toISOString(),
    verification: { collectedDays: 9, neededDays: 14 },
    whatToDo: 'Lanjutkan kebiasaan baru sampai masa verifikasi selesai.',
  });

  it('shows the verification period with its progress', () => {
    renderDetail(applied);

    expect(screen.getByRole('heading', { name: 'Masa verifikasi' })).toBeInTheDocument();
    expect(screen.getByText(/Anda menerapkan saran ini pada 21 Okt 2026\./)).toBeInTheDocument();
    expect(screen.getByText('Verifikasi sedang berjalan')).toBeInTheDocument();
    expect(screen.getByText('Hari ke-9 dari 14')).toBeInTheDocument();
    expect(
      screen.getByText('Lanjutkan kebiasaan baru sampai masa verifikasi selesai.'),
    ).toBeInTheDocument();
  });

  it('links to the question before the record is removed and has no decision buttons', () => {
    renderDetail(applied);

    expect(screen.getByRole('link', { name: 'Batalkan penerapan' })).toHaveAttribute(
      'href',
      '/saran/r1/batalkan',
    );
    expect(screen.queryByRole('button', { name: 'Terapkan' })).not.toBeInTheDocument();
  });
});

describe('SaranDetailView, verified', () => {
  it('shows the result for the whole workshop', () => {
    renderDetail(
      sampleDetail({
        status: 'verified',
        savingPerMonthRp: 64_000,
        appliedAt: new Date(2026, 9, 12, 8, 0).toISOString(),
        result: { beforeKwh: 0.41, afterKwh: 0.37, beforeDays: 7, afterDays: 14 },
      }),
    );

    expect(screen.getByText('Energi per potong bengkel turun')).toBeInTheDocument();
    expect(screen.getByText('9,8%')).toBeInTheDocument();
    expect(screen.getByText('dalam 14 hari')).toBeInTheDocument();
    expect(screen.getByText('sekitar Rp64.000 per bulan, tarif bawaan')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hasil verifikasi' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /dibandingkan dengan 7 hari data sebelum saran diterapkan dan 14 hari sesudahnya/,
      ),
    ).toBeInTheDocument();
  });
});

describe('SaranDetailView, rejected', () => {
  it('says what the decision means and links back to the list', () => {
    renderDetail(
      sampleDetail({
        status: 'rejected',
        deviceName: 'Kompresor',
        rejectedAt: new Date(2026, 9, 20, 8, 0).toISOString(),
      }),
    );

    expect(screen.getByRole('heading', { name: 'Keputusan Anda' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Anda menolak saran ini pada 20 Okt 2026\. Sistem tidak menerapkannya dan tidak mengubah apa pun pada kompresor\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke daftar' })).toHaveAttribute(
      'href',
      '/saran',
    );
  });
});

describe('SaranDetailView, the tariff', () => {
  it('says that the tariff is the one of the user when it is filled in', () => {
    renderDetail(sampleDetail({ tariffIsDefault: false }));

    expect(screen.getByText('Memakai tarif Anda, belum diverifikasi')).toBeInTheDocument();
    expect(screen.getByText('Tarif Anda')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Isi tarif' })).not.toBeInTheDocument();
  });

  it('links to the tariff setting while the default tariff is used', () => {
    renderDetail(sampleDetail({ tariffIsDefault: true }));

    expect(screen.getByRole('link', { name: 'Isi tarif' })).toHaveAttribute(
      'href',
      '/lainnya/pengaturan/tarif',
    );
  });
});
