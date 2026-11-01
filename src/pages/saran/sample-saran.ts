import type { RecommendationDetail, RecommendationList } from '@/api/recommendations';

// Sample data for the tests and the stories only. The app never imports this file.
export function sampleList(): Extract<RecommendationList, { phase: 'ready' }> {
  return {
    phase: 'ready',
    businessName: 'Konveksi Maju Jaya',
    items: [
      {
        id: 'r1',
        title: 'Matikan mesin jahit 3 di luar jam kerja',
        savingPerMonthRp: 118_000,
        status: 'pending',
      },
      {
        id: 'r2',
        title: 'Kurangi waktu pemanasan setrika uap',
        savingPerMonthRp: 104_000,
        status: 'deferred',
      },
      {
        id: 'r3',
        title: 'Kurangi daya siaga mesin obras',
        savingPerMonthRp: 46_000,
        status: 'applied',
        progress: { collectedDays: 9, neededDays: 14 },
      },
      {
        id: 'r4',
        title: 'Atur ulang jam nyala kipas gudang',
        savingPerMonthRp: 64_000,
        status: 'verified',
        resultPercent: 9.8,
      },
      {
        id: 'r5',
        title: 'Ganti kompresor dengan model baru',
        savingPerMonthRp: 72_000,
        status: 'rejected',
      },
    ],
  };
}

export function sampleDetail(overrides: Partial<RecommendationDetail> = {}): RecommendationDetail {
  return {
    id: 'r1',
    title: 'Matikan mesin jahit 3 di luar jam kerja',
    deviceName: 'Mesin jahit 3',
    status: 'pending',
    savingPerMonthRp: 118_000,
    tariffIsDefault: true,
    whatToDo:
      'Matikan mesin jahit 3 dari colokan setelah jam kerja. Anda yang memutuskan. Sistem hanya menyarankan dan tidak mematikan mesin.',
    why: 'Mesin jahit 3 masih menarik daya di luar jam kerja, saat tidak ada pekerjaan di mesin.',
    howCalculated: [
      'Hemat per bulan = energi yang dihemat dalam kWh, dikali tarif listrik per kWh.',
      'Hitungannya, 81,7 kWh dikali tarif bawaan Rp1.444 per kWh sama dengan sekitar Rp118.000 per bulan.',
    ],
    ...overrides,
  };
}
