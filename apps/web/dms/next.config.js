/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
};

module.exports = nextConfig;
