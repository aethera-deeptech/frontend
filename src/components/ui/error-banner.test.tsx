import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/client';
import {
  busyReadMessage,
  busyWriteMessage,
  busyWriteTitle,
  ErrorBanner,
} from '@/components/ui/error-banner';

const busy = new ApiError(503, { code: 'busy', retryAfterSeconds: 2 });

describe('ErrorBanner', () => {
  it('shows the title and the message that it is given for any other failure', () => {
    render(
      <ErrorBanner
        error={new ApiError(500)}
        title="Daftar tidak bisa dimuat"
        message="Coba lagi."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Daftar tidak bisa dimuat');
    expect(screen.getByRole('alert')).toHaveTextContent('Coba lagi.');
  });

  it('shows the same banner for a failure that is not an answer of the API', () => {
    render(<ErrorBanner error={new Error('x')} title="Judul" message="Pesan." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Pesan.');
  });

  it('keeps the title of a read and says that the system is busy, as a warning that is not an alert', () => {
    render(<ErrorBanner error={busy} title="Daftar tidak bisa dimuat" message="Coba lagi." />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Daftar tidak bisa dimuat');
    expect(screen.getByRole('status')).toHaveTextContent(busyReadMessage);
    expect(screen.queryByText('Coba lagi.')).not.toBeInTheDocument();
  });

  it('does not say that a busy write was not saved, because it may have been', () => {
    render(
      <ErrorBanner
        error={busy}
        kind="write"
        title="Pilihan belum tersimpan"
        message="Coba lagi."
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(busyWriteTitle);
    expect(screen.getByRole('status')).toHaveTextContent(busyWriteMessage);
    expect(screen.queryByText('Pilihan belum tersimpan')).not.toBeInTheDocument();
  });

  it('uses the title and the text of the screen for a busy write when it has them', () => {
    render(
      <ErrorBanner
        error={busy}
        kind="write"
        busyTitle="Belum pasti terkirim"
        busyMessage="Periksa status colokan."
        title="Perintah belum terkirim"
        message="Coba lagi."
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Belum pasti terkirim');
    expect(screen.getByRole('status')).toHaveTextContent('Periksa status colokan.');
  });
});
