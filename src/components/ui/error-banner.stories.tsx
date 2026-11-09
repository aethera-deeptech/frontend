import type { Meta, StoryObj } from '@storybook/react-vite';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';

// The sample text only lives in this story. The app has no sample data.
const meta = {
  title: 'UI/Error banner',
  decorators: [
    (Story) => (
      <div className="flex max-w-sm flex-col gap-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const busy = new ApiError(503, { code: 'busy', retryAfterSeconds: 2 });
const failed = new ApiError(500);

// A read that failed, as it looks for an error and for a busy service
export const Read: Story = {
  render: () => (
    <>
      <ErrorBanner
        error={failed}
        title="Daftar alat tidak bisa dimuat"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        action={<Button size="lg">Coba lagi</Button>}
      />
      <ErrorBanner
        error={busy}
        title="Daftar alat tidak bisa dimuat"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        action={<Button size="lg">Coba lagi</Button>}
      />
    </>
  ),
};

// A write that failed. A busy write may have been saved, so its title does not say "not saved".
export const Write: Story = {
  render: () => (
    <>
      <ErrorBanner
        error={failed}
        kind="write"
        title="Pilihan belum tersimpan"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
      />
      <ErrorBanner
        error={busy}
        kind="write"
        title="Pilihan belum tersimpan"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
      />
      <ErrorBanner
        error={busy}
        kind="write"
        busyTitle="Belum pasti terkirim"
        busyMessage="Sistem sedang sibuk. Perintah mungkin sudah terkirim. Periksa status colokan, lalu coba lagi jika perlu."
        title="Perintah belum terkirim"
        message="Periksa sambungan Anda, lalu coba lagi."
      />
    </>
  ),
};
