import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { renderAt, stubApi } from '@/test/stub-api';

const unauthorized = { status: 401, body: { code: 'unauthorized', message: 'No' } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the guard of the screens', () => {
  it('shows the app while the session is read, then the screen', async () => {
    stubApi({ 'GET /v1/beranda': { status: 500 } });
    renderAt('/', undefined, { session: false });

    expect(screen.getByRole('status')).toHaveTextContent('Memuat aplikasi');
    expect(await screen.findByRole('heading', { level: 1, name: 'Beranda' })).toBeInTheDocument();
  });

  it('sends a user without a session to Masuk and remembers the screen that was asked for', async () => {
    stubApi({ 'GET /v1/auth/me': unauthorized });
    const router = renderAt('/laporan?periode=2026-10#ringkasan', undefined, { session: false });

    expect(await screen.findByRole('heading', { level: 1, name: 'Masuk' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/masuk');
    expect(router.state.location.state).toEqual({ from: '/laporan?periode=2026-10#ringkasan' });
  });

  it('brings the user back to that screen after the sign in', async () => {
    stubApi({
      'GET /v1/auth/me': unauthorized,
      'POST /v1/auth/login': {
        body: { email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' },
      },
    });
    const router = renderAt('/laporan', undefined, { session: false });

    await userEvent.type(await screen.findByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/laporan');
    });
  });

  it('does not send the user to Masuk when the session cannot be read, and offers to try again', async () => {
    let calls = 0;
    stubApi({
      'GET /v1/auth/me': () => {
        calls += 1;
        return calls === 1
          ? { status: 503 }
          : { body: { email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' } };
      },
      'GET /v1/beranda': { status: 500 },
    });
    const router = renderAt('/', undefined, { session: false });

    expect(await screen.findByRole('alert')).toHaveTextContent('Akun tidak bisa diperiksa');
    expect(router.state.location.pathname).toBe('/');

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Beranda' })).toBeInTheDocument();
  });

  it('shows the loading state again while the retry runs, so there is no button to press twice', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (new URL(input).pathname === '/v1/auth/me') {
          calls += 1;
          return calls === 1
            ? Promise.resolve(new Response(null, { status: 503 }))
            : new Promise<Response>(() => undefined);
        }
        return Promise.resolve(new Response(null, { status: 500 }));
      }),
    );
    renderAt('/', undefined, { session: false });

    await userEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Memuat aplikasi');
    expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('keeps the user on the screen when a read of the session fails in the background', async () => {
    let signedIn = true;
    const client = createQueryClient();
    stubApi({
      'GET /v1/auth/me': () =>
        signedIn
          ? {
              body: { email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' },
            }
          : { status: 503 },
      'GET /v1/beranda': { status: 500 },
    });
    const router = renderAt('/', undefined, { client });
    await screen.findByRole('heading', { level: 1, name: 'Beranda' });

    signedIn = false;
    await client.invalidateQueries({ queryKey: ['session'] });

    expect(screen.getByRole('heading', { level: 1, name: 'Beranda' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('says that the connection is lost in the same way', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    renderAt('/laporan', undefined, { session: false });

    expect(await screen.findByRole('alert')).toHaveTextContent('Akun tidak bisa diperiksa');
  });

  it('sends the user to Masuk when a screen learns that the session has ended', async () => {
    let signedIn = true;
    stubApi({
      'GET /v1/auth/me': () =>
        signedIn
          ? { body: { email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' } }
          : unauthorized,
      'GET /v1/settings': () => {
        signedIn = false;
        return unauthorized;
      },
    });
    const router = renderAt('/lainnya/pengaturan');

    expect(await screen.findByRole('heading', { level: 1, name: 'Masuk' })).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: '/lainnya/pengaturan' });
  });
});
