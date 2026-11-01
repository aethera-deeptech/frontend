import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  headline: string;
  message: string;
  // A button or a link that fixes the empty state
  action?: ReactNode;
}

export function EmptyState({ headline, message, action }: EmptyStateProps) {
  return (
    <Card className="gap-3 p-6">
      <h2 className="text-h2 text-text-heading">{headline}</h2>
      <p className="text-body text-text-2">{message}</p>
      {action}
    </Card>
  );
}
