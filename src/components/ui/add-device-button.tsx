import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

// The link into the Tambah alat steps, as a button. The empty states show it at full width.
export function AddDeviceButton({ className }: { className?: string }) {
  return (
    <Button asChild kind="accent" size="lg" className={className}>
      <Link to="/alat/tambah">Tambah alat</Link>
    </Button>
  );
}
