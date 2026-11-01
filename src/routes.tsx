import type { RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { AlatDetailPage } from '@/pages/alat/alat-detail-page';
import { AlatLayout } from '@/pages/alat/alat-layout';
import { AlatRenamePage } from '@/pages/alat/alat-rename-page';
import { BerandaPage } from '@/pages/beranda/beranda-page';
import { EditHoursPage } from '@/pages/pengaturan/edit-hours-page';
import { EditNamePage } from '@/pages/pengaturan/edit-name-page';
import { EditSensitivityPage } from '@/pages/pengaturan/edit-sensitivity-page';
import { EditTariffPage } from '@/pages/pengaturan/edit-tariff-page';
import { LainnyaPage } from '@/pages/lainnya/lainnya-page';
import { LaporanPage } from '@/pages/laporan/laporan-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { PengaturanPage } from '@/pages/pengaturan/pengaturan-page';
import { ProduksiPage } from '@/pages/produksi/produksi-page';
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
      {
        path: 'lainnya',
        children: [
          { index: true, element: <LainnyaPage /> },
          { path: 'produksi', element: <ProduksiPage /> },
          {
            path: 'pengaturan',
            children: [
              { index: true, element: <PengaturanPage /> },
              { path: 'nama', element: <EditNamePage /> },
              { path: 'tarif', element: <EditTariffPage /> },
              { path: 'jam-kerja', element: <EditHoursPage /> },
              { path: 'kepekaan', element: <EditSensitivityPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
