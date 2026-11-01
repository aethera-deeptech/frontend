import { cva } from 'class-variance-authority';

import { scale } from '@/components/charts/chart-math';
import { cn } from '@/lib/cn';

export type BarSeries = 'blurple' | 'indigo' | 'pink' | 'orange';

export interface BarItem {
  label: string;
  value: number;
  // The text at the end of the row. It defaults to the value.
  display?: string;
  series?: BarSeries;
}

const barVariants = cva('block h-full rounded-[5px]', {
  variants: {
    series: {
      blurple: 'bg-chart-blurple',
      indigo: 'bg-chart-indigo',
      pink: 'bg-chart-pink',
      orange: 'bg-chart-orange',
    },
  },
  defaultVariants: { series: 'blurple' },
});

// Horizontal bars that share one scale. The numbers are text, so the bars add nothing a screen reader would miss.
export function BarChart({
  items,
  className,
  ...props
}: {
  items: BarItem[];
  className?: string;
  'aria-label'?: string;
}) {
  const max = Math.max(0, ...items.map((item) => (Number.isFinite(item.value) ? item.value : 0)));

  return (
    // The list style is reset by the base styles, and Safari then drops the list role, so the role is set again
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" className={cn('flex flex-col gap-2', className)} {...props}>
      {items.map((item, index) => (
        <li key={`${item.label}-${index.toString()}`} className="flex items-center gap-2">
          <span className="text-body text-text-2 w-24 shrink-0">{item.label}</span>
          <span aria-hidden="true" className="bg-bg-3 h-2.5 flex-1 rounded-[5px]">
            <span
              className={barVariants({ series: item.series })}
              style={{ width: `${scale(item.value, max, 100).toString()}%` }}
            />
          </span>
          <span className="text-body text-text-1 w-14 shrink-0 text-right">
            {item.display ?? item.value.toString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
