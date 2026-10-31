import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  // The scripts in package.json pass --disable-telemetry, which also stops the first event that is sent before this file is read
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};

export default config;
