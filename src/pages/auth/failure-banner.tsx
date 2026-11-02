import type { ReactNode } from 'react';

import type { AuthFailure } from '@/api/auth';
import { Banner } from '@/components/ui/banner';

// "30 detik" up to two minutes, then whole minutes rounded up
function waitText(seconds: number | undefined): string {
  if (seconds === undefined) {
    return 'nanti';
  }
  return seconds <= 120
    ? `dalam ${seconds.toString()} detik`
    : `dalam ${Math.ceil(seconds / 60).toString()} menit`;
}

interface FailureBannerProps {
  failure: AuthFailure;
  retryAfterSeconds?: number;
  // A button for the failures that a retry can fix
  action?: ReactNode;
}

// The answer to a call that failed for a reason that no screen has a text of its own for. The texts do not say which emails
// have an account, because the API does not.
export function FailureBanner({ failure, retryAfterSeconds, action }: FailureBannerProps) {
  switch (failure) {
    case 'offline':
      return (
        <Banner
          tone="danger"
          title="Tidak bisa terhubung"
          message="Periksa koneksi internet Anda, lalu coba lagi."
          action={action}
        />
      );
    case 'rate-limited':
      return (
        <Banner
          tone="warning"
          title="Terlalu banyak percobaan"
          message={`Coba lagi ${waitText(retryAfterSeconds)}.`}
          action={action}
        />
      );
    case 'invalid-input':
      return (
        <Banner
          tone="danger"
          title="Periksa isian Anda"
          message="Ada isian yang belum sesuai. Periksa lalu coba lagi."
        />
      );
    default:
      return (
        <Banner
          tone="danger"
          title="Terjadi kesalahan"
          message="Coba lagi beberapa saat lagi."
          action={action}
        />
      );
  }
}
