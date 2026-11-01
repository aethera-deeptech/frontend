import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';

export const settingsPath = '/lainnya/pengaturan';

interface EditFormProps {
  title: string;
  subtitle: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  failed: boolean;
  // A second action next to Simpan, for example to go back to the default tariff
  extraAction?: ReactNode;
  children: ReactNode;
}

// The frame of every edit screen of Pengaturan. Simpan sends the form and Batal goes back without saving.
export function EditForm({
  title,
  subtitle,
  onSubmit,
  saving,
  failed,
  extraAction,
  children,
}: EditFormProps) {
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 lg:max-w-lg">
      <title>{`${title} · Audit Energi UMKM`}</title>
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={settingsPath}>Kembali</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading lg:text-title">{title}</h1>
        <p className="text-body text-text-2">{subtitle}</p>
      </div>
      {children}
      {failed ? (
        <Banner
          tone="danger"
          title="Pengaturan belum tersimpan"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : null}
      <Button type="submit" kind="accent" size="lg" disabled={saving}>
        Simpan
      </Button>
      {extraAction}
      <Button asChild size="lg">
        <Link to={settingsPath}>Batal</Link>
      </Button>
    </form>
  );
}
