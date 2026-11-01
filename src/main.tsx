import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app';
import '@/index.css';
import { reloadOnPreloadError } from '@/lib/reload-on-preload-error';

reloadOnPreloadError();

const root = document.getElementById('root');

if (!root) {
  throw new Error('The page has no element with the id root.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
