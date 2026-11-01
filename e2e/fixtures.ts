import { expect, test as base } from '@playwright/test';

const apiOrigin = 'https://api.example.com';

// The app is built against a placeholder API address and no backend exists in CI. Every call to that address is answered
// here with a fixed body, so the screens show real content and no test depends on the network.
function beranda() {
  const now = new Date();
  const dailyTotalRp = Array.from({ length: now.getDate() }, (_, day) => day * 70_000);

  return {
    phase: 'ready',
    businessName: 'Konveksi Maju Jaya',
    asOf: now.toISOString(),
    savingPerMonthRp: 312_000,
    statusCounts: { anomali: 1, offline: 1, siaga: 1, nyala: 3, mati: 1 },
    recommendations: [
      {
        id: 'r1',
        title: 'Matikan mesin jahit 3 di luar jam kerja',
        deviceName: 'Mesin jahit 3',
        savingPerMonthRp: 118_000,
      },
      {
        id: 'r2',
        title: 'Kurangi waktu pemanasan setrika uap',
        deviceName: 'Setrika uap',
        savingPerMonthRp: 104_000,
      },
      {
        id: 'r3',
        title: 'Matikan kompresor di luar jam kerja',
        deviceName: 'Kompresor',
        savingPerMonthRp: 90_000,
      },
    ],
    bill: { dailyTotalRp, projectedTotalRp: 2_100_000, potentialTotalRp: 1_788_000 },
    topDevices: [
      { name: 'Setrika uap', kwh: 160 },
      { name: 'Mesin jahit 1', kwh: 142 },
      { name: 'Mesin jahit 3', kwh: 135 },
      { name: 'Kompresor', kwh: 120 },
    ],
    energyPerPiece: { status: 'verified', beforeKwh: 0.41, afterKwh: 0.37 },
  };
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(`${apiOrigin}/**`, async (route) => {
      const origin = route.request().headers().origin ?? '';
      const headers = {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'content-type': 'application/json',
      };
      const { pathname } = new URL(route.request().url());

      if (pathname === '/v1/beranda') {
        await route.fulfill({ status: 200, headers, body: JSON.stringify(beranda()) });
      } else {
        await route.fulfill({ status: 404, headers, body: '{}' });
      }
    });
    await provide(page);
  },
});

export { expect };
