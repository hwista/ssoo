const ssooTailwindPreset = require('@ssoo/web-ui/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  presets: [ssooTailwindPreset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../../packages/web-auth/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../../packages/web-shell/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../../packages/web-ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};
