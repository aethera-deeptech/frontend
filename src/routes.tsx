import type { RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { BerandaPage } from '@/pages/beranda-page';
import { NotFoundPage } from '@/pages/not-found-page';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <BerandaPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
