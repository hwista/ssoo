const ssooCspReportOnly = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.gravatar.com",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* ws://localhost:* https:",
  "frame-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'trusted-types ssoo-dms-markdown default',
  "require-trusted-types-for 'script'",
].join('; ');

const ssooSecurityHeaders = [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
      },
      {
        key: 'Content-Security-Policy-Report-Only',
        value: ssooCspReportOnly,
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ],
  },
];

module.exports = ssooSecurityHeaders;
