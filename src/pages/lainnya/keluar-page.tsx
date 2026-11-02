import { Link, useNavigate } from 'react-router';

import { authFailure, useLogout } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';

// The question before the session ends. It is a screen of its own and not a dialog, as in the Figma frames.
export function KeluarPage() {
  const navigate = useNavigate();
  const logout = useLogout();
  // Batal goes back to where the way to Keluar started, which is the menu on a phone and the home screen on a wide screen
  const wide = useMediaQuery('(min-width: 1024px)');

  const leave = () => {
    // A second press does nothing while the first call runs, and the focus stays on the button
    if (logout.isPending) {
      return;
    }
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate('/masuk', { replace: true });
      },
    });
  };

  return (
    <AuthFrame
      title="Keluar dari akun?"
      subtitle="Anda perlu masuk lagi untuk melihat data usaha di perangkat ini."
    >
      {logout.isError ? <FailureBanner failure={authFailure(logout.error)} /> : null}
      <div className="flex flex-col gap-3">
        <Button
          kind="danger"
          size="lg"
          aria-disabled={logout.isPending || undefined}
          onClick={leave}
        >
          {logout.isPending ? 'Sedang keluar' : 'Keluar'}
        </Button>
        <Button asChild size="lg">
          <Link to={wide ? '/' : '/lainnya'}>Batal</Link>
        </Button>
      </div>
    </AuthFrame>
  );
}
