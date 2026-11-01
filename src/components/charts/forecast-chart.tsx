import { ChartLegend, type LegendItem } from '@/components/charts/chart-legend';
import { linePath, scale, xAt } from '@/components/charts/chart-math';
import { useElementWidth } from '@/components/charts/use-element-width';

export interface ForecastChartProps {
  // The bill so far, one value for each day from the first day until today
  billPoints: number[];
  // The number of days in the month, so that today sits at the right place
  days: number;
  // The bill at the end of the month if nothing changes
  projectedTotal: number;
  // The bill at the end of the month if the tips are used from the first day
  potentialTotal?: number;
  yMax: number;
  yLabels: [string, string, string];
  xLabels: { start: string; today: string };
  // The name of the chart for assistive technology
  label: string;
  legend: LegendItem[];
}

const HEIGHT = 136;
const TOP = 17;
const PLOT = 95;
const LEFT = 44;
const RIGHT_PAD = 18;
const FALLBACK_WIDTH = 324;
// The room that the start label needs before the label of today, and half the width of the label of today
const START_LABEL_ROOM = 80;
const TODAY_LABEL_HALF = 26;

export function ForecastChart({
  billPoints,
  days,
  projectedTotal,
  potentialTotal,
  yMax,
  yLabels,
  xLabels,
  label,
  legend,
}: ForecastChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const plotWidth = Math.max(width - LEFT - RIGHT_PAD, 1);
  const yAt = (value: number) => TOP + PLOT - scale(value, yMax, PLOT);
  const xDay = (day: number) => LEFT + xAt(day, days, plotWidth);
  const bill = billPoints.map((value, day) => [xDay(day), yAt(value)] as const);
  const today = bill.at(-1);
  const end = [xDay(days - 1), yAt(projectedTotal)] as const;
  const ticks = [TOP, TOP + PLOT / 2, TOP + PLOT] as const;

  return (
    <div ref={ref} className="flex w-full min-w-0 flex-col gap-3">
      <svg role="img" aria-label={label} width={width} height={HEIGHT} className="block">
        {ticks.map((y, index) => (
          <g key={y}>
            <line
              x1={LEFT}
              x2={LEFT + plotWidth}
              y1={y}
              y2={y}
              className="stroke-border-2"
              strokeWidth="1"
            />
            <text x="0" y={y + 4} className="fill-text-2 text-label">
              {yLabels[ticks.length - 1 - index]}
            </text>
          </g>
        ))}
        {potentialTotal === undefined ? null : (
          <path
            d={linePath([
              [LEFT, yAt(0)],
              [xDay(days - 1), yAt(potentialTotal)],
            ])}
            fill="none"
            className="stroke-chart-blurple"
            strokeWidth="2"
            strokeDasharray="2 3"
          />
        )}
        {today ? (
          <path
            d={linePath([today, end])}
            fill="none"
            className="stroke-text-2"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        ) : null}
        <path
          d={linePath(bill)}
          fill="none"
          className="stroke-chart-blurple"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {today ? <circle cx={today[0]} cy={today[1]} r="4" className="fill-chart-blurple" /> : null}
        {/* Early in the month the two labels would sit on top of each other, so the start label gives way */}
        {!today || today[0] - LEFT > START_LABEL_ROOM ? (
          <text x={LEFT} y={TOP + PLOT + 18} className="fill-text-2 text-label">
            {xLabels.start}
          </text>
        ) : null}
        {today ? (
          <text
            x={today[0]}
            y={TOP + PLOT + 18}
            textAnchor={today[0] > width - TODAY_LABEL_HALF ? 'end' : 'middle'}
            className="fill-text-2 text-label"
          >
            {xLabels.today}
          </text>
        ) : null}
      </svg>
      <ChartLegend items={legend} />
    </div>
  );
}
