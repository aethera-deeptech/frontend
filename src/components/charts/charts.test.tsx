import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarChart } from '@/components/charts/bar-chart';
import { ForecastChart } from '@/components/charts/forecast-chart';
import { PowerChart } from '@/components/charts/power-chart';

describe('BarChart', () => {
  it('lists every row with its value as text', () => {
    render(
      <BarChart
        aria-label="Energi per alat"
        items={[
          { label: 'Setrika uap', value: 160 },
          { label: 'Mesin jahit 1', value: 80, display: '80 kWh' },
        ]}
      />,
    );

    const rows = within(screen.getByRole('list', { name: 'Energi per alat' })).getAllByRole(
      'listitem',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Setrika uap160');
    expect(rows[1]).toHaveTextContent('Mesin jahit 180 kWh');
  });

  it('sizes the bars against the largest value', () => {
    const { container } = render(
      <BarChart
        items={[
          { label: 'A', value: 200 },
          { label: 'B', value: 50 },
        ]}
      />,
    );

    const bars = container.querySelectorAll<HTMLElement>('li span[style]');

    expect(bars[0]?.style.width).toBe('100%');
    expect(bars[1]?.style.width).toBe('25%');
  });

  it('draws empty bars when every value is zero', () => {
    const { container } = render(<BarChart items={[{ label: 'A', value: 0 }]} />);

    expect(container.querySelector<HTMLElement>('li span[style]')?.style.width).toBe('0%');
  });
});

describe('PowerChart', () => {
  const props = {
    points: [100, 120, 2000, 110, 100],
    yMax: 2000,
    xLabels: ['00:00', '12:00', '24:00'] as [string, string, string],
    yLabels: ['0 W', '1.000 W', '2.000 W'] as [string, string, string],
    label: 'Daya mesin jahit 1 hari ini',
  };

  it('is an image with a name and shows the axis labels', () => {
    render(<PowerChart {...props} legend="Abu-abu berarti kisaran biasa." />);

    const chart = screen.getByRole('img', { name: 'Daya mesin jahit 1 hari ini' });

    expect(chart).toHaveTextContent('2.000 W');
    expect(chart).toHaveTextContent('00:00');
    expect(chart).toHaveTextContent('24:00');
    expect(screen.getByText('Abu-abu berarti kisaran biasa.')).toBeInTheDocument();
  });

  it('names the stretch that is not normal and draws it on its own', () => {
    const { container } = render(
      <PowerChart {...props} anomaly={{ from: 1, to: 3, label: 'Anomali 2.000 W' }} />,
    );

    expect(screen.getByText('Anomali 2.000 W')).toBeInTheDocument();
    expect(container.querySelectorAll('path.stroke-chart-anomaly')).toHaveLength(1);
  });

  it('draws the usual range as a band', () => {
    const { container } = render(
      <PowerChart
        {...props}
        expected={{ low: [90, 90, 90, 90, 90], high: [130, 130, 130, 130, 130] }}
      />,
    );

    expect(container.querySelectorAll('path.fill-bg-3')).toHaveLength(1);
  });
});

describe('ForecastChart', () => {
  const props = {
    billPoints: [0, 100_000, 250_000, 400_000],
    days: 31,
    projectedTotal: 2_000_000,
    yMax: 2_000_000,
    yLabels: ['Rp0', 'Rp1 jt', 'Rp2 jt'] as [string, string, string],
    xLabels: { start: '1 Okt', today: 'Hari ini' },
    label: 'Tagihan bulan ini',
    legend: [
      { line: 'solid' as const, text: 'Tagihan sampai hari ini' },
      { line: 'dashed' as const, text: 'Perkiraan tanpa saran', muted: true },
    ],
  };

  it('is an image with a name, the axis labels and a key', () => {
    render(<ForecastChart {...props} />);

    const chart = screen.getByRole('img', { name: 'Tagihan bulan ini' });

    expect(chart).toHaveTextContent('Rp2 jt');
    expect(chart).toHaveTextContent('1 Okt');
    expect(chart).toHaveTextContent('Hari ini');
    expect(screen.getByText('Tagihan sampai hari ini')).toBeInTheDocument();
    expect(screen.getByText('Perkiraan tanpa saran')).toBeInTheDocument();
  });

  it('draws the line that shows the bill if the tips are used only when they are given', () => {
    const { container, rerender } = render(<ForecastChart {...props} />);

    expect(container.querySelectorAll('path[stroke-dasharray="2 3"]')).toHaveLength(0);

    rerender(<ForecastChart {...props} potentialTotal={1_700_000} />);

    expect(container.querySelectorAll('path[stroke-dasharray="2 3"]')).toHaveLength(1);
  });
});
