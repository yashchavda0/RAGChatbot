import type { Config } from 'tailwindcss';
import baseConfig from '../../frontend/tailwind.config';

const config: Config = {
  ...baseConfig,
  content: ['../shared-ui/src/**/*.{ts,tsx}'],
};

export default config;
