import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import { sessionKey } from '@/api/auth';
import { createQueryClient } from '@/api/query-client';
import { routes } from '@/routes';
import { resolveLazyRoutes } from '@/test/resolve-routes';

await resolveLazyRoutes(routes);

interface Answer {
  status?: number;
  body?: unknown;
}

// Answers each call to the API by its method and path, for example "GET /v1/devices". A call that is not listed fails like
// a lost connection. The caller removes the stub with vi.unstubAllGlobals().
// The screens of the app need a session, so the call that reads it is answered with a signed in user unless a test says
// otherwise.
export const signedInUser = {
  email: 'dewi@example.com',
  emailVerified: true,
  businessName: 'Konveksi Maju Jaya',
};
const signedIn: Answer = { body: signedInUser };
// A business with one WATTLINK Hub, so the first step of Tambah alat is the choice of the kind of device
export const sampleGateway = {
  id: 'g1',
  name: 'Hub pabrik',
  lastSeenAt: '2026-10-29T14:30:00+07:00',
};

export function stubApi(overrides: Record<string, Answer | (() => Answer)>) {
  const answers: Record<string, Answer | (() => Answer)> = {
    'GET /v1/auth/me': signedIn,
    'GET /v1/gateways': { body: { items: [sampleGateway] } },
    ...overrides,
  };
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

// Renders the real routes at a path with a query client that does not retry. The state is what the visit carries, as a
// navigation from another screen would leave it. The user is signed in unless the options say `session: false`. The app runs in strict mode, which runs every effect twice in development,
// so a test can ask for it.
export function renderAt(
  path: string,
  state?: unknown,
  options: { strict?: boolean; client?: QueryClient; session?: boolean } = {},
) {
  const router = createMemoryRouter(routes, {
    initialEntries: [state === undefined ? path : { pathname: path, state }],
  });
  // The client of the app, with its rule for a 401, and no retry so that a failure shows at once
  const client = options.client ?? createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  // The screens of the app wait for the session, so a test starts with the user signed in and without a call to read it.
  // A test of the guard itself sets `session` to false.
  if (options.session !== false) {
    client.setQueryDefaults(sessionKey, { staleTime: Infinity });
    client.setQueryData(sessionKey, signedInUser);
  }
  const app = (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  render(options.strict ? <StrictMode>{app}</StrictMode> : app);
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
