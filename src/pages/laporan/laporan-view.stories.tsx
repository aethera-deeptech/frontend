import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { LaporanView } from '@/pages/laporan/laporan-view';
import {
  sampleCollecting,
  sampleEmpty,
  sampleReady,
  sampleSeptember,
} from '@/pages/laporan/sample-laporan';

// The sample data only lives in the stories and the tests. The app has none.
const meta = {
  title: 'Screens/Laporan',
  component: LaporanView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="p-4 lg:p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    data: sampleReady(),
    period: '2026-10',
    onPeriodChange: fn(),
    download: { status: 'idle' },
    onDownload: fn(),
  },
} satisfies Meta<typeof LaporanView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PastMonth: Story = { args: { data: sampleSeptember(), period: '2026-09' } };

export const Downloaded: Story = {
  args: { download: { status: 'done', fileName: 'Laporan-Oktober-2026.pdf', url: '#' } },
};

export const DownloadFailed: Story = { args: { download: { status: 'failed' } } };

export const Preparing: Story = { args: { download: { status: 'busy' } } };

export const Collecting: Story = { args: { data: sampleCollecting() } };

export const NoDevices: Story = { args: { data: sampleEmpty() } };
