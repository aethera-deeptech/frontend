import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  // CI and local runs send nothing to the Storybook servers
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};

export default config;
