import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@/routes';
import { sampleDetail, sampleList } from '@/pages/saran/sample-saran';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

interface Answer {
  status?: number;
  body?: unknown;
}

// Answers each call to the API by its path. A path that is not listed fails like a lost connection.
function stubApi(answers: Record<string, Answer | (() => Answer)>) {
  const fetchMock = vi.fn((input: string, init?: RequestInit) => {
    const path = new URL(input).pathname;
    const method = init?.method ?? 'GET';
    const answer = answers[`${method} ${path}`];

    if (!answer) {
      return Promise.reject(new TypeError(`No answer for ${method} ${path}`));
    }
    const { status = 200, body = null } = typeof answer === 'function' ? answer() : answer;
    return Promise.resolve(new Response(body === null ? null : JSON.stringify(body), { status }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const originalMatchMedia = window.matchMedia.bind(window);

function matchWideScreen() {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.matchMedia = originalMatchMedia;
});

describe('the list of tips', () => {
  it('loads the tips and shows them in groups', async () => {
    stubApi({ 'GET /v1/recommendations': { body: sampleList() } });
    renderAt('/saran');

    expect(await screen.findByRole('status')).toHaveTextContent('Memuat saran');
    expect(
      await screen.findByRole('heading', { name: 'Menunggu keputusan Anda' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Saran' })).toBeInTheDocument();
    expect(document.title).toBe('Saran · Audit Energi UMKM');
  });

  it('shows only the chosen status and keeps it in the address', async () => {
    stubApi({ 'GET /v1/recommendations': { body: sampleList() } });
    const router = renderAt('/saran');

    await screen.findByRole('heading', { name: 'Menunggu keputusan Anda' });
    await userEvent.click(screen.getByRole('combobox', { name: 'Tampilkan' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ditolak' }));

    expect(
      await screen.findByRole('link', { name: 'Ganti kompresor dengan model baru' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Atur ulang jam nyala kipas gudang' }),
    ).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=rejected');
  });

  it('starts with the status from the address and ignores an unknown one', async () => {
    stubApi({ 'GET /v1/recommendations': { body: sampleList() } });
    renderAt('/saran?status=verified');

    expect(
      await screen.findByRole('link', { name: 'Atur ulang jam nyala kipas gudang' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ganti kompresor dengan model baru' }),
    ).not.toBeInTheDocument();
  });

  it('says that the tips could not be loaded and tries again on request', async () => {
    let calls = 0;
    stubApi({
      'GET /v1/recommendations': () => (++calls === 1 ? { status: 503 } : { body: sampleList() }),
    });
    renderAt('/saran');

    expect(await screen.findByRole('alert')).toHaveTextContent('Saran tidak bisa dimuat');

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(
      await screen.findByRole('heading', { name: 'Menunggu keputusan Anda' }),
    ).toBeInTheDocument();
  });

  it('sends a decision from the list and loads the tips again', async () => {
    const fetchMock = stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'POST /v1/recommendations/r1/apply': { status: 204 },
      'GET /v1/beranda': { status: 503 },
    });
    renderAt('/saran');

    await userEvent.click(await screen.findByRole('button', { name: /^Terapkan/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/v1/recommendations/r1/apply',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('keeps the chosen status in the address when a tip opens', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r3': { body: sampleDetail({ id: 'r3', status: 'verified' }) },
    });
    const router = renderAt('/saran?status=verified');

    await userEvent.click(
      await screen.findByRole('link', { name: 'Atur ulang jam nyala kipas gudang' }),
    );

    expect(router.state.location.pathname).toBe('/saran/r3');
    expect(router.state.location.search).toBe('?status=verified');
  });

  it('says that a decision was not saved when sending it fails', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'POST /v1/recommendations/r1/apply': { status: 500 },
    });
    renderAt('/saran');

    await userEvent.click(await screen.findByRole('button', { name: /^Terapkan/ }));

    expect(await screen.findByText('Pilihan belum tersimpan')).toBeInTheDocument();
  });

  it('asks for the list again after a decision', async () => {
    const fetchMock = stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'POST /v1/recommendations/r1/apply': { status: 204 },
      'GET /v1/beranda': { status: 503 },
    });
    renderAt('/saran');

    await userEvent.click(await screen.findByRole('button', { name: /^Terapkan/ }));

    await waitFor(() => {
      const lists = fetchMock.mock.calls.filter(
        ([url, init]) => url.endsWith('/v1/recommendations') && (init?.method ?? 'GET') === 'GET',
      );
      expect(lists).toHaveLength(2);
    });
  });

  it('opens the first tip at once on a wide screen', async () => {
    matchWideScreen();
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r1': { body: sampleDetail() },
    });
    const router = renderAt('/saran');

    expect(await screen.findByRole('heading', { name: 'Mengapa disarankan' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/saran/r1');
  });
});

describe('the detail of a tip', () => {
  it('loads the tip and shows it', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r1': { body: sampleDetail() },
    });
    renderAt('/saran/r1');

    expect(await screen.findByRole('heading', { name: 'Mengapa disarankan' })).toBeInTheDocument();
    expect(screen.getByText('Rp118.000')).toBeInTheDocument();
  });

  it('sends a decision and shows the new status', async () => {
    let status = 'pending';
    const fetchMock = stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r1': () => ({
        body: sampleDetail({ status: status as 'pending' | 'rejected' }),
      }),
      'POST /v1/recommendations/r1/reject': () => {
        status = 'rejected';
        return { status: 204 };
      },
      'GET /v1/beranda': { status: 503 },
    });
    renderAt('/saran/r1');

    await userEvent.click(await screen.findByRole('button', { name: 'Tolak' }));

    expect(await screen.findByRole('heading', { name: 'Keputusan Anda' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/recommendations/r1/reject',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('says that the tip does not exist when the API says 404', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/zzz': { status: 404 },
    });
    renderAt('/saran/zzz');

    expect(await screen.findByRole('status')).toHaveTextContent('Saran tidak ditemukan');
  });

  it('says that the tip could not be loaded for any other failure', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r1': { status: 500 },
    });
    renderAt('/saran/r1');

    const alerts = await screen.findAllByRole('alert');

    expect(alerts.some((alert) => within(alert).queryByRole('button', { name: 'Coba lagi' }))).toBe(
      true,
    );
  });
});

describe('the question before a record is removed', () => {
  const applied = sampleDetail({
    title: 'Kurangi daya siaga mesin obras',
    status: 'applied',
    verification: { collectedDays: 9, neededDays: 14 },
  });

  it('says what will be removed', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r3': { body: applied },
    });
    renderAt('/saran/r3/batalkan');

    expect(
      await screen.findByRole('heading', { name: 'Batalkan catatan penerapan?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Saran "Kurangi daya siaga mesin obras".')).toBeInTheDocument();
    expect(screen.getByText(/Hari ke-9 dari 14 akan hilang\./)).toBeInTheDocument();
  });

  it('removes the record and goes back to the tip', async () => {
    let status = 'applied';
    const fetchMock = stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r3': () => ({ body: { ...applied, status } }),
      'POST /v1/recommendations/r3/cancel': () => {
        status = 'pending';
        return { status: 204 };
      },
      'GET /v1/beranda': { status: 503 },
    });
    const router = renderAt('/saran/r3/batalkan');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, batalkan catatan' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/saran/r3');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/recommendations/r3/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('stays on the question when the record could not be removed', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r3': { body: applied },
      'POST /v1/recommendations/r3/cancel': { status: 500 },
    });
    renderAt('/saran/r3/batalkan');

    await userEvent.click(await screen.findByRole('button', { name: 'Ya, batalkan catatan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Catatan belum dibatalkan');
  });
});

describe('the question before a record is removed', () => {
  it('goes back to the tip when the tip is not applied', async () => {
    stubApi({
      'GET /v1/recommendations': { body: sampleList() },
      'GET /v1/recommendations/r1': { body: sampleDetail({ status: 'pending' }) },
    });
    const router = renderAt('/saran/r1/batalkan?status=pending');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/saran/r1');
    });
    expect(router.state.location.search).toBe('?status=pending');
  });
});
