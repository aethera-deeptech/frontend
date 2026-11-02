import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { sessionKey } from '@/api/auth';
import { gatewaysKey } from '@/api/gateways';
import { routes } from '@/routes';

// This file does not load the pages first, so it runs the lazy path of the real app. Every other test file loads them.
function renderAt(path: string) {
  const client = new QueryClient();
  // The user is signed in, so the guard does not ask the API
  client.setQueryData(sessionKey, {
    email: 'dewi@example.com',
    emailVerified: true,
    businessName: 'Maju',
  });
  // The first step of Tambah alat reads the hubs, and this client has no API to ask
  client.setQueryData(gatewaysKey, {
    items: [{ id: 'g1', name: 'Hub pabrik', lastSeenAt: '2026-10-29T14:30:00+07:00' }],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  );
}

describe('the lazy routes', () => {
  it('shows the loading fallback while the first page loads, then the page', async () => {
    renderAt('/masuk');

    expect(screen.getByRole('status')).toHaveTextContent('Memuat aplikasi');
    expect(await screen.findByRole('heading', { level: 1, name: 'Masuk' })).toBeInTheDocument();
  });

  it('loads a lazy layout and its lazy child page', async () => {
    renderAt('/alat/tambah');

    expect(screen.getByRole('status')).toHaveTextContent('Memuat aplikasi');
    expect(await screen.findByRole('button', { name: /WATTLINK Plug/ })).toBeInTheDocument();
  });
});
