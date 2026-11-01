import type { ComponentProps } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/cn';

// A link inside the app. The padding makes the touch area 46 px high like the Figma component.
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn('text-body text-text-accent inline-block rounded-md px-1 py-[13px]', className)}
      {...props}
    />
  );
}
