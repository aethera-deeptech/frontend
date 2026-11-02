import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import {
  sampleCollecting as berandaCollecting,
  sampleEmpty as berandaEmpty,
} from '../src/pages/beranda/sample-beranda';
import {
  sampleCollecting as laporanCollecting,
  sampleEmpty as laporanEmpty,
} from '../src/pages/laporan/sample-laporan';
import { sampleDetail } from '../src/pages/saran/sample-saran';
import { expect, test, type Override } from './fixtures';

// The screens in their other states, which accessibility.spec.ts leaves out. Each case changes the answer of one endpoint and then
// waits for a text that only that state shows, because a scan of a loading card or of the normal state would prove nothing.
// The layout only changes with the width, so these run on a phone and on a desktop.
const stateDevices = ['iPhone 13', 'Desktop Chrome'];

const serverError: Override = { status: 500, body: {} };

interface StateCase {
  name: string;
  path: string;
  overrides: Record<string, Override>;
  shows: string | RegExp;
}

const states: StateCase[] = [
  {
    name: 'Beranda while the first days are collected',
    path: '/',
    overrides: { 'GET /v1/beranda': { body: berandaCollecting() } },
    shows: 'Sistem sedang mengumpulkan data awal',
  },
  {
    name: 'Beranda with no device',
    path: '/',
    overrides: { 'GET /v1/beranda': { body: berandaEmpty() } },
    shows: 'Belum ada alat terpasang',
  },
  {
    name: 'Beranda when the data cannot load',
    path: '/',
    overrides: { 'GET /v1/beranda': serverError },
    shows: 'Data belum bisa dimuat',
  },
  {
    name: 'Saran with no device',
    path: '/saran',
    overrides: {
      'GET /v1/recommendations': {
        body: { phase: 'no-devices', businessName: 'Konveksi Maju Jaya' },
      },
    },
    shows: 'Belum ada saran',
  },
  {
    name: 'Saran while the first days are collected',
    path: '/saran',
    overrides: {
      'GET /v1/recommendations': {
        body: { phase: 'collecting', businessName: 'Konveksi Maju Jaya', neededDays: 7 },
      },
    },
    shows: /Sistem sedang mengumpulkan data awal/,
  },
  {
    name: 'Saran when the list cannot load',
    path: '/saran',
    overrides: { 'GET /v1/recommendations': serverError },
    shows: 'Saran tidak bisa dimuat',
  },
  {
    name: 'Saran, a tip that was deferred',
    path: '/saran/r1',
    overrides: { 'GET /v1/recommendations/r1': { body: sampleDetail({ status: 'deferred' }) } },
    shows: /Anda menunda saran ini/,
  },
  {
    name: 'Saran, a tip that was rejected',
    path: '/saran/r1',
    overrides: {
      'GET /v1/recommendations/r1': {
        body: sampleDetail({ status: 'rejected', rejectedAt: '2026-10-28T09:00:00+07:00' }),
      },
    },
    shows: 'Keputusan Anda',
  },
  {
    name: 'Saran, a tip that is applied and checked',
    path: '/saran/r1',
    overrides: {
      'GET /v1/recommendations/r1': {
        body: sampleDetail({
          status: 'verified',
          appliedAt: '2026-10-10T09:00:00+07:00',
          result: { beforeKwh: 0.41, afterKwh: 0.37, beforeDays: 14, afterDays: 14 },
        }),
      },
    },
    shows: 'Hasil verifikasi',
  },
  {
    name: 'Saran, a tip that does not exist',
    path: '/saran/r1',
    overrides: { 'GET /v1/recommendations/r1': { status: 404 } },
    shows: 'Saran tidak ditemukan',
  },
  {
    name: 'Alat with no device',
    path: '/alat',
    overrides: { 'GET /v1/devices': { body: { items: [] } } },
    shows: 'Belum ada alat terpasang',
  },
  {
    name: 'Alat when the list cannot load',
    path: '/alat',
    overrides: { 'GET /v1/devices': serverError },
    shows: 'Daftar alat tidak bisa dimuat',
  },
  {
    name: 'Alat, a device that does not exist',
    path: '/alat/d4',
    overrides: { 'GET /v1/devices/d4': { status: 404 } },
    shows: 'Alat tidak ditemukan',
  },
  {
    name: 'Laporan while the first days are collected',
    path: '/laporan',
    overrides: { 'GET /v1/reports': { body: laporanCollecting() } },
    shows: /Sistem sedang mengumpulkan data awal/,
  },
  {
    name: 'Laporan with no device',
    path: '/laporan',
    overrides: { 'GET /v1/reports': { body: laporanEmpty() } },
    shows: 'Laporan belum tersedia',
  },
  {
    name: 'Laporan when the report cannot load',
    path: '/laporan',
    overrides: { 'GET /v1/reports': serverError },
    shows: 'Laporan tidak bisa dimuat',
  },
  {
    name: 'Catat produksi when the records cannot load',
    path: '/lainnya/produksi',
    overrides: { 'GET /v1/production': serverError },
    shows: 'Catatan produksi tidak bisa dimuat',
  },
  {
    name: 'Pengaturan when the settings cannot load',
    path: '/lainnya/pengaturan',
    overrides: { 'GET /v1/settings': serverError },
    shows: 'Pengaturan tidak bisa dimuat',
  },
];

function onlyOnStateDevices(projectName: string) {
  // eslint-disable-next-line playwright/no-skipped-test -- a device that is not listed has nothing to scan, and the skip says so
  test.skip(!stateDevices.includes(projectName), 'This scan runs on two devices');
}

async function expectNoViolations(page: Page, { include }: { include?: string } = {}) {
  const builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
  const results = await (include ? builder.include(include) : builder).analyze();

  expect(results.violations).toEqual([]);
}

// A failed request is tried once more after a second, so the error states need longer than the default wait
const errorWait = { timeout: 15_000 };

for (const state of states) {
  test.describe(state.name, () => {
    test.use({ apiOverrides: state.overrides });

    test('has no accessibility violations', async ({ page }, testInfo) => {
      onlyOnStateDevices(testInfo.project.name);
      await page.goto(state.path);
      // The list and the detail can both hold the text, and one of them is hidden on a phone, so only a visible one counts
      await expect(page.getByText(state.shows).filter({ visible: true }).first()).toBeVisible(
        errorWait,
      );
      await expect(page.getByRole('status').filter({ hasText: /^Memuat/ })).toHaveCount(0);

      await expectNoViolations(page);
    });
  });
}

async function startPlug(page: Page) {
  await page.goto('/alat/tambah');
  await page.getByRole('button', { name: /Colokan pintar/ }).click();
  await page.getByRole('checkbox', { name: 'Saya setuju data listrik alat ini dibaca' }).click();
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beri nama alat' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Ruangan' })).toBeVisible();
}

async function searchPlug(page: Page) {
  await startPlug(page);
  await page.getByRole('textbox', { name: 'Nama alat' }).fill('Mesin jahit 2');
  await page.getByRole('combobox', { name: 'Ruangan' }).click();
  await page.getByRole('option', { name: 'Ruang jahit' }).click();
  await page.getByRole('button', { name: 'Cari alat' }).click();
  await expect(page).toHaveURL(/\/alat\/tambah\/mencari\/p1$/);
}

test.describe('the search for a device that was found', () => {
  test.use({ apiOverrides: { 'GET /v1/pairings/p1': { body: { status: 'connected' } } } });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await searchPlug(page);
    await expect(page.getByText('Alat terhubung, menunggu data pertama')).toBeVisible();

    await expectNoViolations(page);
  });
});

test.describe('the search for a device that was not found', () => {
  test.use({ apiOverrides: { 'GET /v1/pairings/p1': { body: { status: 'failed' } } } });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await searchPlug(page);
    await expect(page.getByText('Alat belum terhubung')).toBeVisible();

    await expectNoViolations(page);
  });
});

test('the list of rooms, open, has no accessibility violations', async ({ page }, testInfo) => {
  onlyOnStateDevices(testInfo.project.name);
  await startPlug(page);
  await page.getByRole('combobox', { name: 'Ruangan' }).click();
  await expect(page.getByRole('option', { name: 'Ruang jahit' })).toBeVisible();

  // Radix hides the rest of the page with aria-hidden while the list is open and keeps the focus inside the list, so axe flags
  // every focusable element behind it although a keyboard cannot reach them. The scan therefore covers the open list only.
  await expectNoViolations(page, { include: '[role="listbox"]' });
});

test('the consent for a clamp has no accessibility violations', async ({ page }, testInfo) => {
  onlyOnStateDevices(testInfo.project.name);
  await page.goto('/alat/tambah');
  await page.getByRole('button', { name: /Penjepit arus/ }).click();
  await page.getByRole('checkbox', { name: 'Saya tahu cara memasang dengan aman' }).click();
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sebelum memasang', exact: true }),
  ).toBeVisible();

  await expectNoViolations(page);
});

// The screens before the login, in the states that need an answer from the API or a try with empty fields
const longToken = 'a'.repeat(43);
const signedIn = {
  email: 'dewi@example.com',
  emailVerified: true,
  businessName: 'Konveksi Maju Jaya',
};

async function signIn(page: Page) {
  await page.goto('/masuk');
  await page.getByLabel('Email').fill('dewi@example.com');
  await page.getByLabel('Kata sandi').fill('rahasia123');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
}

async function signUp(page: Page) {
  await page.goto('/daftar');
  await page.getByLabel('Nama usaha').fill('Konveksi Maju Jaya');
  await page.getByLabel('Email').fill('dewi@example.com');
  await page.getByLabel('Kata sandi').fill('rahasia123');
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();
}

test.describe('Masuk with a wrong password', () => {
  test.use({
    apiOverrides: {
      'POST /v1/auth/login': { status: 401, body: { code: 'invalid_credentials', message: 'No' } },
    },
  });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await signIn(page);
    await expect(page.getByText('Email atau kata sandi tidak cocok.')).toBeVisible();

    await expectNoViolations(page);
  });
});

test.describe('Masuk with an email that is not verified', () => {
  test.use({
    apiOverrides: {
      'POST /v1/auth/login': { status: 403, body: { code: 'email_not_verified', message: 'No' } },
    },
  });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await signIn(page);
    await expect(page.getByText('Email belum diverifikasi')).toBeVisible();

    await expectNoViolations(page);
  });
});

test('Daftar with every field empty has no accessibility violations', async ({
  page,
}, testInfo) => {
  onlyOnStateDevices(testInfo.project.name);
  await page.goto('/daftar');
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();
  await expect(page.getByText('Isi nama usaha.')).toBeVisible();

  await expectNoViolations(page);
});

test.describe('Daftar with an email that has an account', () => {
  test.use({
    apiOverrides: {
      'POST /v1/auth/register': { status: 409, body: { code: 'email_taken', message: 'No' } },
    },
  });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await signUp(page);
    await expect(page.getByText('Email sudah terdaftar', { exact: true })).toBeVisible();

    await expectNoViolations(page);
  });
});

test.describe('the screen after a sign up', () => {
  test.use({
    apiOverrides: { 'POST /v1/auth/register': { status: 201, body: { retryAfterSeconds: 60 } } },
  });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await signUp(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Periksa email Anda' })).toBeVisible();

    await expectNoViolations(page);
  });
});

test.describe('the link of the verification email that works', () => {
  test.use({ apiOverrides: { 'POST /v1/auth/verify-email': { body: signedIn } } });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await page.goto(`/verify-email?token=${longToken}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Akun Anda aktif' })).toBeVisible();

    await expectNoViolations(page);
  });
});

test.describe('the link of the verification email that was used', () => {
  test.use({
    apiOverrides: {
      'POST /v1/auth/verify-email': {
        status: 410,
        body: { code: 'token_invalid_or_expired', message: 'No' },
      },
    },
  });

  test('has no accessibility violations', async ({ page }, testInfo) => {
    onlyOnStateDevices(testInfo.project.name);
    await page.goto(`/verify-email?token=${longToken}`);
    await expect(page.getByText('Tautan tidak berlaku')).toBeVisible();

    await expectNoViolations(page);
  });
});
