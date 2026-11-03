import { useLocation } from 'react-router';

import type { RelaySchedule } from '@/api/relay';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { TextLink } from '@/components/ui/text-link';
import { scheduleDayLabels, scheduleSummary } from '@/pages/alat/schedule-text';

// The daily switch of a plug, under the card of the switch. The link opens the form that sets, changes or removes it.
export function ScheduleCard({
  deviceId,
  schedule,
}: {
  deviceId: string;
  schedule: RelaySchedule | null;
}) {
  const { search } = useLocation();
  const to = `/alat/${encodeURIComponent(deviceId)}/jadwal${search}`;

  return (
    <Card title="Jadwal harian">
      {schedule ? (
        <>
          {schedule.enabled ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="warning">Dijeda</Tag>
              <p className="text-body text-text-2">Jadwal tidak berjalan.</p>
            </div>
          )}
          <p className="text-body text-text-1">{scheduleSummary(schedule)}</p>
          <p className="text-label text-text-2">{scheduleDayLabels[schedule.days]}</p>
          <TextLink to={to} className="self-start">
            Ubah jadwal
          </TextLink>
        </>
      ) : (
        <>
          <p className="text-body text-text-2">Belum ada jadwal</p>
          <TextLink to={to} className="self-start">
            Atur jadwal
          </TextLink>
        </>
      )}
    </Card>
  );
}
