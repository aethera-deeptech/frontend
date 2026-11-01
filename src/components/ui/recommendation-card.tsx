import { Button } from '@/components/ui/button';

interface RecommendationCardProps {
  title: string;
  // The saving as text, for example "Perkiraan hemat sekitar Rp118.000 per bulan"
  saving: string;
  deviceName: string;
  onApply: () => void;
  onDefer: () => void;
  // The buttons wait while a decision is being sent
  busy?: boolean;
}

// A tip with the two decisions. The buttons stack under the text on a phone and sit at the right on a wide screen.
export function RecommendationCard({
  title,
  saving,
  deviceName,
  onApply,
  onDefer,
  busy = false,
}: RecommendationCardProps) {
  return (
    <section className="border-border-1 bg-bg-1 flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-h2 text-text-heading">{title}</h3>
        <p className="text-body text-text-2">{saving}</p>
        <p className="text-label text-text-2">{deviceName}</p>
      </div>
      <div className="flex gap-2">
        <Button
          kind="accent"
          size="lg"
          className="flex-1 lg:h-9 lg:flex-none lg:rounded-md"
          disabled={busy}
          onClick={onApply}
        >
          Terapkan
        </Button>
        <Button
          size="lg"
          className="flex-1 lg:h-9 lg:flex-none lg:rounded-md"
          disabled={busy}
          onClick={onDefer}
        >
          Nanti
        </Button>
      </div>
    </section>
  );
}
