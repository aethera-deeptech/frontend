import type { ComponentProps } from 'react';

import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';

export const busyReadMessage = 'Sistem sedang sibuk. Coba lagi dalam beberapa detik.';
export const busyWriteTitle = 'Belum pasti tersimpan';
export const busyWriteMessage =
  'Sistem sedang sibuk. Perubahan Anda mungkin sudah tersimpan. Periksa dulu, lalu coba lagi jika perlu.';

type ErrorBannerProps = Omit<ComponentProps<typeof Banner>, 'tone'> & {
  // What the call failed with. A busy answer gets a banner of its own, anything else gets the title and message that are given.
  error: unknown;
  // A write may have been saved just before the service gave up, so its title cannot say "not saved". A read has nothing to save.
  kind?: 'read' | 'write';
  // The title of a busy write that fits a screen better than the common one. A busy read keeps the title of the screen.
  busyTitle?: string;
  // The text of a busy answer that fits a screen better than the common one, for a write and for a read
  busyMessage?: string;
  tone?: ComponentProps<typeof Banner>['tone'];
};

// The banner of a call that failed. A busy service heals itself, so it is a warning and not an error.
export function ErrorBanner({
  error,
  kind = 'read',
  busyTitle,
  busyMessage,
  tone = 'danger',
  title,
  message,
  ...rest
}: ErrorBannerProps) {
  if (error instanceof ApiError && error.busy) {
    return kind === 'write' ? (
      <Banner
        tone="warning"
        title={busyTitle ?? busyWriteTitle}
        message={busyMessage ?? busyWriteMessage}
        {...rest}
      />
    ) : (
      <Banner tone="warning" title={title} message={busyMessage ?? busyReadMessage} {...rest} />
    );
  }
  return <Banner tone={tone} title={title} message={message} {...rest} />;
}
