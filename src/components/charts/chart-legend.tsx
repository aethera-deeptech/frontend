import { cn } from '@/lib/cn';

export type LegendLine = 'solid' | 'dashed' | 'dotted';

export interface LegendItem {
  line: LegendLine;
  text: string;
  // The line is in the text color instead of the chart color
  muted?: boolean;
}

const dashes: Record<LegendLine, string | undefined> = {
  solid: undefined,
  dashed: '4 4',
  dotted: '2 3',
};

// A key for the lines of a chart. Each line has its own pattern, so the key does not depend on color.
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-2">
          <svg width="28" height="4" aria-hidden="true" className="shrink-0">
            <line
              x1="0"
              y1="2"
              x2="28"
              y2="2"
              strokeWidth="2"
              strokeDasharray={dashes[item.line]}
              className={cn(item.muted ? 'stroke-text-2' : 'stroke-chart-blurple')}
            />
          </svg>
          <span className="text-label text-text-2">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
