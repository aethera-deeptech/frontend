import { act, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { AppShell } from '@/components/layout/app-shell';

describe('AppShell while a page loads', () => {
  it('says that a page is loading and clears it when the page is there', async () => {
    let finish: (loaded: { Component: ComponentType }) => void = () => undefined;
    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [
            { index: true, element: <p>Halaman awal</p> },
            {
              path: 'lambat',
              lazy: () =>
                new Promise<{ Component: ComponentType }>((resolve) => {
                  finish = resolve;
                }),
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    );
    const { container } = render(<RouterProvider router={router} />);
    const main = screen.getByRole('main');

    expect(main).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByTestId('pending-bar')).toHaveClass('hidden');

    await act(async () => {
      void router.navigate('/lambat');
      await Promise.resolve();
    });

    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('pending-bar')).not.toHaveClass('hidden');
    expect(screen.getByText('Halaman awal')).toBeInTheDocument();
    // The note for a screen reader waits, so a fast page says nothing
    expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
    await waitFor(() => {
      expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Memuat halaman');
    });

    await act(async () => {
      finish({ Component: () => <p>Halaman lambat</p> });
      await Promise.resolve();
    });

    expect(await screen.findByText('Halaman lambat')).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByTestId('pending-bar')).toHaveClass('hidden');
    expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
  });
});
