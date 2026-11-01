import { describe, expect, it } from 'vitest';

import { bandPath, linePath, scale, xAt } from '@/components/charts/chart-math';

describe('scale', () => {
  it('maps a value onto the size', () => {
    expect(scale(500, 1000, 90)).toBe(45);
  });

  it('keeps values inside the axis', () => {
    expect(scale(2500, 1000, 90)).toBe(90);
    expect(scale(-5, 1000, 90)).toBe(0);
  });

  it('returns zero for a value or an axis that is not a number', () => {
    expect(scale(Number.NaN, 100, 50)).toBe(0);
    expect(scale(10, Number.NaN, 50)).toBe(0);
    expect(scale(Number.POSITIVE_INFINITY, 100, 50)).toBe(0);
  });

  it('returns zero when the axis has no height', () => {
    expect(scale(5, 0, 90)).toBe(0);
  });
});

describe('xAt', () => {
  it('puts the first point on the left and the last point on the right', () => {
    expect(xAt(0, 5, 100)).toBe(0);
    expect(xAt(4, 5, 100)).toBe(100);
    expect(xAt(2, 5, 100)).toBe(50);
  });

  it('puts a single point on the left', () => {
    expect(xAt(0, 1, 100)).toBe(0);
  });
});

describe('linePath', () => {
  it('starts with a move and continues with lines', () => {
    expect(
      linePath([
        [0, 10],
        [5.123, 20],
        [10, 0],
      ]),
    ).toBe('M0 10 L5.12 20 L10 0');
  });

  it('is empty without points', () => {
    expect(linePath([])).toBe('');
  });
});

describe('bandPath', () => {
  it('goes along the lower line, back along the upper line and closes', () => {
    expect(
      bandPath(
        [
          [0, 10],
          [10, 12],
        ],
        [
          [0, 5],
          [10, 6],
        ],
      ),
    ).toBe('M0 10 L10 12 L10 6 L0 5 Z');
  });
});
