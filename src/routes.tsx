import type { RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { AlatDetailPage } from '@/pages/alat/alat-detail-page';
import { AlatLayout } from '@/pages/alat/alat-layout';
import { AlatRenamePage } from '@/pages/alat/alat-rename-page';
import { BerandaPage } from '@/pages/beranda/beranda-page';
import { LaporanPage } from '@/pages/laporan/laporan-page';
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
      {
        path: 'alat',
        element: <AlatLayout />,
        children: [
          { path: ':id', element: <AlatDetailPage /> },
          { path: ':id/ganti-nama', element: <AlatRenamePage /> },
        ],
      },
      { path: 'laporan', element: <LaporanPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
