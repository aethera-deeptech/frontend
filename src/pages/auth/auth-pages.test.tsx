import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PasswordField } from '@/pages/auth/password-field';
import { renderAt, stubApi } from '@/test/stub-api';

describe('Masuk', () => {
  it('shows the form outside the app shell with everything disabled', () => {
    stubApi({});
    renderAt('/masuk');

    expect(screen.getByRole('heading', { level: 1, name: 'Masuk' })).toBeVisible();
    expect(screen.getByText('Masuk untuk melihat saran penghematan usaha Anda.')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Masuk belum tersedia');
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Kata sandi')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lanjut dengan Google' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Tampilkan kata sandi' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Lanjut dengan Google' }),
    ).toHaveAccessibleDescription(/Masuk belum tersedia/);
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument();
    expect(document.title).toBe('Masuk · WATTLINK');
  });

  it('links the brand to the home page, the only way out of a screen where nothing works', () => {
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
});

describe('Daftar', () => {
  it('shows the form with everything disabled', () => {
    stubApi({});
    renderAt('/daftar');

    expect(screen.getByRole('heading', { level: 1, name: 'Daftar' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Daftar belum tersedia');
    expect(screen.getByLabelText('Nama usaha')).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Kata sandi')).toBeDisabled();
    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription('Minimal 8 karakter.');
    expect(screen.getByRole('button', { name: 'Daftar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Daftar dengan Google' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Tampilkan kata sandi' })).toBeDisabled();
    expect(document.title).toBe('Daftar · WATTLINK');
  });

  it('links to the login', async () => {
    stubApi({});
    const router = renderAt('/daftar');

    await userEvent.click(screen.getByRole('link', { name: 'Masuk' }));

    expect(router.state.location.pathname).toBe('/masuk');
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
