import type { RouteObject } from 'react-router';

// The routes load each page on demand. A test would have to wait for a chunk before it can look at the screen, so this loads
// them all once and puts the pages in the route table. The tests then see the same routes as the app, already loaded.
export async function resolveLazyRoutes(routes: RouteObject[]): Promise<void> {
  for (const route of routes) {
    if (typeof route.lazy === 'function') {
      const loaded = await route.lazy();
      Object.assign(route, loaded);
      delete route.lazy;
    }
    if (route.children) {
      await resolveLazyRoutes(route.children);
    }
  }
}
