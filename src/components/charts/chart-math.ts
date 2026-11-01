// Small helpers that turn data into SVG coordinates. The charts hold no data of their own.

export function scale(value: number, max: number, size: number): number {
  if (max <= 0) {
    return 0;
  }
  return (Math.min(Math.max(value, 0), max) / max) * size;
}

// The points are spread evenly over the width, the first on the left edge and the last on the right edge
export function xAt(index: number, count: number, width: number): number {
  if (count <= 1) {
    return 0;
  }
  return (index / (count - 1)) * width;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function linePath(coordinates: readonly (readonly [number, number])[]): string {
  return coordinates
    .map(
      ([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x).toString()} ${round(y).toString()}`,
    )
    .join(' ');
}

// A closed shape between a lower and an upper line, for the band of expected values
export function bandPath(
  lower: readonly (readonly [number, number])[],
  upper: readonly (readonly [number, number])[],
): string {
  const down = [...upper].reverse();
  return `${linePath(lower)} ${linePath(down).replace(/^M/, 'L')} Z`;
}
