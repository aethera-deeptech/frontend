import { useEffect, useState } from 'react';

// Seconds left until a moment. The clock is read each second from the end time and not counted down, so a tab that sleeps in the
// background shows the right number when it wakes up.
export function useCountdown(endsAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();

      setNow(current);
      // Nothing is left to count, so the page stops rendering every second
      if (current >= endsAt) {
        clearInterval(timer);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [endsAt]);

  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
