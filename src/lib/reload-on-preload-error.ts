const reloadedAtKey = 'preload-error-reloaded-at';
const minutesBetweenReloads = 60_000;

// A new release replaces the chunk files, so a tab that was open before it asks for a file that is gone and Vite reports a
// preload error. One reload brings the new page. It does not reload when the device is offline, because the reload would
// replace the working page with the browser error page. It reloads at most once a minute, so a chunk that stays broken
// cannot make a loop, and a blocked storage means no reload because the guard cannot work. In every case where it does not
// reload, the error is left alone so that it reaches the router and the console.
export function reloadOnPreloadError(
  reload: () => void = () => {
    window.location.reload();
  },
): () => void {
  const onError = (event: Event) => {
    if (!navigator.onLine) {
      return;
    }
    try {
      const last = Number(window.sessionStorage.getItem(reloadedAtKey) ?? '0');
      if (Date.now() - last < minutesBetweenReloads) {
        return;
      }
      window.sessionStorage.setItem(reloadedAtKey, Date.now().toString());
    } catch {
      return;
    }
    event.preventDefault();
    reload();
  };

  window.addEventListener('vite:preloadError', onError);
  return () => {
    window.removeEventListener('vite:preloadError', onError);
  };
}
