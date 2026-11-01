import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

// The layout changes with the width (a bottom bar on a phone, a sidebar on a wide screen), so a phone at the width of the
// design, the smallest phone and a desktop are enough. Running every screen on all 14 devices would only repeat the same findings.
const axeDevices = ['iPhone SE', 'iPhone 13', 'Desktop Chrome'];

const screens = [
  { name: 'Beranda', path: '/', everyDevice: true },
  // On a wide screen the list opens its first tip once it has loaded, so these two wait for a link that stays on both layouts
  { name: 'Saran', path: '/saran', link: 'Matikan mesin jahit 3 di luar jam kerja' },
  { name: 'Saran, a tip that waits', path: '/saran/r1' },
  { name: 'Saran, cancel an applied tip', path: '/saran/r3/batalkan' },
  { name: 'Alat', path: '/alat', link: 'Mesin jahit 1' },
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

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  expect(results.violations).toEqual([]);
}

// The page counts as ready when its heading shows, it is not the error page, no skeleton is left and no load error shows.
// Without this a scan of a loading or an error state would pass while the real screen is never checked. A banner with a
// notice is part of some screens, so a banner alone is not a sign.
async function expectLoaded(page: Page, link?: string) {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  // The error page has a heading of its own, so a route that throws would be scanned in place of the screen
  await expect(page.getByRole('heading', { level: 1, name: 'Terjadi kesalahan' })).toHaveCount(0);
  if (link) {
    // The link comes first, because a wide screen opens a detail after it and that detail loads on its own
    await expect(page.getByRole('link', { name: link }).first()).toBeVisible();
  }
  await expect(page.getByRole('status').filter({ hasText: /^Memuat/ })).toHaveCount(0);
  await expect(
    page.getByRole('alert').filter({ hasText: /tidak bisa dimuat|belum bisa dimuat/ }),
  ).toHaveCount(0);
}

// The home screen runs on every device, as it did before. The other screens and the steps to add a device run on three, because the
// layout only changes with the width and a scan of 20 screens on 14 devices would repeat the same findings.
function onlyOnAxeDevices(projectName: string, everyDevice = false) {
  // eslint-disable-next-line playwright/no-skipped-test -- a device that is not listed has nothing to scan, and the skip says so
  test.skip(!everyDevice && !axeDevices.includes(projectName), 'This scan runs on three devices');
}

for (const screen of screens) {
  // eslint-disable-next-line playwright/expect-expect -- expectNoViolations holds the assertion
  test(`${screen.name} has no accessibility violations`, async ({ page }, testInfo) => {
    onlyOnAxeDevices(testInfo.project.name, screen.everyDevice);
    await page.goto(screen.path);
    await expectLoaded(page, screen.link);

    await expectNoViolations(page);
  });
}

test('the steps to add a plug have no accessibility violations', async ({ page }, testInfo) => {
  onlyOnAxeDevices(testInfo.project.name);
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

test('the warning for a clamp has no accessibility violations', async ({ page }, testInfo) => {
  onlyOnAxeDevices(testInfo.project.name);
  await page.goto('/alat/tambah');
  await page.getByRole('button', { name: /Penjepit arus/ }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sebelum memasang penjepit arus' }),
  ).toBeVisible();
  await expectNoViolations(page);
});
