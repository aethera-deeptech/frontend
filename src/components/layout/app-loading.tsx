import { SkeletonCard } from '@/components/ui/skeleton-card';

// What the app shows while the first page is still being fetched, before the shell can draw
export function AppLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-4">
      <SkeletonCard label="Memuat aplikasi" />
    </main>
  );
}
