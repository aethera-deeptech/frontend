import { Card } from '@/components/ui/card';

// The loading look of a card. The three bars stand for a label, a value and a line of text.
export function SkeletonCard({ label = 'Memuat data Anda' }: { label?: string }) {
  return (
    <Card className="gap-3" role="status" aria-busy="true">
      <span aria-hidden="true" className="bg-bg-3 h-3 w-30 rounded-[5px]" />
      <span aria-hidden="true" className="bg-bg-3 h-7 w-55 rounded-[5px]" />
      <span aria-hidden="true" className="bg-bg-3 h-2.5 w-full rounded-[5px]" />
      <p className="text-label text-text-2">{label}</p>
    </Card>
  );
}
