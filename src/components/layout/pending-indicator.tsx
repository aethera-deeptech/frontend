import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { useNavigationPending } from '@/hooks/use-navigation-pending';

// A thin bar for the sighted user and a note for a screen reader, both for the time that the next page loads. The bar
// fades in after 150 ms and the note comes after 300 ms, so a page that opens at once shows and says nothing. The
// reduced motion rule of the stylesheet makes the fade a step, and the delay stays.
export function PendingIndicator() {
  const pending = useNavigationPending();
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (!pending) {
      return;
    }
    const timer = setTimeout(() => {
      setAnnounced(true);
    }, 300);
    return () => {
      clearTimeout(timer);
      setAnnounced(false);
    };
  }, [pending]);

  return (
    <>
      <div
        data-testid="pending-bar"
        aria-hidden="true"
        className={clsx(
          'bg-btn-accent-face fixed inset-x-0 top-0 z-30 h-0.5',
          pending ? 'animate-pending opacity-0' : 'hidden',
        )}
      />
      {/* The region is always there, so the text is read out when it changes */}
      <div aria-live="polite" className="sr-only">
        {pending && announced ? 'Memuat halaman' : ''}
      </div>
    </>
  );
}
