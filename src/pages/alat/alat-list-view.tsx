import { useLocation } from 'react-router';

import type { DeviceList, DeviceListItem } from '@/api/devices';
import { Button } from '@/components/ui/button';
import { AddDeviceButton } from '@/components/ui/add-device-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Select } from '@/components/ui/select';
import { formatDate, formatFixed, formatTime, formatWatts, parseMoment } from '@/lib/format';
import { deviceFilterOptions, summarize, type DeviceFilter } from '@/pages/alat/device-filters';
import { statusFilterLabels } from '@/pages/alat/device-status';

interface AlatListViewProps {
  data: DeviceList;
  filter: DeviceFilter;
  onFilterChange: (filter: DeviceFilter) => void;
  // The device that is open in the detail next to the list
  selectedId?: string;
}

export function AlatListView({ data, filter, onFilterChange, selectedId }: AlatListViewProps) {
  // The chosen filter stays in the address when a device opens, so the list does not jump back to all devices
  const { search } = useLocation();

  if (data.items.length === 0) {
    return (
      <EmptyState
        headline="Belum ada alat terpasang"
        message="Pasang colokan pintar atau penjepit arus agar sistem bisa menghitung energi dan menyarankan penghematan dalam rupiah."
        action={<AddDeviceButton />}
      />
    );
  }

  const shown = filter === 'all' ? data.items : data.items.filter((item) => item.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Tampilkan"
        options={deviceFilterOptions}
        value={filter}
        onValueChange={(value) => {
          onFilterChange(value as DeviceFilter);
        }}
      />
      <p className="text-body text-text-2">{summarize(data.items)}</p>
      {shown.length === 0 && filter !== 'all' ? (
        <EmptyState
          headline={`Tidak ada alat berstatus ${statusFilterLabels[filter]}`}
          message={
            filter === 'anomali'
              ? 'Tidak ada alat dengan daya di luar kisaran biasa. Ketuk tombol di bawah untuk melihat semua alat.'
              : 'Tidak ada alat dengan status ini. Ketuk tombol di bawah untuk melihat semua alat.'
          }
          action={
            <Button
              size="lg"
              onClick={() => {
                onFilterChange('all');
              }}
            >
              Tampilkan semua alat
            </Button>
          }
        />
      ) : (
        <ul className="border-border-1 bg-bg-1 rounded-lg border px-4 py-1">
          {shown.map((item) => (
            <ListRow
              key={item.id}
              title={item.name}
              status={item.status}
              secondary={secondaryOf(item)}
              value={item.currentPowerW === null ? '-' : formatWatts(item.currentPowerW)}
              valueNote={
                item.todayKwh === null
                  ? 'Menunggu data'
                  : `${formatFixed(item.todayKwh, 1)} kWh hari ini`
              }
              to={`/alat/${encodeURIComponent(item.id)}${search}`}
              selected={selectedId === item.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// The line next to the status, for example the time of an anomaly or the last day an offline device was seen
function secondaryOf(item: DeviceListItem): string | undefined {
  if (item.status === 'anomali' && item.anomalyAt) {
    return `pukul ${formatTime(parseMoment(item.anomalyAt))}`;
  }
  if (item.status === 'offline' && item.lastSeenAt) {
    return `Terakhir ${formatDate(parseMoment(item.lastSeenAt))}`;
  }
  return undefined;
}
