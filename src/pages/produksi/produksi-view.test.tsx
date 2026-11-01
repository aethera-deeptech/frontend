import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ProduksiView } from '@/pages/produksi/produksi-view';
import { sampleProduction } from '@/pages/produksi/sample-produksi';

function renderView(props: Partial<ComponentProps<typeof ProduksiView>> = {}) {
  return render(
    <MemoryRouter>
      <ProduksiView
        data={sampleProduction()}
        date="2026-10-29"
        onDateChange={vi.fn()}
        quantity={124}
        onQuantityChange={vi.fn()}
        unit="potong"
        onUnitChange={vi.fn()}
        saveState="idle"
        onSave={vi.fn()}
        backTo="/lainnya"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('ProduksiView', () => {
  it('shows the form and the newest records', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Catat produksi' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Tanggal/ })).toHaveTextContent('29 Okt 2026');
    expect(screen.getByRole('textbox', { name: 'Angka' })).toHaveValue('124');
    expect(
      screen.getByText('Ketuk angka untuk mengetik, atau ketuk plus dan minus.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catatan terakhir' })).toBeVisible();
    expect(screen.getByText('28 Okt 2026')).toBeInTheDocument();
    expect(screen.getByText('120 potong')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/lainnya');
  });

  it('saves on request', async () => {
    const onSave = vi.fn();
    renderView({ onSave });

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it('does not save 0 and says why', () => {
    renderView({ quantity: 0 });

    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
    expect(
      screen.getByText('Isi jumlah lebih dari 0 supaya bisa disimpan. Ketuk angka untuk mengetik.'),
    ).toBeInTheDocument();
  });

  it('explains why the number matters when there is no record yet', () => {
    renderView({ data: sampleProduction({ recent: [] }), quantity: 0 });

    expect(screen.getByRole('heading', { name: 'Mengapa angka ini penting' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Catatan terakhir' })).not.toBeInTheDocument();
  });

  it('changes a record that exists instead of adding one', () => {
    renderView({ date: '2026-10-28', quantity: 120 });

    expect(screen.getByRole('button', { name: 'Ubah catatan' })).toBeEnabled();
    expect(
      screen.getByText('Ubah angka lalu ketuk Ubah catatan untuk mengganti catatan 28 Okt.'),
    ).toBeInTheDocument();
  });

  it('confirms a saved record with the number and the unit', () => {
    renderView({ saveState: 'saved' });

    expect(screen.getByRole('status')).toHaveTextContent('Catatan tersimpan');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Produksi 29 Okt 2026 sebanyak 124 potong sudah tercatat.',
    );
  });

  it('keeps the number on the screen when saving failed', () => {
    renderView({ saveState: 'failed' });

    expect(screen.getByRole('alert')).toHaveTextContent('Catatan belum tersimpan');
    expect(screen.getByRole('textbox', { name: 'Angka' })).toHaveValue('124');
  });

  it('disables the button while it saves', () => {
    renderView({ saveState: 'saving' });

    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });
});
