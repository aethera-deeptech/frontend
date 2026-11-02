import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { matchWideScreen, renderAt, restoreScreen, stubApi } from '@/test/stub-api';

afterEach(() => {
  vi.unstubAllGlobals();
  restoreScreen();
});

describe('Keluar', () => {
  it('asks before the session ends and has no menu', () => {
    stubApi({});
    renderAt('/lainnya/keluar');

    expect(screen.getByRole('heading', { level: 1, name: 'Keluar dari akun?' })).toBeVisible();
    expect(
      screen.getByText('Anda perlu masuk lagi untuk melihat data usaha di perangkat ini.'),
    ).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument();
    expect(document.title).toBe('Keluar dari akun? · WATTLINK');
  });

  it('goes back to the menu on a phone', () => {
    stubApi({});
    renderAt('/lainnya/keluar');
    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/lainnya');
  });

  it('goes back to the home screen on a wide screen', () => {
    matchWideScreen();
    stubApi({});
    renderAt('/lainnya/keluar');

    expect(screen.getByRole('link', { name: 'Batal' })).toHaveAttribute('href', '/');
  });

  it('ends the session, empties the cache and opens Masuk', async () => {
    const fetchMock = stubApi({ 'POST /v1/auth/logout': { status: 204 } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['beranda'], { businessName: 'Maju' });
    const router = renderAt('/lainnya/keluar', undefined, { client });

    await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
    await waitFor(() => {
      expect(client.getQueryData(['beranda'])).toBeUndefined();
    });
    expect(client.getQueryData(['session'])).toBeUndefined();
    // The guard must not read the session again between the end of the session and the move to Masuk
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/v1/auth/me'))).toHaveLength(0);
    const logout = fetchMock.mock.calls.find(([url]) => url.endsWith('/v1/auth/logout'));
    expect(logout?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Requested-With': 'aethera' }) as unknown,
    });
  });

  it('counts a 401 as done, because no session is left to end', async () => {
    stubApi({
      'POST /v1/auth/logout': { status: 401, body: { code: 'unauthorized', message: 'No' } },
    });
    const router = renderAt('/lainnya/keluar');

    await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/masuk');
    });
  });

  it('stays on the screen and says so when the session could not be ended', async () => {
    stubApi({});
    const router = renderAt('/lainnya/keluar');

    await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
    expect(router.state.location.pathname).toBe('/lainnya/keluar');
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeEnabled();
  });

  it('does not call the API twice when the button is pressed twice', async () => {
    const fetchMock = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/lainnya/keluar');

    await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sedang keluar' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('the way to Keluar', () => {
  it('is a row in the menu Lainnya', () => {
    stubApi({});
    renderAt('/lainnya');

    expect(screen.getByRole('link', { name: /Akhiri sesi/ })).toHaveAttribute(
      'href',
      '/lainnya/keluar',
    );
  });

  it('is an item in the sidebar, above the name of the business', () => {
    stubApi({});
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Keluar' })).toHaveAttribute('href', '/lainnya/keluar');
    expect(screen.getByText('Konveksi Maju Jaya')).toBeInTheDocument();
  });
});
