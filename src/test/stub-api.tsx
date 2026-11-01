import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import { routes } from '@/routes';

interface Answer {
  status?: number;
  body?: unknown;
}

// Answers each call to the API by its method and path, for example "GET /v1/devices". A call that is not listed fails like
// a lost connection. The caller removes the stub with vi.unstubAllGlobals().
export function stubApi(answers: Record<string, Answer | (() => Answer)>) {
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

// Renders the real routes at a path with a query client that does not retry
export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const originalMatchMedia =
  typeof window === 'undefined' ? undefined : window.matchMedia.bind(window);

// Makes (min-width: 1024px) and every other query match, like a wide screen
export function matchWideScreen() {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
}

export function restoreScreen() {
  if (originalMatchMedia) {
    window.matchMedia = originalMatchMedia;
  }
}
