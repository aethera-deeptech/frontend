import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

// A card with a heading in the h2 style, for the sections of a detail screen. A Card title is a small grey label instead.
export function SectionCard({
  heading,
  className,
  children,
}: {
  heading: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <h2 className="text-h2 text-text-heading">{heading}</h2>
      {children}
    </Card>
  );
}
