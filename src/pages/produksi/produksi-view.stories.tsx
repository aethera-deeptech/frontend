import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { fn } from 'storybook/test';

import { DatePicker } from '@/components/ui/date-picker';
import { ProduksiView } from '@/pages/produksi/produksi-view';
import { sampleProduction } from '@/pages/produksi/sample-produksi';

// The sample data only lives in the stories and the tests. The app has none.
const meta = {
  title: 'Screens/Produksi',
  component: ProduksiView,
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
    data: sampleProduction(),
    date: '2026-10-29',
    onDateChange: fn(),
    quantity: 124,
    onQuantityChange: fn(),
    unit: 'potong',
    onUnitChange: fn(),
    saveState: 'idle',
    onSave: fn(),
    backTo: '/lainnya',
  },
} satisfies Meta<typeof ProduksiView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoRecords: Story = { args: { data: sampleProduction({ recent: [] }), quantity: 0 } };

export const Saved: Story = {
  args: {
    saveState: 'saved',
    data: sampleProduction({
      recent: [{ date: '2026-10-29', quantity: 124 }, ...sampleProduction().recent],
    }),
  },
};

export const SaveFailed: Story = { args: { saveState: 'failed' } };

function DatePickerDemo() {
  const [value, setValue] = useState('2026-10-29');

  return <DatePicker label="Tanggal" value={value} max="2026-10-29" onValueChange={setValue} />;
}

export const DatePickerField: Story = { render: () => <DatePickerDemo /> };
