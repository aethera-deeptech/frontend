import type { RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { BerandaPage } from '@/pages/beranda/beranda-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { SaranCancelPage } from '@/pages/saran/saran-cancel-page';
import { SaranDetailPage } from '@/pages/saran/saran-detail-page';
import { SaranLayout } from '@/pages/saran/saran-layout';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <BerandaPage /> },
      {
        path: 'saran',
        element: <SaranLayout />,
        children: [
          { path: ':id', element: <SaranDetailPage /> },
          { path: ':id/batalkan', element: <SaranCancelPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
