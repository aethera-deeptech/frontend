import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { NumberStepper } from '@/components/ui/number-stepper';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { TextInput } from '@/components/ui/text-input';

// The sample text only lives in these stories. The app has no sample data.
const meta = {
  title: 'UI/Form components',
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextInputs: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TextInput label="Nama usaha" helper="Tampil di laporan." defaultValue="Konveksi Maju Jaya" />
      <TextInput label="Nama usaha" error="Isi nama usaha." />
      <TextInput label="Nama usaha" disabled defaultValue="Konveksi Maju Jaya" />
    </div>
  ),
};

function SelectDemo() {
  const [value, setValue] = useState('');

  return (
    <Select
      label="Kepekaan anomali"
      value={value}
      onValueChange={setValue}
      options={[
        { value: 'rendah', label: 'Rendah' },
        { value: 'sedang', label: 'Sedang' },
        { value: 'tinggi', label: 'Tinggi' },
      ]}
    />
  );
}

export const Selects: Story = { render: () => <SelectDemo /> };

function CheckboxDemo() {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox
      label="Saya tahu cara memasang dengan aman"
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next === true);
      }}
    />
  );
}

export const Checkboxes: Story = { render: () => <CheckboxDemo /> };

function SegmentedDemo() {
  const [value, setValue] = useState('minggu');

  return (
    <SegmentedControl
      label="Periode"
      value={value}
      onValueChange={setValue}
      segments={[
        { value: 'minggu', label: 'Minggu ini' },
        { value: 'bulan', label: 'Bulan ini' },
      ]}
    />
  );
}

export const SegmentedControls: Story = { render: () => <SegmentedDemo /> };

function StepperDemo() {
  const [value, setValue] = useState(24);

  return (
    <NumberStepper
      label="Potong per hari"
      value={value}
      onValueChange={setValue}
      min={0}
      max={500}
      unit="potong"
    />
  );
}

export const NumberSteppers: Story = { render: () => <StepperDemo /> };
