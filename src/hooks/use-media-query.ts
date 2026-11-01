import { useCallback, useSyncExternalStore } from 'react';

// True while the query matches, for example (min-width: 1024px). It follows the window when it is resized.
export function useMediaQuery(query: string): boolean {
  // A new subscribe function on every render would subscribe again every time, so it only changes with the query
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', listener);
      return () => {
        list.removeEventListener('change', listener);
      };
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
