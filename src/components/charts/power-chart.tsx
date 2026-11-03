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
// The width of one character of the 12 px label text, and the gap between two labels
const LABEL_CHAR_WIDTH = 6.5;
const LABEL_GAP = 8;

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
  // The span is kept inside the points, so a wrong index cannot draw outside the chart
  const from = anomaly ? Math.min(Math.max(anomaly.from, 0), Math.max(count - 1, 0)) : 0;
  const to = anomaly ? Math.min(Math.max(anomaly.to, from), Math.max(count - 1, 0)) : 0;
  const bad = anomaly ? line.slice(from, to + 1) : [];
  const spanStart = at(0, from)[0];
  // The top y label sits at the right edge on nearly the same line, so the anomaly label has to end before it. A label that starts
  // near the right edge, or that would run into the y label, ends at the start of the span instead. The widths of the texts are
  // estimated, because the SVG cannot measure them before it is drawn.
  const labelRight = width - (yLabels[2].length * LABEL_CHAR_WIDTH + LABEL_GAP);
  const labelWidth = anomaly ? anomaly.label.length * LABEL_CHAR_WIDTH : 0;
  const labelAtEnd = spanStart > width * 0.6 || spanStart + LABEL_GAP + labelWidth > labelRight;
  // A label that is too long for the room runs over the left edge, where nothing else is drawn
  const labelX = labelAtEnd
    ? Math.min(Math.max(spanStart - LABEL_GAP, labelWidth), labelRight)
    : spanStart + LABEL_GAP;
  const ticks = [TOP, TOP + PLOT / 2, TOP + PLOT] as const;

  return (
    <div ref={ref} className="flex w-full min-w-0 flex-col gap-2">
      {/* The dot of a one point anomaly can sit on the first or the last point, so the drawing may pass the edge */}
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={HEIGHT}
        className="block max-w-full overflow-visible"
      >
        {ticks.map((y) => (
          <line
            key={y}
            x1="0"
            x2={width}
            y1={y}
            y2={y}
            className="stroke-border-2"
            strokeWidth="1"
          />
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
        {bad.length === 1 && bad[0] ? (
          <circle cx={bad[0][0]} cy={bad[0][1]} r="3.5" className="fill-chart-anomaly" />
        ) : null}
        {/* The labels come after the band and the line, which would hide them at the right edge. The halo keeps them readable on the line. */}
        {ticks.map((y, index) => (
          <text
            key={y}
            x={width}
            y={y - 4}
            textAnchor="end"
            strokeWidth="3"
            strokeLinejoin="round"
            className="fill-text-2 stroke-bg-1 text-label [paint-order:stroke]"
          >
            {yLabels[ticks.length - 1 - index]}
          </text>
        ))}
        {anomaly ? (
          <text
            x={labelX}
            y="12"
            textAnchor={labelAtEnd ? 'end' : 'start'}
            className="fill-text-danger text-label"
          >
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
