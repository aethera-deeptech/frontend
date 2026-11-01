import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { routes } from '@/routes';

function AppAt({ path }: { path: string }) {
  const [router] = useState(() => createMemoryRouter(routes, { initialEntries: [path] }));

  return <RouterProvider router={router} />;
}

const meta = {
  title: 'App',
  component: AppAt,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppAt>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Home: Story = { args: { path: '/' } };

export const NotFound: Story = { args: { path: '/halaman-yang-tidak-ada' } };
