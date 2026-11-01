import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/chevron-right-icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface RecommendationCardProps {
  title: string;
  // The saving as text, for example "Perkiraan hemat sekitar Rp118.000 per bulan"
  saving: string;
  // A line under the saving, for example the device or a status tag
  meta?: ReactNode;
  // The title becomes a link to the detail and the whole card reacts to a tap
  to?: string;
  // Buttons under the text on a phone and at the right on a wide screen
  actions?: ReactNode;
  // The card that is open in the detail next to the list
  selected?: boolean;
}

export function RecommendationCard({
  title,
  saving,
  meta,
  to,
  actions,
  selected = false,
}: RecommendationCardProps) {
  const titleId = useId();

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'bg-bg-1 relative flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:gap-4',
        selected ? 'border-text-accent border-2 p-[15px]' : 'border-border-1',
      )}
    >
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', to && 'pr-6 lg:pr-0')}>
        <h3 id={titleId} className="text-h2 text-text-heading">
          {to ? (
            // The link covers the whole card. The buttons sit above it, so they keep working.
            <Link
              to={to}
              aria-current={selected ? 'true' : undefined}
              className="rounded-md after:absolute after:inset-0 after:rounded-lg"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="text-body text-text-2">{saving}</p>
        {meta}
      </div>
      {actions ? <div className="relative z-10 flex gap-2">{actions}</div> : null}
      {to ? (
        <ChevronRightIcon className="text-text-2 pointer-events-none absolute top-4 right-4 lg:hidden" />
      ) : null}
    </article>
  );
}

interface DecisionButtonsProps {
  onApply: () => void;
  onDefer: () => void;
  // The buttons wait while a decision is being sent
  busy?: boolean;
  // The tip that the buttons act on. A screen reader hears it in the name, so three tips do not give three buttons that
  // share one name.
  subject?: string;
}

// The two choices on a tip that waits for a decision. They are side by side and share the width on a phone.
export function DecisionButtons({ onApply, onDefer, busy = false, subject }: DecisionButtonsProps) {
  return (
    <>
      <Button
        kind="accent"
        size="lg"
        className="flex-1 lg:h-9 lg:flex-none lg:rounded-md"
        disabled={busy}
        aria-label={subject ? `Terapkan: ${subject}` : undefined}
        onClick={onApply}
      >
        Terapkan
      </Button>
      <Button
        size="lg"
        className="flex-1 lg:h-9 lg:flex-none lg:rounded-md"
        disabled={busy}
        aria-label={subject ? `Nanti: ${subject}` : undefined}
        onClick={onDefer}
      >
        Nanti
      </Button>
    </>
  );
}
