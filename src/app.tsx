import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createQueryClient } from '@/api/query-client';
import { routes } from '@/routes';

// The router and the query client live outside the React tree, so a re-render or StrictMode never builds a second one.
const router = createBrowserRouter(routes);
const queryClient = createQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
