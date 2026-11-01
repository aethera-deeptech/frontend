import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { PengaturanView } from '@/pages/pengaturan/pengaturan-view';
import { sampleSettings } from '@/pages/pengaturan/sample-settings';

function renderView(props: Partial<ComponentProps<typeof PengaturanView>> = {}) {
  return render(
    <MemoryRouter>
      <PengaturanView settings={sampleSettings()} backTo="/lainnya" {...props} />
    </MemoryRouter>,
  );
}

describe('PengaturanView', () => {
  it('shows every setting with its value and a link to change it', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Pengaturan' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Nama usaha/ })).toHaveAttribute(
      'href',
      '/lainnya/pengaturan/nama',
    );
    expect(screen.getByText('Konveksi Maju Jaya')).toBeInTheDocument();
    expect(screen.getByText('Senin sampai Sabtu')).toBeInTheDocument();
    expect(screen.getByText('08:00 sampai 17:00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Jam kerja/ })).toHaveAttribute(
      'href',
      '/lainnya/pengaturan/jam-kerja',
    );
    expect(screen.getByRole('link', { name: /Tarif listrik/ })).toHaveAttribute(
      'href',
      '/lainnya/pengaturan/tarif',
    );
    expect(screen.getByText('Rp1.444 per kWh')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kepekaan anomali/ })).toHaveAttribute(
      'href',
      '/lainnya/pengaturan/kepekaan',
    );
    expect(screen.getByText('Sedang')).toBeInTheDocument();
    expect(
      screen.getByText(/Sistem tidak mengubah atau mematikan alat Anda\./),
    ).toBeInTheDocument();
  });

  it('says whether the tariff is the default or the tariff of the user', () => {
    const { unmount } = renderView();
    expect(screen.getByText('Tarif bawaan, belum Anda isi')).toBeInTheDocument();
    unmount();

    renderView({
      settings: sampleSettings({
        tariff: { rpPerKwh: 1500, isDefault: false, defaultRpPerKwh: 1444 },
      }),
    });

    expect(screen.getByText('Tarif Anda')).toBeInTheDocument();
    expect(screen.getByText('Rp1.500 per kWh')).toBeInTheDocument();
  });

  it('confirms the setting that was saved', () => {
    renderView({ saved: 'hours' });

    expect(screen.getByRole('status')).toHaveTextContent('Pengaturan tersimpan');
    expect(screen.getByRole('status')).toHaveTextContent('Jam kerja sudah diperbarui.');
  });

  it('has a link back to the menu', () => {
    renderView();

    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/lainnya');
  });
});
