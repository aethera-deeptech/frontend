import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProduksiPage } from '@/pages/produksi/produksi-page';
import { sampleProduction } from '@/pages/produksi/sample-produksi';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProduksiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProduksiPage', () => {
  it('shows that the records are loading, then the form with the newest number', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(sampleProduction())));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Memuat catatan produksi');

    expect(await screen.findByRole('textbox', { name: 'Angka' })).toHaveValue('120');
    expect(document.title).toBe('Catat produksi · Audit Energi UMKM');
  });

  it('starts at 0 when there is no record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(sampleProduction({ recent: [] }))));
    renderPage();

    expect(await screen.findByRole('textbox', { name: 'Angka' })).toHaveValue('0');
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });

  it('says that the records could not be loaded and tries again on request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json(sampleProduction()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Catatan produksi tidak bisa dimuat',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Catat produksi' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByRole('textbox', { name: 'Angka' })).toBeInTheDocument();
  });

  it('saves the record of the day and then offers to change it', async () => {
    const saved = sampleProduction({
      recent: [{ date: '2026-10-29', quantity: 124 }, ...sampleProduction().recent],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(sampleProduction()))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValue(json(saved));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Tambah' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Catatan tersimpan')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/production/2026-10-29',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ quantity: 124, unit: 'potong' }),
      }),
    );
    expect(await screen.findByRole('button', { name: 'Ubah catatan' })).toBeInTheDocument();
  });

  it('keeps the number and says so when saving failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json(sampleProduction())).mockResolvedValueOnce(json({}, 500)),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Catatan belum tersimpan')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Angka' })).toHaveValue('120');
  });

  it('forgets the confirmation when the number changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(sampleProduction()))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValue(json(sampleProduction())),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Simpan' }));
    await screen.findByText('Catatan tersimpan');
    await userEvent.click(screen.getByRole('button', { name: 'Kurangi' }));

    await waitFor(() => {
      expect(screen.queryByText('Catatan tersimpan')).not.toBeInTheDocument();
    });
  });
});
