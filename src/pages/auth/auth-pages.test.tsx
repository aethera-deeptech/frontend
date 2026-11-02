import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PasswordField } from '@/pages/auth/password-field';
import { renderAt, stubApi } from '@/test/stub-api';

const me = { email: 'dewi@example.com', emailVerified: true, businessName: 'Maju' };

function bodyOf(fetchMock: ReturnType<typeof stubApi>, path: string): unknown {
  const call = fetchMock.mock.calls.find(([url]) => new URL(url).pathname === path);
  const init = call?.[1];

  return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
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

    expect(await screen.findByRole('button', { name: 'Sedang masuk' })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
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
      await screen.findByRole('button', { name: /^Kirim ulang dalam \d+ detik$/ }),
    ).toBeDisabled();
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
    expect(screen.getByRole('button', { name: 'Kirim ulang dalam 60 detik' })).toBeDisabled();
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
    await userEvent.click(button);

    expect(await screen.findByText('Email baru sudah dikirim')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Kirim ulang dalam \d+ detik$/ })).toBeDisabled();
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

    await userEvent.click(
      await screen.findByRole('button', { name: 'Kirim ulang email' }, { timeout: 3000 }),
    );

    expect(
      await screen.findByRole('button', { name: /^Kirim ulang dalam 4\d detik$/ }),
    ).toBeDisabled();
    expect(screen.queryByText('Email baru sudah dikirim')).not.toBeInTheDocument();
  });

  it('says that the connection is lost when the resend fails', async () => {
    stubApi({});
    renderAt('/verifikasi', { email: 'dewi@example.com', retryAfterSeconds: 1 });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Kirim ulang email' }, { timeout: 3000 }),
    );

    expect(await screen.findByText('Tidak bisa terhubung')).toBeVisible();
  });
});

describe('Verify email link', () => {
  const token = 'a'.repeat(43);

  it('sends the token once, signs in and removes the token from the address', async () => {
    const fetchMock = stubApi({ 'POST /v1/auth/verify-email': { body: me } });
    const router = renderAt(`/verify-email?token=${token}`);

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
