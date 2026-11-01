import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

// A button that floats at the bottom right, over the content and above the bottom bar of a phone. The screens that
// show it keep 6rem free at the end (see scroll-padding in index.css), so it does not hide the last row.
export function CatatProduksiFab() {
  return (
    <Button
      asChild
      kind="accent"
      size="lg"
      className="fixed right-4 bottom-[calc(63px+14px)] z-10 lg:right-6 lg:bottom-6"
    >
      <Link to="/lainnya/produksi">Catat produksi</Link>
    </Button>
  );
}
