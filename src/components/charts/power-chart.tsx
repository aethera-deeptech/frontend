import { bandPath, linePath, scale, xAt } from '@/components/charts/chart-math';
import { useElementWidth } from '@/components/charts/use-element-width';

export interface PowerChartProps {
  // The power in watts, spread evenly over the day
  points: number[];
  // The top of the y axis in watts
  yMax: number;
  // The usual range for each point. It has as many values as points.
  expected?: { low: number[]; high: number[] };
  // The stretch of points that is not normal, by index
  anomaly?: { from: number; to: number; label: string };
  xLabels: [string, string, string];
  yLabels: [string, string, string];
  // The name of the chart for assistive technology
  label: string;
  legend?: string;
}

const HEIGHT = 144;
const TOP = 22;
const PLOT = 90;
const FALLBACK_WIDTH = 324;

export function PowerChart({
  points,
  yMax,
  expected,
  anomaly,
  xLabels,
  yLabels,
  label,
  legend,
}: PowerChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const count = points.length;
  const at = (value: number, index: number) =>
    [xAt(index, count, width), TOP + PLOT - scale(value, yMax, PLOT)] as const;
  const line = points.map(at);
  const band = expected ? bandPath(expected.low.map(at), expected.high.map(at)) : undefined;
  const bad = anomaly ? line.slice(anomaly.from, anomaly.to + 1) : [];
  const ticks = [TOP, TOP + PLOT / 2, TOP + PLOT] as const;

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <svg role="img" aria-label={label} width={width} height={HEIGHT} className="block">
        {ticks.map((y, index) => (
          <g key={y}>
            <line x1="0" x2={width} y1={y} y2={y} className="stroke-border-2" strokeWidth="1" />
            <text x={width} y={y - 4} textAnchor="end" className="fill-text-2 text-label">
              {yLabels[ticks.length - 1 - index]}
            </text>
          </g>
        ))}
        {band ? <path d={band} className="fill-bg-3 stroke-border-field" strokeWidth="1" /> : null}
        <path
          d={linePath(line)}
          fill="none"
          className="stroke-chart-blurple"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {bad.length > 1 ? (
          <path
            d={linePath(bad)}
            fill="none"
            className="stroke-chart-anomaly"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : null}
        {anomaly ? (
          <text x={at(0, anomaly.from)[0] + 8} y="12" className="fill-text-danger text-label">
            {anomaly.label}
          </text>
        ) : null}
        <text x="0" y={TOP + PLOT + 18} className="fill-text-2 text-label">
          {xLabels[0]}
        </text>
        <text
          x={width / 2}
          y={TOP + PLOT + 18}
          textAnchor="middle"
          className="fill-text-2 text-label"
        >
          {xLabels[1]}
        </text>
        <text x={width} y={TOP + PLOT + 18} textAnchor="end" className="fill-text-2 text-label">
          {xLabels[2]}
        </text>
      </svg>
      {legend ? <p className="text-label text-text-2">{legend}</p> : null}
    </div>
  );
}
