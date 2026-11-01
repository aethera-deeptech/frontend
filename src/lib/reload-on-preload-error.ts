const reloadedAtKey = 'preload-error-reloaded-at';

// A new release replaces the chunk files, so a tab that was open before it asks for a file that is gone and Vite reports a
// preload error. One reload brings the new page. A second reload within 10 seconds would only repeat the failure, so it
// does not happen, and a blocked storage means no reload because the guard cannot work.
export function reloadOnPreloadError(
  reload: () => void = () => {
    window.location.reload();
  },
): () => void {
  const onError = (event: Event) => {
    event.preventDefault();
    try {
      const last = Number(window.sessionStorage.getItem(reloadedAtKey) ?? '0');
      if (Date.now() - last < 10_000) {
        return;
      }
      window.sessionStorage.setItem(reloadedAtKey, Date.now().toString());
    } catch {
      return;
    }
    reload();
  };

  window.addEventListener('vite:preloadError', onError);
  return () => {
    window.removeEventListener('vite:preloadError', onError);
  };
}
