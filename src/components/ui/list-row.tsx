import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/chevron-right-icon';
import { StatusDot, type DeviceStatus } from '@/components/ui/status-dot';
import { cn } from '@/lib/cn';

interface ListRowProps {
  title: string;
  secondary?: string;
  status?: DeviceStatus;
  value?: string;
  valueNote?: string;
  // The row becomes a link and shows the chevron
  to?: string;
  // The row that is open in the detail next to the list
  selected?: boolean;
  className?: string;
}

// A row of a list. Put it inside a ul.
export function ListRow({
  title,
  secondary,
  status,
  value,
  valueNote,
  to,
  selected = false,
  className,
}: ListRowProps) {
  const content: ReactNode = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body text-text-heading break-words">{title}</span>
        {status || secondary ? (
          <span className="flex items-center gap-2">
            {status ? <StatusDot status={status} /> : null}
            {secondary ? <span className="text-label text-text-2">{secondary}</span> : null}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="flex max-w-[60%] shrink-0 flex-col items-end gap-1 text-right wrap-anywhere">
          <span className="text-body text-text-1">{value}</span>
          {valueNote ? <span className="text-label text-text-2">{valueNote}</span> : null}
        </span>
      ) : null}
      {to ? <ChevronRightIcon className="text-text-2 shrink-0" /> : null}
    </>
  );

  return (
    <li
      className={cn(
        'border-border-2 border-b',
        selected && '-mx-4 bg-bg-accent-muted px-4',
        className,
      )}
    >
      {to ? (
        <Link
          to={to}
          aria-current={selected ? 'true' : undefined}
          className="flex min-h-11 items-center gap-3 py-3"
        >
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-3">{content}</div>
      )}
    </li>
  );
}
