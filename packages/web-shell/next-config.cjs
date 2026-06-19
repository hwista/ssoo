const path = require('path');
const ssooSecurityHeaders = require('./next-security-headers.cjs');

const BASE_TRANSPILE_PACKAGES = [
  '@ssoo/types',
  '@ssoo/web-auth',
  '@ssoo/web-shell',
  '@ssoo/web-ui',
];
const GLOBAL_IMAGE_REMOTE_PATTERNS = [
  {
    protocol: 'https',
    hostname: 'www.gravatar.com',
  },
];

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeImageRemotePatterns(imageOptions) {
  return [
    ...GLOBAL_IMAGE_REMOTE_PATTERNS,
    ...(imageOptions?.remotePatterns ?? []),
  ];
}

function createSsooNextConfig(options = {}) {
  const {
    appDir,
    transpilePackages = [],
    serverExternalPackages = [],
    images,
    headers,
    ...overrides
  } = options;

  const mergedImages = {
    ...(images ?? {}),
    remotePatterns: mergeImageRemotePatterns(images),
  };

  return {
    reactStrictMode: true,
    output: 'standalone',
    outputFileTracingRoot: appDir ? path.join(appDir, '../../..') : undefined,
    transpilePackages: uniq([...BASE_TRANSPILE_PACKAGES, ...transpilePackages]),
    ...overrides,
    ...(serverExternalPackages.length > 0
      ? { serverExternalPackages: uniq(serverExternalPackages) }
      : {}),
    images: mergedImages,
    async headers() {
      const appHeaders = typeof headers === 'function' ? await headers() : [];
      return [...ssooSecurityHeaders, ...appHeaders];
    },
  };
}

module.exports = {
  BASE_TRANSPILE_PACKAGES,
  GLOBAL_IMAGE_REMOTE_PATTERNS,
  createSsooNextConfig,
};
