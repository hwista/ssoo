const fs = require('fs');
const paths = [
  // TypeDoc
  'docs/common/reference/typedoc/server',
  'docs/common/reference/typedoc/types',
  'docs/pms/reference/typedoc/server',
  'docs/pms/reference/typedoc/web',
  // OpenAPI (JSON + HTML)
  'docs/common/reference/api/openapi.json',
  'docs/common/reference/api/index.html',
  'docs/pms/reference/api/openapi.json',
  'docs/pms/reference/api/index.html',
  // Database ERD
  'docs/common/reference/db/erd.svg',
  'docs/pms/reference/db/erd.svg',
  // Storybook
  'docs/pms/reference/storybook',
];
const missing = paths.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('❌ Missing docs outputs:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All docs outputs exist:', paths.length, 'items verified');
