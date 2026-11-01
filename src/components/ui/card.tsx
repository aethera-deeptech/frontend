import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type CardProps = Omit<ComponentProps<'section'>, 'title'> & {
  // The small grey title above the content. It is a heading, so screen reader users can jump between cards.
  title?: ReactNode;
};

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <section
      className={cn('border-border-1 bg-bg-1 flex flex-col gap-2 rounded-lg border p-4', className)}
      {...props}
    >
      {title ? <h2 className="text-label text-text-2">{title}</h2> : null}
      {children}
    </section>
  );
}
