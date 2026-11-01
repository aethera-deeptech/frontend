import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

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

  it('shows the information about the device and a link to rename it', () => {
    renderDetail();

    expect(screen.getByText('Colokan pintar')).toBeInTheDocument();
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
    expect(screen.getByText('Penjepit arus (dijepit di kabel)')).toBeInTheDocument();
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

describe('AlatDetailView, offline', () => {
  it('says that the device is not connected and shows dashes for the live numbers', () => {
    renderDetail(sampleOffline());

    expect(screen.getByRole('status')).toHaveTextContent('Alat tidak terhubung');
    expect(screen.getByRole('status')).toHaveTextContent('Terakhir terhubung 28 Okt 2026, 15:10.');
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
