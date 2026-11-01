import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { routes } from '@/routes';
import { resolveLazyRoutes } from '@/test/resolve-routes';

// The pages load on demand, so they are loaded before the app builds its router
await resolveLazyRoutes(routes);
const { App } = await import('@/app');

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('opens the home page at the root of the site', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Beranda' })).toBeInTheDocument();
  });
});

describe('the app shell', () => {
  it('has a skip link that points at the main content', () => {
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Lewati ke konten' })).toHaveAttribute(
      'href',
      '#konten',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'konten');
  });

  it('shows the menu in the bottom bar and in the sidebar and marks the open page', () => {
    renderAt('/');

    const menus = screen.getAllByRole('navigation', { name: 'Menu utama' });

    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      expect(within(menu).getByRole('link', { name: 'Beranda' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  it('moves the focus to the main content after a navigation and not on the first render', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('main')).not.toHaveFocus();

    await act(() => router.navigate('/halaman-yang-tidak-ada'));

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('sets the page title', () => {
    renderAt('/');

    expect(document.title).toBe('Beranda · Audit Energi UMKM');
  });
});

describe('an unknown address', () => {
  it('says that the page does not exist and links back to the home page', () => {
    renderAt('/halaman-yang-tidak-ada');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/');
  });
});
