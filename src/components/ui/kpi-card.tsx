import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  value: string;
  // Small text next to the value, for example "dari 3 saran"
  trailing?: string;
  caption?: string;
  // The row of tags under the caption
  tags?: ReactNode;
}

export function KpiCard({ label, value, trailing, caption, tags }: KpiCardProps) {
  return (
    <Card title={label}>
      <p className="flex items-baseline gap-2">
        <span className="text-kpi text-text-heading">{value}</span>
        {trailing ? <span className="text-body text-text-2">{trailing}</span> : null}
      </p>
      {caption ? <p className="text-label text-text-2">{caption}</p> : null}
      {tags ? <div className="flex flex-wrap gap-2">{tags}</div> : null}
    </Card>
  );
}
