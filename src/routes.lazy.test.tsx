import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { routes } from '@/routes';

// This file does not load the pages first, so it runs the lazy path of the real app. Every other test file loads them.
function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
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
    expect(await screen.findByRole('button', { name: /Colokan pintar/ })).toBeInTheDocument();
  });
});
