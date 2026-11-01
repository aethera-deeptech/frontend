import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';

import { PengaturanView } from '@/pages/pengaturan/pengaturan-view';
import { sampleSettings } from '@/pages/pengaturan/sample-settings';

// The sample data only lives in the stories and the tests. The app has none.
const meta = {
  title: 'Screens/Pengaturan',
  component: PengaturanView,
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
  args: { settings: sampleSettings(), backTo: '/lainnya' },
} satisfies Meta<typeof PengaturanView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Saved: Story = { args: { saved: 'name' } };

export const OwnTariff: Story = {
  args: {
    settings: sampleSettings({
      tariff: { rpPerKwh: 1500, isDefault: false, defaultRpPerKwh: 1444 },
      anomalySensitivity: 'tinggi',
    }),
  },
};
