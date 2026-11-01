import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { LaporanPage } from '@/pages/laporan/laporan-page';
import { reportFileName } from '@/pages/laporan/use-report-download';
import { sampleReady, sampleSeptember } from '@/pages/laporan/sample-laporan';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

function renderPage(path = '/laporan') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LaporanPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

let click: MockInstance<() => void>;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:report');
  URL.revokeObjectURL = vi.fn();
  // jsdom cannot follow a link, and the page only needs to know that the browser was asked to save
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LaporanPage', () => {
  it('shows that the report is loading, then the report', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(sampleReady())));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Memuat laporan');

    expect(await screen.findByText('Rp312.000')).toBeInTheDocument();
    expect(document.title).toBe('Laporan · Audit Energi UMKM');
  });

  it('asks for the running month first and for another month when the address names it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(sampleReady()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/laporan?periode=2026-09');

    await screen.findByText('Rp312.000');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/reports?period=2026-09',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('asks for the running month when the address has no month or a month that is not valid', async () => {
    const fetchMock = vi
      .fn<(url: string) => Promise<Response>>()
      .mockImplementation(() => Promise.resolve(json(sampleReady())));
    vi.stubGlobal('fetch', fetchMock);

    renderPage('/laporan');
    await screen.findByText('Rp312.000');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/reports');

    fetchMock.mockClear();
    renderPage('/laporan?periode=');
    renderPage('/laporan?periode=bukan-bulan');
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.com/v1/reports',
      'https://api.example.com/v1/reports',
    ]);
  });

  it('offers the running month when the asked month has no report', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 404)));
    renderPage('/laporan?periode=2026-01');

    expect(await screen.findByRole('alert')).toHaveTextContent('Laporan tidak bisa dimuat');
    expect(screen.getByRole('link', { name: 'Lihat bulan berjalan' })).toHaveAttribute(
      'href',
      '/laporan',
    );
  });

  it('shows the empty state for a user with no device and no month with a report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ phase: 'no-devices', periods: [], period: '2026-10' })),
    );
    renderPage();

    expect(await screen.findByText('Laporan belum tersedia')).toBeInTheDocument();
  });

  it('loads the month that the user picks', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(sampleReady()))
      .mockResolvedValueOnce(json(sampleSeptember()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByText('Rp312.000');

    await userEvent.click(screen.getByRole('combobox', { name: 'Periode' }));
    await userEvent.click(screen.getByRole('option', { name: 'September 2026' }));

    expect(await screen.findByText('Belum ada saran yang dicek')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.example.com/v1/reports?period=2026-09',
      expect.anything(),
    );
  });

  it('says that the report could not be loaded and tries again on request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json(sampleReady()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Laporan tidak bisa dimuat');
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('Rp312.000')).toBeInTheDocument();
  });

  it('downloads the PDF of the month and offers to open it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(sampleReady()))
      .mockResolvedValueOnce(
        new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Unduh laporan (PDF)' }));

    expect(await screen.findByText('Laporan diunduh')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buka laporan' })).toHaveAttribute(
      'href',
      'blob:report',
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.example.com/v1/reports/2026-10/pdf',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('does not save the file of a month that the user left while it was loading', async () => {
    let finish: (response: Response) => void = () => undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(sampleReady()))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce(json(sampleSeptember()));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Unduh laporan (PDF)' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Periode' }));
    await userEvent.click(screen.getByRole('option', { name: 'September 2026' }));
    await screen.findByText('Belum ada saran yang dicek');
    finish(new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } }));

    await waitFor(() => {
      expect(click).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('Laporan diunduh')).not.toBeInTheDocument();
  });

  it('says that the download failed and lets the user try again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(sampleReady()))
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(
        new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Unduh laporan (PDF)' }));
    expect(await screen.findByText('Laporan belum terunduh')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    await waitFor(() => {
      expect(screen.getByText('Laporan diunduh')).toBeInTheDocument();
    });
  });
});

describe('reportFileName', () => {
  it('writes the month and the year in the name of the file', () => {
    expect(reportFileName('2026-10')).toBe('Laporan-Oktober-2026.pdf');
  });
});
