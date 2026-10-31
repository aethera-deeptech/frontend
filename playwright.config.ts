import { defineConfig, devices } from '@playwright/test';

// The devices that run on every pull request. They cover the smallest phone, the width of the design (390 px), a
// large phone, two Android phones, a narrow folded phone, two tablets and the desktop browsers on Chromium, Firefox
// and WebKit. The weekly workflow e2e-devices.yaml runs every device that Playwright knows.
const pullRequestDevices = [
  'iPhone SE',
  'iPhone 13',
  'iPhone 17 Pro Max',
  'Galaxy S8',
  'Galaxy S24',
  'Pixel 7',
  'Galaxy Z Fold 7 Cover',
  'iPad Mini',
  'iPad Pro 11',
  'iPad Pro 11 landscape',
  'Desktop Chrome',
  'Desktop Firefox',
  'Desktop Safari',
  'Desktop Chrome HiDPI',
];

function project(name: string) {
  const descriptor = devices[name];

  if (!descriptor) {
    // a Playwright update can rename or drop a device, so fail with the name instead of a vague error
    throw new Error(`Playwright has no device named "${name}", update playwright.config.ts.`);
  }

  return { name, use: descriptor };
}

const selected = process.env.ALL_DEVICES ? Object.keys(devices) : pullRequestDevices;
const port = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    trace: 'on-first-retry',
  },
  projects: selected.map(project),
  webServer: {
    // CI builds the app in its own step, a local run builds it here
    command: `${process.env.CI ? '' : 'npm run build && '}npm run preview -- --host 127.0.0.1 --port ${String(port)} --strictPort`,
    url: `http://127.0.0.1:${String(port)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
