import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

// A button that floats at the bottom right, over the content and above the bottom bar of a phone. The main area of the
// shell ends with enough padding (see app-shell.tsx) so that the button does not hide the last row.
export function CatatProduksiFab({ className }: { className?: string }) {
  return (
    <Button
      asChild
      kind="accent"
      size="lg"
      className={cn(
        'fixed right-4 bottom-[calc(63px+14px)] z-10 lg:right-6 lg:bottom-6',
        className,
      )}
    >
      <Link to="/lainnya/produksi">Catat produksi</Link>
    </Button>
  );
}
