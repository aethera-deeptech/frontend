import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { deviceDetailSchema } from '@/api/devices';
import { AlatDetailView } from '@/pages/alat/alat-detail-view';
import { summarize } from '@/pages/alat/device-filters';
import { AlatListView } from '@/pages/alat/alat-list-view';
import {
  sampleAnomaly,
  sampleDevices,
  sampleNormal,
  sampleOffline,
} from '@/pages/alat/sample-alat';

describe('summarize', () => {
  it('counts the devices and names the ones that need a look', () => {
    expect(summarize(sampleDevices().items)).toBe('6 alat terpasang, 1 anomali, 1 offline');
  });

  it('says only the number when every device is fine', () => {
    expect(summarize(sampleDevices().items.slice(2))).toBe('4 alat terpasang');
  });
});

function renderList(filter: 'all' | 'anomali' | 'mati' = 'all', onFilterChange = vi.fn()) {
  render(
    <MemoryRouter>
      <AlatListView
        data={sampleDevices()}
        filter={filter}
        onFilterChange={onFilterChange}
        selectedId="d4"
      />
    </MemoryRouter>,
  );
  return onFilterChange;
}

describe('AlatListView', () => {
  it('shows the summary and a row for each device with its power and energy', () => {
    renderList();

    expect(screen.getByText('6 alat terpasang, 1 anomali, 1 offline')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('link', { name: /Mesin jahit 1/ })).toHaveAttribute('href', '/alat/d4');
    expect(screen.getByText('1.250 W')).toBeInTheDocument();
    expect(screen.getByText('6,8 kWh hari ini')).toBeInTheDocument();
    expect(screen.getByText('0,0 kWh hari ini')).toBeInTheDocument();
  });

  it('says when the anomaly happened and when the offline device was last seen', () => {
    renderList();

    expect(screen.getByText('pukul 02:10')).toBeInTheDocument();
    expect(screen.getByText('Terakhir 28 Okt')).toBeInTheDocument();
  });

  it('shows a dash and says that the data is awaited for a device that does not answer', () => {
    renderList();

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Menunggu data')).toBeInTheDocument();
  });

  it('marks the device that is open', () => {
    renderList();

    expect(screen.getByRole('link', { name: /Mesin jahit 1/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('shows only the devices with the chosen status', () => {
    renderList('anomali');

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Kompresor/ })).toBeInTheDocument();
  });

  it('lets the user pick a status', async () => {
    const onFilterChange = renderList();

    await userEvent.click(screen.getByRole('combobox', { name: 'Tampilkan' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Offline' }));

    expect(onFilterChange).toHaveBeenCalledWith('offline');
  });

  it('says that no device has the status and offers all of them', async () => {
    const data = { items: sampleDevices().items.filter((item) => item.status !== 'anomali') };
    const onFilterChange = vi.fn();
    render(
      <MemoryRouter>
        <AlatListView data={data} filter="anomali" onFilterChange={onFilterChange} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Tidak ada alat berstatus Anomali' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tampilkan semua alat' }));

    expect(onFilterChange).toHaveBeenCalledWith('all');
  });

  it('explains what to do when no device is installed', () => {
    render(
      <MemoryRouter>
        <AlatListView data={{ items: [] }} filter="all" onFilterChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Belum ada alat terpasang' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tambah alat' })).toHaveAttribute(
      'href',
      '/alat/tambah',
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

const now = new Date(2026, 9, 29, 12, 0);

function renderDetail(detail = sampleNormal()) {
  render(
    <MemoryRouter>
      <AlatDetailView detail={detail} now={now} />
    </MemoryRouter>,
  );
}

describe('AlatDetailView, normal', () => {
  it('shows the name, the room and the status', () => {
    renderDetail();

    expect(screen.getByRole('heading', { name: 'Mesin jahit 1' })).toBeInTheDocument();
    expect(screen.getByText('Nyala')).toBeInTheDocument();
    expect(screen.getByText('Ruang jahit')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the power now and the four numbers', () => {
    renderDetail();

    expect(screen.getByText('780 W')).toBeInTheDocument();
    expect(screen.getByText('4,2 kWh')).toBeInTheDocument();
    expect(screen.getByText('142 kWh')).toBeInTheDocument();
    expect(screen.getByText('7,2 jam')).toBeInTheDocument();
    expect(screen.getByText('3 W')).toBeInTheDocument();
  });

  it('shows the pattern of the day with its key', () => {
    renderDetail();

    expect(screen.getByRole('heading', { name: 'Pola daya satu hari' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Daya mesin jahit 1 dalam satu hari' })).toBeVisible();
    expect(screen.getByText('Abu-abu berarti kisaran biasa.')).toBeInTheDocument();
  });

  it('says why the line stops when the pattern has a stretch without a reading', () => {
    const detail = sampleNormal();
    const points = detail.powerPattern?.points.map((value, index) => (index === 10 ? null : value));

    renderDetail({
      ...detail,
      powerPattern: detail.powerPattern && points ? { ...detail.powerPattern, points } : null,
    });

    expect(
      screen.getByText(
        'Abu-abu berarti kisaran biasa. Garis terputus berarti tidak ada data dari alat.',
      ),
    ).toBeInTheDocument();
  });

  it('does not say that the line is broken when the nulls are only at the edges', () => {
    const detail = sampleNormal();
    const points = detail.powerPattern?.points.map((value, index, all) =>
      index < 20 || index >= all.length - 5 ? null : value,
    );

    renderDetail({
      ...detail,
      powerPattern: detail.powerPattern && points ? { ...detail.powerPattern, points } : null,
    });

    expect(screen.getByText('Abu-abu berarti kisaran biasa.')).toBeInTheDocument();
    expect(screen.queryByText(/Garis terputus/)).not.toBeInTheDocument();
  });

  it('shows the information about the device and a link to rename it', () => {
    renderDetail();

    expect(screen.getByText('WATTLINK Plug')).toBeInTheDocument();
    expect(screen.getByText('29 Okt 2026, 14:32')).toBeInTheDocument();
    expect(screen.getByText('Baik')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ganti nama' })).toHaveAttribute(
      'href',
      '/alat/d4/ganti-nama',
    );
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/alat');
  });
});

describe('AlatDetailView, anomaly', () => {
  it('explains the anomaly and marks it in the chart', () => {
    renderDetail(sampleAnomaly());

    expect(screen.getByRole('alert')).toHaveTextContent('Daya naik mendadak hari ini pukul 02:10');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Kompresor sempat menarik 2.000 W, jauh di atas kisaran biasa.',
    );
    expect(screen.getByRole('img', { name: /ada anomali/ })).toHaveTextContent('Anomali 2.000 W');
    expect(
      screen.getByText('Abu-abu berarti kisaran biasa. Merah berarti anomali.'),
    ).toBeInTheDocument();
    expect(screen.getByText('WATTLINK Clamp (dijepit di kabel)')).toBeInTheDocument();
  });

  it('names the day of an anomaly that is not from today', () => {
    render(
      <MemoryRouter>
        <AlatDetailView detail={sampleAnomaly()} now={new Date(2026, 10, 2, 12, 0)} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Daya naik mendadak 29 Okt pukul 02:10');
  });
});

describe('AlatDetailView, the kind of anomaly', () => {
  function withKind(kind: 'surge' | 'overload' | 'degradation', powerFactor?: number) {
    const detail = sampleAnomaly();
    return {
      ...detail,
      anomaly: { at: '2026-10-29T02:10:00+07:00', peakW: 2000, kind, powerFactor },
    };
  }

  it('says an overload with the words of the device', () => {
    renderDetail(withKind('overload'));

    expect(screen.getByRole('alert')).toHaveTextContent('Beban berlebih hari ini pukul 02:10');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Alat melaporkan beban di atas batasnya. Periksa mesin yang terhubung ke alat.',
    );
  });

  it('shows the power factor of a degradation that the API found', () => {
    renderDetail(withKind('degradation', 0.62));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Motor bekerja kurang efisien hari ini pukul 02:10',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Faktor daya rata-rata 0,62.');
  });

  it('shows the number of a surge in the chart and no number for the other kinds', () => {
    const { unmount } = render(
      <MemoryRouter>
        <AlatDetailView detail={withKind('surge')} now={now} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: /ada anomali/ })).toHaveTextContent('Anomali 2.000 W');
    unmount();

    renderDetail(withKind('overload'));

    expect(screen.getByRole('img', { name: /ada anomali/ })).not.toHaveTextContent(
      'Anomali 2.000 W',
    );
    expect(screen.getByRole('img', { name: /ada anomali/ })).toHaveTextContent('Anomali');
  });

  it('names the day when the anomaly is from another day', () => {
    render(
      <MemoryRouter>
        <AlatDetailView detail={withKind('overload')} now={new Date(2026, 10, 2, 12, 0)} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Beban berlebih 29 Okt pukul 02:10');
  });

  it('says a degradation that the device reported without a power factor', () => {
    renderDetail(withKind('degradation'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Alat melaporkan motor bekerja kurang efisien. Pertimbangkan pemeriksaan.',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Faktor daya');
  });
});

describe('the schema of the anomaly', () => {
  const base = { at: '2026-10-29T02:10:00+07:00', peakW: 2000 };

  it('reads an answer with no kind as a surge, like the API before it had kinds', () => {
    const parsed = deviceDetailSchema.shape.anomaly.parse(base);

    expect(parsed?.kind).toBe('surge');
  });

  it.each([null, -0.1, 1.2, '0.5'])('drops the power factor %s', (powerFactor) => {
    const parsed = deviceDetailSchema.shape.anomaly.parse({
      ...base,
      kind: 'degradation',
      powerFactor,
    });

    expect(parsed?.kind).toBe('degradation');
    expect(parsed?.powerFactor).toBeUndefined();
  });

  it('reads a kind that it does not know as a surge and drops a power factor out of range', () => {
    const parsed = deviceDetailSchema.shape.anomaly.parse({
      ...base,
      kind: 'vibration',
      powerFactor: 4,
    });

    expect(parsed?.kind).toBe('surge');
    expect(parsed?.powerFactor).toBeUndefined();
  });
});

describe('AlatDetailView, offline', () => {
  it('says that the device is not connected and shows dashes for the live numbers', () => {
    renderDetail(sampleOffline());

    expect(screen.getByRole('status')).toHaveTextContent('Alat tidak terhubung');
    expect(screen.getByRole('status')).toHaveTextContent('Terakhir terhubung 28 Okt 2026, 15:10.');
    // A hub that is off also leaves every device without data, so the text names both
    expect(screen.getByRole('status')).toHaveTextContent(
      'Periksa apakah alat dan WATTLINK Hub menyala dan saling dekat.',
    );
    expect(screen.getAllByText('-')).toHaveLength(4);
    expect(screen.getByText('38 kWh')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada')).toBeInTheDocument();
  });

  it('says that there is no chart while there is no recent data', () => {
    renderDetail(sampleOffline());

    expect(screen.getByRole('heading', { name: 'Daya 24 jam terakhir' })).toBeInTheDocument();
    expect(
      screen.getByText('Belum ada data baru. Grafik muncul lagi saat alat terhubung.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('the schema of the pattern', () => {
  const pattern = { points: [100, null, 0, 120], yMaxW: 1000 };

  it('reads a point without a reading as null and a reading of 0 W as 0', () => {
    expect(deviceDetailSchema.shape.powerPattern.parse(pattern)?.points).toEqual([
      100,
      null,
      0,
      120,
    ]);
  });

  it('still refuses a negative or a text point, so a broken answer does not draw', () => {
    expect(
      deviceDetailSchema.shape.powerPattern.safeParse({ ...pattern, points: [100, -1] }).success,
    ).toBe(false);
    expect(
      deviceDetailSchema.shape.powerPattern.safeParse({ ...pattern, points: [100, 'x'] }).success,
    ).toBe(false);
  });
});
