const { createSsooNextConfig } = require('../../../packages/web-shell/next-config.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = createSsooNextConfig({
  appDir: __dirname,
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
});

module.exports = nextConfig;
