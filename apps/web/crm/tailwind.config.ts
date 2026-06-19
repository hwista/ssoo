import type { Config } from 'tailwindcss';

const ssooTailwindPreset = require('@ssoo/web-ui/tailwind-preset');

const config: Config = {
  darkMode: ['class'],
  presets: [ssooTailwindPreset],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/web-auth/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/web-shell/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/web-ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [require('tailwindcss-animate')],
};

export default config;
