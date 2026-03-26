import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function read(relPath) {
  const absPath = path.join(projectRoot, relPath);
  return fs.readFileSync(absPath, 'utf8');
}

const checks = [
  {
    file: 'src/components/templates/page-frame/SectionedShell.tsx',
    patterns: [
      "const BODY_SLOT_CONTENT_CLASS = 'h-full min-h-0 overflow-hidden';",
      '<div className={BODY_SLOT_CONTENT_CLASS}>',
    ],
    description: 'SectionedShell body slot content wrapper contract',
  },
  {
    file: 'src/components/templates/page-frame/layoutPresets.ts',
    patterns: [
      "aiChat: 'h-full min-h-0 overflow-hidden",
      "aiSearch: 'h-full min-h-0 overflow-hidden",
    ],
    description: 'Shell body wrapper presets include height contract',
  },
  {
    file: 'src/components/pages/markdown/_components/editor/Content.tsx',
    patterns: [
      "isEmbedded ? 'h-full min-h-0 overflow-hidden'",
    ],
    description: 'Editor embedded content honors body slot contract',
  },
  {
    file: 'src/components/common/viewer/Content.tsx',
    patterns: [
      "isEmbedded ? 'h-full min-h-0 overflow-hidden'",
    ],
    description: 'Viewer embedded content honors body slot contract',
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.file);
  for (const pattern of check.patterns) {
    if (!text.includes(pattern)) {
      failures.push(`- ${check.description} (${check.file}) missing pattern: ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error('[shell-body-contract] failed');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('[shell-body-contract] passed');
