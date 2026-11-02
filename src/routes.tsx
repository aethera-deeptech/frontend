import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';

import { AppLoading } from '@/components/layout/app-loading';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorPage } from '@/pages/error-page';
import { NotFoundPage } from '@/pages/not-found-page';

// Each page is its own chunk that loads when its address opens, so the first visit downloads the shell and one page and not
// every screen. The shell and the not found page stay in the entry because every address needs them.
function lazyPage<Module>(
  load: () => Promise<Module>,
  pick: (module: Module) => ComponentType,
): Pick<RouteObject, 'lazy'> {
  return {
    lazy: async () => ({ Component: pick(await load()) }),
  };
}

export const routes: RouteObject[] = [
  {
    // Shown while the chunk of the first page loads
    HydrateFallback: AppLoading,
    // A page that throws shows this instead of a blank screen
    ErrorBoundary: ErrorPage,
    children: [
      // The screens before the login have no menu, so they sit outside the shell
      {
        path: 'masuk',
        ...lazyPage(
          () => import('@/pages/auth/masuk-page'),
          (module) => module.MasukPage,
        ),
      },
      {
        path: 'daftar',
        ...lazyPage(
          () => import('@/pages/auth/daftar-page'),
          (module) => module.DaftarPage,
        ),
      },
      {
        path: 'verifikasi',
        ...lazyPage(
          () => import('@/pages/auth/verifikasi-page'),
          (module) => module.VerifikasiPage,
        ),
      },
      {
        path: 'verify-email',
        ...lazyPage(
          () => import('@/pages/auth/verify-email-page'),
          (module) => module.VerifyEmailPage,
        ),
      },
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            ...lazyPage(
              () => import('@/pages/beranda/beranda-page'),
              (module) => module.BerandaPage,
            ),
          },
          {
            path: 'saran',
            ...lazyPage(
              () => import('@/pages/saran/saran-layout'),
              (module) => module.SaranLayout,
            ),
            children: [
              {
                path: ':id',
                ...lazyPage(
                  () => import('@/pages/saran/saran-detail-page'),
                  (module) => module.SaranDetailPage,
                ),
              },
              {
                path: ':id/batalkan',
                ...lazyPage(
                  () => import('@/pages/saran/saran-cancel-page'),
                  (module) => module.SaranCancelPage,
                ),
              },
            ],
          },
          {
            path: 'alat/tambah',
            ...lazyPage(
              () => import('@/pages/pasang-alat/wizard'),
              (module) => module.TambahAlatLayout,
            ),
            children: [
              {
                index: true,
                ...lazyPage(
                  () => import('@/pages/pasang-alat/pilih-jenis-page'),
                  (module) => module.PilihJenisPage,
                ),
              },
              {
                path: 'peringatan',
                ...lazyPage(
                  () => import('@/pages/pasang-alat/peringatan-page'),
                  (module) => module.PeringatanPage,
                ),
              },
              {
                path: 'persetujuan',
                ...lazyPage(
                  () => import('@/pages/pasang-alat/persetujuan-page'),
                  (module) => module.PersetujuanPage,
                ),
              },
              {
                path: 'nama',
                ...lazyPage(
                  () => import('@/pages/pasang-alat/beri-nama-page'),
                  (module) => module.BeriNamaPage,
                ),
              },
              {
                path: 'mencari/:id',
                ...lazyPage(
                  () => import('@/pages/pasang-alat/mencari-page'),
                  (module) => module.MencariPage,
                ),
              },
            ],
          },
          {
            path: 'alat',
            ...lazyPage(
              () => import('@/pages/alat/alat-layout'),
              (module) => module.AlatLayout,
            ),
            children: [
              {
                path: ':id',
                ...lazyPage(
                  () => import('@/pages/alat/alat-detail-page'),
                  (module) => module.AlatDetailPage,
                ),
              },
              {
                path: ':id/ganti-nama',
                ...lazyPage(
                  () => import('@/pages/alat/alat-rename-page'),
                  (module) => module.AlatRenamePage,
                ),
              },
            ],
          },
          {
            path: 'laporan',
            ...lazyPage(
              () => import('@/pages/laporan/laporan-page'),
              (module) => module.LaporanPage,
            ),
          },
          {
            path: 'lainnya',
            children: [
              {
                index: true,
                ...lazyPage(
                  () => import('@/pages/lainnya/lainnya-page'),
                  (module) => module.LainnyaPage,
                ),
              },
              {
                path: 'produksi',
                ...lazyPage(
                  () => import('@/pages/produksi/produksi-page'),
                  (module) => module.ProduksiPage,
                ),
              },
              {
                path: 'pengaturan',
                children: [
                  {
                    index: true,
                    ...lazyPage(
                      () => import('@/pages/pengaturan/pengaturan-page'),
                      (module) => module.PengaturanPage,
                    ),
                  },
                  {
                    path: 'nama',
                    ...lazyPage(
                      () => import('@/pages/pengaturan/edit-name-page'),
                      (module) => module.EditNamePage,
                    ),
                  },
                  {
                    path: 'tarif',
                    ...lazyPage(
                      () => import('@/pages/pengaturan/edit-tariff-page'),
                      (module) => module.EditTariffPage,
                    ),
                  },
                  {
                    path: 'jam-kerja',
                    ...lazyPage(
                      () => import('@/pages/pengaturan/edit-hours-page'),
                      (module) => module.EditHoursPage,
                    ),
                  },
                  {
                    path: 'kepekaan',
                    ...lazyPage(
                      () => import('@/pages/pengaturan/edit-sensitivity-page'),
                      (module) => module.EditSensitivityPage,
                    ),
                  },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
