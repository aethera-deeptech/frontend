import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BerandaPage } from '@/pages/beranda/beranda-page';
import { sampleReady } from '@/pages/beranda/sample-beranda';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BerandaPage />
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

describe('BerandaPage', () => {
  it('shows that the data is loading, then the data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(sampleReady())));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Memuat data Anda');
    expect(screen.getByRole('heading', { level: 1, name: 'Beranda' })).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Konveksi Maju Jaya' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Beranda · Audit Energi UMKM');
  });

  it('asks for the data of Beranda', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(sampleReady()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await screen.findByText('Rp312.000');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/beranda',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('says that the data could not be loaded and tries again on request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json(sampleReady()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Data belum bisa dimuat');

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Konveksi Maju Jaya' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats an answer in an unexpected shape as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ phase: 'unknown' })));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Data belum bisa dimuat');
  });

  it('sends the decision for a tip and loads the data again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(sampleReady()))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(sampleReady({ recommendations: [] })));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const buttons = await screen.findAllByRole('button', { name: 'Terapkan' });
    await userEvent.click(buttons[0] as HTMLElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/v1/recommendations/r1/apply',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Saran' })).not.toBeInTheDocument();
    });
  });
});
