import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reportError } from '@/lib/error-reporting';
import { ErrorPage } from '@/pages/error-page';

vi.mock('@/lib/error-reporting', () => ({ reportError: vi.fn() }));

const failure = new Error('the page broke');

function BrokenPage(): never {
  throw failure;
}

function renderBroken(path = '/saran?filter=rejected') {
  // React logs the error that the boundary catches, which is expected here
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const router = createMemoryRouter(
    [{ path: '*', Component: BrokenPage, ErrorBoundary: ErrorPage }],
    {
      initialEntries: [path],
    },
  );

  render(<RouterProvider router={router} />);
}

describe('ErrorPage', () => {
  beforeEach(() => {
    vi.mocked(reportError).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tells the user that the page failed and offers a way out', () => {
    renderBroken();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Terjadi kesalahan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/');
  });

  it('moves the focus to the page, because the one that had it is gone', () => {
    renderBroken();

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('reloads the same address, with its query, through a plain link', () => {
    renderBroken();

    expect(screen.getByRole('link', { name: 'Muat ulang' })).toHaveAttribute(
      'href',
      '/saran?filter=rejected',
    );
  });

  it('reports the error that broke the page', () => {
    renderBroken();

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(failure);
  });
});
