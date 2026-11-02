import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PasswordField } from '@/pages/auth/password-field';
import { createQueryClient } from '@/api/query-client';
import { renderAt, stubApi } from '@/test/stub-api';

const me = { email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' };

function bodyOf(fetchMock: ReturnType<typeof stubApi>, path: string): unknown {
  const call = fetchMock.mock.calls.find(([url]) => new URL(url).pathname === path);
  const init = call?.[1];

  return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
}

// The countdown reads the clock, so a test that checks the number freezes the date. The timers stay real.
function freezeClock() {
  vi.useFakeTimers({ toFake: ['Date'] });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Masuk', () => {
  it('shows the form outside the app shell', () => {
    stubApi({});
    renderAt('/masuk');

    expect(screen.getByRole('heading', { level: 1, name: 'Masuk' })).toBeVisible();
    expect(screen.getByText('Masuk untuk melihat saran penghematan usaha Anda.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeEnabled();
    expect(screen.getByLabelText('Kata sandi')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lanjut dengan Google' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Lanjut dengan Google' }),
    ).toHaveAccessibleDescription('Masuk dengan Google belum tersedia.');
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument();
    expect(document.title).toBe('Masuk · WATTLINK');
  });

  it('puts the focus on the heading, because the screen can open from a link that is gone', () => {
    stubApi({});
    renderAt('/masuk');

    expect(screen.getByRole('heading', { level: 1, name: 'Masuk' })).toHaveFocus();
  });

  it('links the brand to the home page', () => {
    stubApi({});
    renderAt('/masuk');

    expect(screen.getByRole('link', { name: 'WATTLINK' })).toHaveAttribute('href', '/');
  });

  it('links to the registration', async () => {
    stubApi({});
    const router = renderAt('/masuk');

    await userEvent.click(screen.getByRole('link', { name: 'Daftar' }));

    expect(router.state.location.pathname).toBe('/daftar');
  });

  it('asks for the email and the password before it calls the API', async () => {
    const fetchMock = stubApi({});
    renderAt('/masuk');

    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Isi email Anda.');
    expect(screen.getByLabelText('Email')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription('Isi kata sandi Anda.');
    expect(screen.getByLabelText('Kata sandi')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says that an email is not valid', async () => {
    stubApi({});
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Isi email yang valid.');
  });

  it('signs in, keeps the answer as the session and opens the home screen', async () => {
    const fetchMock = stubApi({ 'POST /v1/auth/login': { body: me } });
    const router = renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), ' dewi@example.com ');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(bodyOf(fetchMock, '/v1/auth/login')).toEqual({
      email: 'dewi@example.com',
      password: 'rahasia123',
    });
  });

  it('shows the label of the button and holds the form while it signs in', async () => {
    // An answer that never comes keeps the call in flight
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('button', { name: 'Sedang masuk' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // The controls stay enabled so the focus is not lost, and a second press does nothing
    expect(screen.getByRole('button', { name: 'Sedang masuk' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByLabelText('Email')).toBeEnabled();
  });

  it('says that the email or the password does not match, in one text for both', async () => {
    stubApi({
      'POST /v1/auth/login': {
        status: 401,
        body: { code: 'invalid_credentials', message: 'No' },
      },
    });
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'salah');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tidak bisa masukEmail atau kata sandi tidak cocok. Periksa lalu coba lagi.',
    );
  });

  it('offers a new verification email when the email is not verified and opens the timer screen', async () => {
    freezeClock();
    const fetchMock = stubApi({
      'POST /v1/auth/login': {
        status: 403,
        body: { code: 'email_not_verified', message: 'No' },
      },
      'POST /v1/auth/resend-verification': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    const router = renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Email belum diverifikasi')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Kirim ulang email' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/verifikasi');
    });
    expect(bodyOf(fetchMock, '/v1/auth/resend-verification')).toEqual({
      email: 'dewi@example.com',
    });
    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 60 detik' }, { timeout: 3000 }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('says how long to wait when the API limits the tries', async () => {
    stubApi({
      'POST /v1/auth/login': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 30 },
      },
    });
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Coba lagi dalam 30 detik.')).toBeVisible();
  });

  it('drops what the cache held for another account', async () => {
    stubApi({ 'POST /v1/auth/login': { body: me } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['beranda'], { businessName: 'Usaha lain' });
    renderAt('/masuk', undefined, { client });

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(client.getQueryData(['session'])).toEqual(me);
    });
    expect(client.getQueryData(['beranda'])).toBeUndefined();
  });

  it('sends the new email to the address that the API answered for, not to what the field says now', async () => {
    const fetchMock = stubApi({
      'POST /v1/auth/login': {
        status: 403,
        body: { code: 'email_not_verified', message: 'No' },
      },
      'POST /v1/auth/resend-verification': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Kirim ulang email' }));

    expect(bodyOf(fetchMock, '/v1/auth/resend-verification')).toEqual({
      email: 'dewi@example.com',
    });
  });

  it('opens the timer screen with the wait that the API names when a resend came too soon', async () => {
    freezeClock();
    stubApi({
      'POST /v1/auth/login': {
        status: 403,
        body: { code: 'email_not_verified', message: 'No' },
      },
      'POST /v1/auth/resend-verification': {
        status: 429,
        body: { code: 'resend_too_soon', message: 'Wait', retryAfterSeconds: 45 },
      },
    });
    const router = renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Kirim ulang email' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/verifikasi');
    });
    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 45 detik' }, { timeout: 3000 }),
    ).toBeVisible();
  });

  it('says that the fields are not right when the API refuses them', async () => {
    stubApi({
      'POST /v1/auth/login': { status: 422, body: { code: 'validation_failed', message: 'No' } },
    });
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Periksa isian Anda')).toBeVisible();
  });

  it('does nothing when the form is sent again while the first call runs', async () => {
    const fetchMock = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123{Enter}');
    await userEvent.type(screen.getByLabelText('Kata sandi'), '{Enter}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send the verification email twice while the first one is on its way', async () => {
    const fetchMock = vi.fn((input: string) =>
      new URL(input).pathname === '/v1/auth/login'
        ? Promise.resolve(
            new Response(JSON.stringify({ code: 'email_not_verified', message: 'No' }), {
              status: 403,
            }),
          )
        : new Promise<Response>(() => undefined),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    const resend = await screen.findByRole('button', { name: 'Kirim ulang email' });
    await userEvent.click(resend);
    await userEvent.click(resend);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('says to try later when the limit names no wait', async () => {
    stubApi({
      'POST /v1/auth/login': { status: 429, body: { code: 'rate_limited', message: 'Slow' } },
    });
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Coba lagi nanti.')).toBeVisible();
  });

  it('says that the connection is lost', async () => {
    stubApi({});
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
  });

  it('says that something went wrong for a failure of the server', async () => {
    stubApi({ 'POST /v1/auth/login': { status: 500, body: { code: 'internal', message: 'No' } } });
    renderAt('/masuk');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Terjadi kesalahan')).toBeVisible();
  });
});

describe('Daftar', () => {
  it('shows the form with the Google button off', () => {
    stubApi({});
    renderAt('/daftar');

    expect(screen.getByRole('heading', { level: 1, name: 'Daftar' })).toBeVisible();
    expect(screen.getByLabelText('Nama usaha')).toBeEnabled();
    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription('Minimal 8 karakter.');
    expect(screen.getByRole('button', { name: 'Daftar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Daftar dengan Google' })).toBeDisabled();
    expect(document.title).toBe('Daftar · WATTLINK');
  });

  it('links to the login', async () => {
    stubApi({});
    const router = renderAt('/daftar');

    await userEvent.click(screen.getByRole('link', { name: 'Masuk' }));

    expect(router.state.location.pathname).toBe('/masuk');
  });

  it('names every field that is empty and focuses the first one', async () => {
    const fetchMock = stubApi({});
    renderAt('/daftar');

    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(screen.getByLabelText('Nama usaha')).toHaveAccessibleDescription('Isi nama usaha.');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Isi email Anda.');
    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription('Isi kata sandi Anda.');
    expect(screen.getByLabelText('Nama usaha')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('focuses the email when it is the first field that is wrong', async () => {
    const fetchMock = stubApi({});
    renderAt('/daftar');

    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Isi email yang valid.');
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('focuses the password when it is the first field that is wrong', async () => {
    stubApi({});
    renderAt('/daftar');

    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(screen.getByLabelText('Kata sandi')).toHaveFocus();
  });

  it('does nothing when the form is sent again while the first call runs', async () => {
    const fetchMock = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/daftar');

    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123{Enter}');
    await userEvent.type(screen.getByLabelText('Kata sandi'), '{Enter}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for at least 8 characters in the password', async () => {
    const fetchMock = stubApi({});
    renderAt('/daftar');

    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'pendek');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription('Minimal 8 karakter.');
    expect(screen.getByLabelText('Kata sandi')).toBeInvalid();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs up and opens the screen that asks to check the email', async () => {
    const fetchMock = stubApi({
      'POST /v1/auth/register': { status: 201, body: { retryAfterSeconds: 60 } },
    });
    const router = renderAt('/daftar');

    await userEvent.type(screen.getByLabelText('Nama usaha'), ' Maju Jaya ');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/verifikasi');
    });
    expect(bodyOf(fetchMock, '/v1/auth/register')).toEqual({
      businessName: 'Maju Jaya',
      email: 'dewi@example.com',
      password: 'rahasia123',
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Periksa email Anda' })).toBeVisible();
    expect(screen.queryByText(/dewi@example\.com/)).not.toBeInTheDocument();
  });

  it('says that the email has an account, in the field and in the banner', async () => {
    stubApi({
      'POST /v1/auth/register': { status: 409, body: { code: 'email_taken', message: 'No' } },
    });
    renderAt('/daftar');

    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(await screen.findByText('Email sudah terdaftar')).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email sudah terdaftar.');
    expect(screen.getAllByRole('link', { name: 'Masuk' })).toHaveLength(2);

    // The text of the field goes away when the user edits the email
    await userEvent.type(screen.getByLabelText('Email'), 'x');

    expect(screen.queryByText('Email sudah terdaftar')).not.toBeInTheDocument();
  });
});

describe('Daftar, other answers', () => {
  async function fillAndSend() {
    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');
    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));
  }

  it('says how long to wait when the API limits the tries', async () => {
    stubApi({
      'POST /v1/auth/register': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 300 },
      },
    });
    renderAt('/daftar');

    await fillAndSend();

    expect(await screen.findByText('Coba lagi dalam 5 menit.')).toBeVisible();
  });

  it.each([0, -5])(
    'reads a wait of %i in the answer as the usual minute and not as an error',
    async (wait) => {
      freezeClock();
      stubApi({ 'POST /v1/auth/register': { status: 201, body: { retryAfterSeconds: wait } } });
      renderAt('/daftar');

      await fillAndSend();

      expect(
        await screen.findByRole(
          'button',
          { name: 'Kirim ulang dalam 60 detik' },
          { timeout: 3000 },
        ),
      ).toBeVisible();
    },
  );
});

describe('Verifikasi', () => {
  it('goes back to the sign up when no address came with the visit', async () => {
    stubApi({});
    const router = renderAt('/verifikasi');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/daftar');
    });
  });

  it('holds the button until the wait is over', () => {
    stubApi({});
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 60 });

    expect(screen.getByText('Tidak ada email? Periksa folder spam.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Kirim ulang dalam 60 detik' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('does not call the API when the button is pressed while it waits', async () => {
    const fetchMock = stubApi({});
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 60 });

    await userEvent.click(screen.getByRole('button', { name: 'Kirim ulang dalam 60 detik' }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the email again when the wait is over and starts the wait again', async () => {
    const fetchMock = stubApi({
      'POST /v1/auth/resend-verification': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 1 });

    const button = await screen.findByRole(
      'button',
      { name: 'Kirim ulang email' },
      { timeout: 3000 },
    );
    freezeClock();
    await userEvent.click(button);

    expect(await screen.findByText('Email baru sudah dikirim')).toBeVisible();
    // The number reads the clock once a second, so the first picture can show a second more
    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 60 detik' }, { timeout: 3000 }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(bodyOf(fetchMock, '/v1/auth/resend-verification')).toEqual({
      email: 'dewi@example.com',
    });
  });

  it('waits for the time that the API names when a resend came too soon', async () => {
    stubApi({
      'POST /v1/auth/resend-verification': {
        status: 429,
        body: { code: 'resend_too_soon', message: 'Wait', retryAfterSeconds: 45 },
      },
    });
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 1 });

    const ready = await screen.findByRole(
      'button',
      { name: 'Kirim ulang email' },
      { timeout: 3000 },
    );
    freezeClock();
    await userEvent.click(ready);

    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 45 detik' }, { timeout: 3000 }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Email baru sudah dikirim')).not.toBeInTheDocument();
  });

  it('waits again after any 429, not only for the too soon code', async () => {
    stubApi({
      'POST /v1/auth/resend-verification': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 90 },
      },
    });
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 1 });

    const ready = await screen.findByRole(
      'button',
      { name: 'Kirim ulang email' },
      { timeout: 3000 },
    );
    freezeClock();
    await userEvent.click(ready);

    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 90 detik' }, { timeout: 3000 }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('says that the connection is lost when the resend fails', async () => {
    stubApi({});
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 1 });

    const ready = await screen.findByRole(
      'button',
      { name: 'Kirim ulang email' },
      { timeout: 3000 },
    );
    freezeClock();
    await userEvent.click(ready);

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
  });
});

describe('Lupa kata sandi', () => {
  it('is reached from Masuk and shows the form with the focus on the heading', async () => {
    stubApi({});
    renderAt('/masuk');

    await userEvent.click(screen.getByRole('link', { name: 'Lupa kata sandi?' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Lupa kata sandi' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Kembali ke Masuk' })).toHaveAttribute(
      'href',
      '/masuk',
    );
  });

  it('asks for the email before it calls the API', async () => {
    const fetchMock = stubApi({});
    renderAt('/lupa-kata-sandi');

    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Isi email Anda.');
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the link and then shows a screen that does not name the address', async () => {
    freezeClock();
    const fetchMock = stubApi({
      'POST /v1/auth/forgot-password': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    renderAt('/lupa-kata-sandi');

    await userEvent.type(screen.getByLabelText('Email'), ' dewi@example.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Periksa email Anda' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Jika email itu terdaftar, sistem sudah mengirim tautan untuk mengatur ulang kata sandi.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/dewi@example\.com/)).not.toBeInTheDocument();
    expect(bodyOf(fetchMock, '/v1/auth/forgot-password')).toEqual({ email: 'dewi@example.com' });
    expect(screen.getByRole('button', { name: 'Kirim ulang dalam 60 detik' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('sends the link again when the wait is over', async () => {
    const fetchMock = stubApi({
      'POST /v1/auth/forgot-password': { status: 202, body: { retryAfterSeconds: 1 } },
    });
    renderAt('/lupa-kata-sandi');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Kirim ulang email' }, { timeout: 3000 }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => url.endsWith('/v1/auth/forgot-password')),
      ).toHaveLength(2);
    });
  });

  // Sends the first link, then moves the clock past the wait so the button works again
  async function sendFirstLinkAndWait(email: string) {
    await userEvent.type(screen.getByLabelText('Email'), email);
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));
    await screen.findByRole('button', { name: 'Kirim ulang dalam 60 detik' });
    vi.setSystemTime(Date.now() + 61_000);

    return screen.findByRole('button', { name: 'Kirim ulang email' }, { timeout: 3000 });
  }

  it('says that a newer link was sent after a resend, and waits again', async () => {
    freezeClock();
    stubApi({
      'POST /v1/auth/forgot-password': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    renderAt('/lupa-kata-sandi');

    await userEvent.click(await sendFirstLinkAndWait('dewi@example.com'));

    expect(await screen.findByText('Email baru sudah dikirim')).toBeVisible();
    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 60 detik' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('waits for the time that the API names when a resend is limited', async () => {
    freezeClock();
    let calls = 0;
    stubApi({
      'POST /v1/auth/forgot-password': () => {
        calls += 1;
        return calls === 1
          ? { status: 202, body: { retryAfterSeconds: 60 } }
          : {
              status: 429,
              body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 45 },
            };
      },
    });
    renderAt('/lupa-kata-sandi');

    await userEvent.click(await sendFirstLinkAndWait('dewi@example.com'));

    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 45 detik' }, { timeout: 3000 }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Email baru sudah dikirim')).not.toBeInTheDocument();
  });

  it('says that the connection is lost when a resend fails', async () => {
    freezeClock();
    let calls = 0;
    const fetchMock = stubApi({
      'POST /v1/auth/forgot-password': () => {
        calls += 1;
        return { status: 202, body: { retryAfterSeconds: 60 } };
      },
    });
    renderAt('/lupa-kata-sandi');
    const resend = await sendFirstLinkAndWait('dewi@example.com');
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('offline')));

    await userEvent.click(resend);

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
    expect(calls).toBe(1);
  });

  it('does not call the API when the button is pressed while it waits', async () => {
    freezeClock();
    const fetchMock = stubApi({
      'POST /v1/auth/forgot-password': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    renderAt('/lupa-kata-sandi');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 60 detik' }),
    );

    expect(fetchMock.mock.calls.filter(([url]) => url.includes('forgot-password'))).toHaveLength(1);
  });

  it('says how long to wait when the API limits the tries', async () => {
    stubApi({
      'POST /v1/auth/forgot-password': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 30 },
      },
    });
    renderAt('/lupa-kata-sandi');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));

    expect(await screen.findByText('Coba lagi dalam 30 detik.')).toBeVisible();
  });

  it('says that the connection is lost', async () => {
    stubApi({});
    renderAt('/lupa-kata-sandi');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan' }));

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
  });
});

describe('Reset password link', () => {
  const resetToken = 'b'.repeat(43);

  async function fill(password: string, again: string) {
    await userEvent.type(screen.getByLabelText('Kata sandi baru'), password);
    await userEvent.type(screen.getByLabelText('Ulangi kata sandi'), again);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan kata sandi' }));
  }

  it('sends the token and the new password once, removes the token from the address and offers Masuk', async () => {
    const fetchMock = stubApi({ 'POST /v1/auth/reset-password': { status: 204 } });
    const router = renderAt(`/reset-password?token=${resetToken}`, undefined, { strict: true });

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    await fill('rahasia123', 'rahasia123');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kata sandi diperbarui' }),
    ).toBeVisible();
    expect(bodyOf(fetchMock, '/v1/auth/reset-password')).toEqual({
      token: resetToken,
      password: 'rahasia123',
    });
    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/masuk');
    // The form is gone, so the heading of the next screen takes the focus
    expect(screen.getByRole('heading', { level: 1, name: 'Kata sandi diperbarui' })).toHaveFocus();
  });

  it('drops the cached session after the reset, because the API ended every session', async () => {
    stubApi({ 'POST /v1/auth/reset-password': { status: 204 } });
    const client = createQueryClient();
    const router = renderAt(`/reset-password?token=${resetToken}`, undefined, { client });
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });

    await fill('rahasia123', 'rahasia123');

    await screen.findByRole('heading', { level: 1, name: 'Kata sandi diperbarui' });
    expect(client.getQueryData(['session'])).toBeUndefined();
  });

  it('names the first field that is wrong and does not call the API', async () => {
    const fetchMock = stubApi({});
    renderAt(`/reset-password?token=${resetToken}`);

    await fill('pendek', 'pendek');

    expect(screen.getByLabelText('Kata sandi baru')).toHaveAccessibleDescription(
      'Minimal 8 karakter.',
    );
    expect(screen.getByLabelText('Kata sandi baru')).toBeInvalid();
    expect(screen.getByLabelText('Kata sandi baru')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says that the two passwords are not the same', async () => {
    const fetchMock = stubApi({});
    renderAt(`/reset-password?token=${resetToken}`);

    await fill('rahasia123', 'rahasia124');

    expect(screen.getByLabelText('Ulangi kata sandi')).toHaveAccessibleDescription(
      'Kata sandi tidak sama.',
    );
    expect(screen.getByLabelText('Ulangi kata sandi')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows both passwords with one box', async () => {
    stubApi({});
    renderAt(`/reset-password?token=${resetToken}`);

    expect(screen.getByLabelText('Kata sandi baru')).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tampilkan kata sandi' }));

    expect(screen.getByLabelText('Kata sandi baru')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Ulangi kata sandi')).toHaveAttribute('type', 'text');
  });

  it('says that the link does not work when the token was used or expired, and offers a new one', async () => {
    stubApi({
      'POST /v1/auth/reset-password': {
        status: 410,
        body: { code: 'token_invalid_or_expired', message: 'No' },
      },
    });
    renderAt(`/reset-password?token=${resetToken}`);

    await fill('rahasia123', 'rahasia123');

    expect(await screen.findByText('Tautan tidak berlaku')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Atur ulang kata sandi' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Minta tautan baru' })).toHaveAttribute(
      'href',
      '/lupa-kata-sandi',
    );
    expect(screen.getByRole('link', { name: 'Kembali ke Masuk' })).toHaveAttribute(
      'href',
      '/masuk',
    );
  });

  it('does not show the form for a link with no token or with a token that cannot be real', () => {
    stubApi({});
    renderAt('/reset-password?token=pendek');

    expect(screen.getByText('Tautan tidak berlaku')).toBeVisible();
    expect(screen.queryByLabelText('Kata sandi baru')).not.toBeInTheDocument();
  });

  it('says how long to wait when the API limits the tries, and keeps the form', async () => {
    stubApi({
      'POST /v1/auth/reset-password': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 20 },
      },
    });
    renderAt(`/reset-password?token=${resetToken}`);

    await fill('rahasia123', 'rahasia123');

    expect(await screen.findByText('Coba lagi dalam 20 detik.')).toBeVisible();
    expect(screen.getByLabelText('Kata sandi baru')).toHaveValue('rahasia123');
  });

  it('does not send twice when the form is sent again while the first call runs', async () => {
    const fetchMock = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    renderAt(`/reset-password?token=${resetToken}`);

    await userEvent.type(screen.getByLabelText('Kata sandi baru'), 'rahasia123');
    await userEvent.type(screen.getByLabelText('Ulangi kata sandi'), 'rahasia123{Enter}');
    await userEvent.type(screen.getByLabelText('Ulangi kata sandi'), '{Enter}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('Verify email link', () => {
  const token = 'a'.repeat(43);

  it('sends the token once, signs in and removes the token from the address', async () => {
    const fetchMock = stubApi({ 'POST /v1/auth/verify-email': { body: me } });
    // In strict mode the effect runs twice, and a second send would use up the token
    const router = renderAt(`/verify-email?token=${token}`, undefined, { strict: true });

    expect(await screen.findByRole('heading', { level: 1, name: 'Akun Anda aktif' })).toBeVisible();
    expect(bodyOf(fetchMock, '/v1/auth/verify-email')).toEqual({ token });
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('verify-email'))).toHaveLength(1);
    expect(router.state.location.search).toBe('');

    await userEvent.click(screen.getByRole('link', { name: 'Lanjut' }));

    expect(router.state.location.pathname).toBe('/');
  });

  it('says that the link does not work when the token is used or expired', async () => {
    stubApi({
      'POST /v1/auth/verify-email': {
        status: 410,
        body: { code: 'token_invalid_or_expired', message: 'No' },
      },
    });
    renderAt(`/verify-email?token=${token}`);

    expect(await screen.findByText('Tautan tidak berlaku')).toBeVisible();
    expect(screen.getByText('Tautan sudah dipakai atau kedaluwarsa.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali ke Masuk' })).toHaveAttribute(
      'href',
      '/masuk',
    );
  });

  it('does not call the API for a link with no token or with a token that cannot be real', async () => {
    const fetchMock = stubApi({});
    renderAt('/verify-email?token=pendek');

    expect(await screen.findByText('Tautan tidak berlaku')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks for the address and sends a new link', async () => {
    const fetchMock = stubApi({
      'POST /v1/auth/resend-verification': { status: 202, body: { retryAfterSeconds: 60 } },
    });
    const router = renderAt('/verify-email');

    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan baru' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Isi email Anda.');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan baru' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/verifikasi');
    });
    expect(bodyOf(fetchMock, '/v1/auth/resend-verification')).toEqual({
      email: 'dewi@example.com',
    });
  });

  it('opens the timer screen with the wait of the API when the new link came too soon', async () => {
    freezeClock();
    stubApi({
      'POST /v1/auth/resend-verification': {
        status: 429,
        body: { code: 'resend_too_soon', message: 'Wait', retryAfterSeconds: 45 },
      },
    });
    const router = renderAt('/verify-email');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan baru' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/verifikasi');
    });
    expect(
      await screen.findByRole('button', { name: 'Kirim ulang dalam 45 detik' }, { timeout: 3000 }),
    ).toBeVisible();
  });

  it('shows that the new link could not be sent when the API fails', async () => {
    stubApi({});
    renderAt('/verify-email');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan baru' }));

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
  });

  it('sends the new link once when the button is pressed twice', async () => {
    const fetchMock = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/verify-email');

    await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com{Enter}');
    await userEvent.type(screen.getByLabelText('Email'), '{Enter}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('offers to try again when the API limits the tries, because the token left the address', async () => {
    stubApi({
      'POST /v1/auth/verify-email': {
        status: 429,
        body: { code: 'rate_limited', message: 'Slow', retryAfterSeconds: 20 },
      },
    });
    renderAt(`/verify-email?token=${token}`);

    expect(await screen.findByText('Coba lagi dalam 20 detik.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  });

  it('offers to try again when the connection was lost, and keeps the token for it', async () => {
    let calls = 0;
    const fetchMock = stubApi({
      'POST /v1/auth/verify-email': () => {
        calls += 1;
        return calls === 1
          ? { status: 500, body: { code: 'internal', message: 'No' } }
          : { body: me };
      },
    });
    renderAt(`/verify-email?token=${token}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Akun Anda aktif' })).toBeVisible();
    expect(bodyOf(fetchMock, '/v1/auth/verify-email')).toEqual({ token });
  });
});

describe('PasswordField', () => {
  it('keeps the typed text when the box is ticked', async () => {
    render(<PasswordField label="Kata sandi" />);
    const input = screen.getByLabelText('Kata sandi');

    await userEvent.type(input, 'rahasia123');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tampilkan kata sandi' }));

    expect(input).toHaveValue('rahasia123');
  });

  it('hides the text until the box is ticked', async () => {
    render(<PasswordField label="Kata sandi" />);
    const input = screen.getByLabelText('Kata sandi');

    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tampilkan kata sandi' }));
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tampilkan kata sandi' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
