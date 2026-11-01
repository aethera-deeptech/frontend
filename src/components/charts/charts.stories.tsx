import type { Meta, StoryObj } from '@storybook/react-vite';

import { BarChart } from '@/components/charts/bar-chart';
import { ForecastChart } from '@/components/charts/forecast-chart';
import { PowerChart } from '@/components/charts/power-chart';

// The sample numbers only live in these stories. The app has no sample data.
const meta = {
  title: 'Charts',
  decorators: [
    (Story) => (
      <div className="bg-bg-1 border-border-1 max-w-sm rounded-lg border p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bars: Story = {
  render: () => (
    <BarChart
      aria-label="Energi per alat bulan ini"
      items={[
        { label: 'Setrika uap', value: 160 },
        { label: 'Mesin jahit 1', value: 142 },
        { label: 'Mesin jahit 3', value: 135 },
        { label: 'Kompresor', value: 120 },
      ]}
    />
  ),
};

const quiet = Array.from({ length: 96 }, (_, index) => 90 + ((index * 7) % 25));
const spike = quiet.map((value, index) => (index >= 22 && index <= 26 ? 2000 : value));

export const PowerNormal: Story = {
  render: () => (
    <PowerChart
      points={quiet}
      yMax={1000}
      expected={{ low: quiet.map(() => 80), high: quiet.map(() => 140) }}
      xLabels={['00:00', '12:00', '24:00']}
      yLabels={['0 W', '500 W', '1.000 W']}
      label="Daya mesin jahit 1 hari ini"
      legend="Abu-abu berarti kisaran biasa."
    />
  ),
};

export const PowerWithAnomaly: Story = {
  render: () => (
    <PowerChart
      points={spike}
      yMax={2000}
      expected={{ low: quiet.map(() => 80), high: quiet.map(() => 140) }}
      anomaly={{ from: 21, to: 27, label: 'Anomali 2.000 W' }}
      xLabels={['00:00', '12:00', '24:00']}
      yLabels={['0 W', '1.000 W', '2.000 W']}
      label="Daya mesin jahit 1 hari ini, ada anomali"
      legend="Abu-abu berarti kisaran biasa. Merah berarti di luar kisaran."
    />
  ),
};

export const Forecast: Story = {
  render: () => (
    <ForecastChart
      billPoints={Array.from({ length: 22 }, (_, day) => day * 93_000)}
      days={31}
      projectedTotal={2_100_000}
      potentialTotal={1_700_000}
      yMax={2_000_000}
      yLabels={['Rp0', 'Rp1 jt', 'Rp2 jt']}
      xLabels={{ start: '1 Okt', today: 'Hari ini' }}
      label="Tagihan listrik bulan ini"
      legend={[
        { line: 'solid', text: 'Tagihan sampai hari ini' },
        { line: 'dashed', text: 'Perkiraan tanpa saran', muted: true },
        { line: 'dotted', text: 'Jika saran diterapkan sejak 1 Okt' },
      ]}
    />
  ),
};
