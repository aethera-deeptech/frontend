import type { ReactNode } from 'react';

import { useSettings, type Settings } from '@/api/settings';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';

// Shows the loading card or the error until the settings are there, then hands them to its child.
export function SettingsGate({
  children,
  fallback = (content) => content,
}: {
  children: (settings: Settings) => ReactNode;
  // Wraps the loading card and the error, for a screen that keeps its header while the settings load
  fallback?: (content: ReactNode) => ReactNode;
}) {
  const query = useSettings();

  if (query.data) {
    return <>{children(query.data)}</>;
  }
  if (query.isPending) {
    return <>{fallback(<SkeletonCard label="Memuat pengaturan" />)}</>;
  }
  return fallback(
    <ErrorBanner
      error={query.error}
      title="Pengaturan tidak bisa dimuat"
      message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
      action={
        <Button
          size="lg"
          onClick={() => {
            void query.refetch();
          }}
        >
          Coba lagi
        </Button>
      }
    />,
  );
}
