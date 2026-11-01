import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

// The layout changes with the width (a bottom bar on a phone, a sidebar on a wide screen), so a phone at the width of the
// design, the smallest phone and a desktop are enough. Running every screen on all 14 devices would only repeat the same findings.
const axeDevices = ['iPhone SE', 'iPhone 13', 'Desktop Chrome'];

const screens = [
  { name: 'Beranda', path: '/' },
  { name: 'Saran', path: '/saran' },
  { name: 'Saran, a tip that waits', path: '/saran/r1' },
  { name: 'Saran, cancel an applied tip', path: '/saran/r3/batalkan' },
  { name: 'Alat', path: '/alat' },
  { name: 'Alat, a device that runs', path: '/alat/d4' },
  { name: 'Alat, a device with an anomaly', path: '/alat/d1' },
  { name: 'Alat, a device that is offline', path: '/alat/d2' },
  { name: 'Alat, rename a device', path: '/alat/d4/ganti-nama' },
  { name: 'Laporan', path: '/laporan' },
  { name: 'Lainnya', path: '/lainnya' },
  { name: 'Catat produksi', path: '/lainnya/produksi' },
  { name: 'Pengaturan', path: '/lainnya/pengaturan' },
  { name: 'Pengaturan, business name', path: '/lainnya/pengaturan/nama' },
  { name: 'Pengaturan, tariff', path: '/lainnya/pengaturan/tarif' },
  { name: 'Pengaturan, work hours', path: '/lainnya/pengaturan/jam-kerja' },
  { name: 'Pengaturan, sensitivity', path: '/lainnya/pengaturan/kepekaan' },
  { name: 'Masuk', path: '/masuk' },
  { name: 'Daftar', path: '/daftar' },
  { name: 'Halaman tidak ditemukan', path: '/halaman-yang-tidak-ada' },
];

test.beforeEach(({}, testInfo) => {
  // eslint-disable-next-line playwright/no-skipped-test -- a device that is not listed has nothing to scan, and the skip says so
  test.skip(
    !axeDevices.includes(testInfo.project.name),
    'The accessibility scan of every screen runs on three devices',
  );
});

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  expect(results.violations).toEqual([]);
}

// The page counts as ready when its heading shows and no skeleton or error is left, because a scan of a loading or an error state
// would pass while the real screen is never checked
async function expectLoaded(page: Page) {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
}

for (const screen of screens) {
  // eslint-disable-next-line playwright/expect-expect -- expectNoViolations holds the assertion
  test(`${screen.name} has no accessibility violations`, async ({ page }) => {
    await page.goto(screen.path);
    await expectLoaded(page);

    await expectNoViolations(page);
  });
}

test('the steps to add a plug have no accessibility violations', async ({ page }) => {
  await page.goto('/alat/tambah');
  await expectLoaded(page);
  await expectNoViolations(page);

  await page.getByRole('button', { name: /Colokan pintar/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sebelum memasang' })).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('checkbox', { name: 'Saya setuju data listrik alat ini dibaca' }).click();
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beri nama alat' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Ruangan' })).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('textbox', { name: 'Nama alat' }).fill('Mesin jahit 2');
  await page.getByRole('combobox', { name: 'Ruangan' }).click();
  await page.getByRole('option', { name: 'Ruang jahit' }).click();
  await page.getByRole('button', { name: 'Cari alat' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tambah alat' })).toBeVisible();
  await expect(page).toHaveURL(/\/alat\/tambah\/mencari\/p1$/);
  await expectNoViolations(page);
});

test('the warning for a clamp has no accessibility violations', async ({ page }) => {
  await page.goto('/alat/tambah');
  await page.getByRole('button', { name: /Penjepit arus/ }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sebelum memasang penjepit arus' }),
  ).toBeVisible();
  await expectNoViolations(page);
});
