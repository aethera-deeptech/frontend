import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MemoryRouter } from 'react-router';

import { BerandaView } from '@/pages/beranda/beranda-view';
import { sampleCollecting, sampleEmpty, sampleReady } from '@/pages/beranda/sample-beranda';

// The sample data only lives in the stories and the tests. The app has none.
const meta = {
  title: 'Screens/Beranda',
  component: BerandaView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="p-4 lg:p-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    data: sampleReady(),
    connection: 'online',
    onDecision: fn(),
    // A fixed day, so the chart labels the data as today
    now: new Date(2026, 9, 29, 12, 0),
  },
} satisfies Meta<typeof BerandaView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Offline: Story = { args: { connection: 'offline' } };

export const CatchingUp: Story = { args: { connection: 'catching-up' } };

export const NoDevices: Story = { args: { data: sampleEmpty() } };

export const Collecting: Story = { args: { data: sampleCollecting() } };

export const EstimatedResult: Story = {
  args: {
    data: sampleReady({ energyPerPiece: { status: 'estimate', beforeKwh: 0.41, afterKwh: 0.37 } }),
  },
};
