import type { Preview } from '@storybook/react-vite';

import '../src/index.css';

const preview: Preview = {
  parameters: {
    // The accessibility add-on reports a violation as an error. CI only builds Storybook and does not run these checks
    a11y: { test: 'error' },
  },
};

export default preview;
