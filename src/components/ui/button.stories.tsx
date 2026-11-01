import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

const kinds = ['neutral', 'accent', 'danger', 'warning', 'success'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Simpan' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { kind: 'accent', disabled: true } };

// Every kind in every size, as in the Components page of the Figma file
export const KindsAndSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {sizes.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-4">
          {kinds.map((kind) => (
            <Button key={kind} {...args} kind={kind} size={size}>
              {kind}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
