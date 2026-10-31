import type { Preview } from '@storybook/react-vite';

import '../src/index.css';

const preview: Preview = {
  parameters: {
    // A violation of the accessibility rules fails the story in the interface, as it fails the end to end tests
    a11y: { test: 'error' },
  },
};

export default preview;
