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

const { spawnSync } = require('child_process');

const additionalChecks = [
  ['DMS GitLab document sync operator guide', 'node', ['scripts/check-dms-gitlab-ops-docs.mjs']],
];

for (const [label, command, args] of additionalChecks) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`❌ ${label} failed`);
    process.exit(result.status || 1);
  }
}

console.log('✅ Additional docs contract checks passed:', additionalChecks.length, 'item(s) verified');
