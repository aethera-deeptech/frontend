import { useEffect, useState } from 'react';

// Seconds left until a moment. The clock is read each second from the end time and not counted down, so a tab that sleeps in the
// background shows the right number when it wakes up.
export function useCountdown(endsAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) {
      return;
    }
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [endsAt]);

  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
}
