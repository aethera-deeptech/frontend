import { expect, test as base } from '@playwright/test';

import {
  sampleAnomaly,
  sampleDevices,
  sampleNormal,
  sampleOffline,
} from '../src/pages/alat/sample-alat';
import { sampleReady as sampleReport } from '../src/pages/laporan/sample-laporan';
import { sampleSettings } from '../src/pages/pengaturan/sample-settings';
import { sampleProduction } from '../src/pages/produksi/sample-produksi';
import { sampleDetail, sampleList } from '../src/pages/saran/sample-saran';

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

// What the placeholder API answers for each method and path. A path that is not listed gets a 404, like an address that does not exist.
function answer(method: string, pathname: string): unknown {
  const tip = /^\/v1\/recommendations\/([^/]+)$/.exec(pathname)?.[1];
  const device = /^\/v1\/devices\/([^/]+)$/.exec(pathname)?.[1];

  if (method === 'POST' && pathname === '/v1/pairings') {
    return { id: 'p1' };
  }
  if (method !== 'GET') {
    return undefined;
  }
  if (pathname === '/v1/beranda') {
    return beranda();
  }
  if (pathname === '/v1/recommendations') {
    return sampleList();
  }
  if (tip) {
    // The tip r3 is applied, so the screen to cancel it has something to cancel
    return tip === 'r3'
      ? sampleDetail({
          id: 'r3',
          title: 'Kurangi daya siaga mesin obras',
          status: 'applied',
          appliedAt: new Date().toISOString(),
          verification: { collectedDays: 9, neededDays: 14 },
        })
      : sampleDetail({ id: tip });
  }
  if (pathname === '/v1/devices') {
    return sampleDevices();
  }
  if (device) {
    return device === 'd1'
      ? sampleAnomaly()
      : device === 'd2'
        ? sampleOffline()
        : sampleNormal({ id: device });
  }
  if (pathname === '/v1/reports') {
    return sampleReport();
  }
  if (pathname === '/v1/production') {
    return sampleProduction();
  }
  if (pathname === '/v1/settings') {
    return sampleSettings();
  }
  if (pathname === '/v1/rooms') {
    return {
      items: [
        { id: 'jahit', name: 'Ruang jahit' },
        { id: 'gudang', name: 'Gudang' },
      ],
    };
  }
  if (pathname === '/v1/pairings/p1') {
    return { status: 'searching' };
  }
  return undefined;
}

export interface Override {
  status?: number;
  body?: unknown;
}

// A test changes the answer of one endpoint with test.use({ apiOverrides: { 'GET /v1/beranda': { body: ... } } })
export const test = base.extend<{ apiOverrides: Record<string, Override> }>({
  apiOverrides: [{}, { option: true }],
  page: async ({ page, apiOverrides }, provide) => {
    await page.route(`${apiOrigin}/**`, async (route) => {
      const request = route.request();
      const origin = request.headers().origin ?? '';
      const headers = {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'content-type': 'application/json',
      };
      const { pathname } = new URL(request.url());

      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers });
        return;
      }

      const override = apiOverrides[`${request.method()} ${pathname}`];

      if (override) {
        const { status = 200, body = {} } = override;
        await route.fulfill({ status, headers, body: JSON.stringify(body) });
        return;
      }

      const body = answer(request.method(), pathname);

      if (body === undefined) {
        await route.fulfill({ status: 404, headers, body: '{}' });
      } else {
        await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
      }
    });
    await provide(page);
  },
});

export { expect };
