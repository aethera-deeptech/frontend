import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { routes } from '@/routes';

function AppAt({ path }: { path: string }) {
  return <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />;
}

const meta = {
  title: 'App',
  component: AppAt,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppAt>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Beranda: Story = { args: { path: '/' } };

export const HalamanTidakDitemukan: Story = { args: { path: '/halaman-yang-tidak-ada' } };
