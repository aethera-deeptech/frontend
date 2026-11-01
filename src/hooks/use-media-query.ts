import { useSyncExternalStore } from 'react';

// True while the query matches, for example (min-width: 1024px). It follows the window when it is resized.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', listener);
      return () => {
        list.removeEventListener('change', listener);
      };
    },
    () => window.matchMedia(query).matches,
  );
}
