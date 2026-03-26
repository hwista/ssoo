import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const pagesRoot = path.join(projectRoot, 'src/components/pages');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(absPath));
    } else {
      results.push(absPath);
    }
  }

  return results;
}

function toProjectRelative(absPath) {
  return path.relative(projectRoot, absPath).replaceAll(path.sep, '/');
}

const failures = [];
const pageFiles = walk(pagesRoot).map(toProjectRelative);

for (const file of pageFiles) {
  const parts = file.split('/');
  const fileName = parts[parts.length - 1];
  const isSupportFile =
    parts.includes('_components') ||
    parts.includes('_config') ||
    parts.includes('_utils') ||
    parts.includes('utils');
  const isDirectFeatureEntry =
    file.endsWith('.tsx') &&
    !isSupportFile &&
    parts.length === 7; // src/components/pages/<feature>/<file>

  if (fileName === 'Page.tsx') {
    failures.push(`- page entry must not use Page.tsx: ${file}`);
  }

  if (isDirectFeatureEntry && !fileName.endsWith('Page.tsx')) {
    failures.push(`- feature page entry must use {Feature}Page.tsx: ${file}`);
  }

  if (isDirectFeatureEntry) {
    const text = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    if (text.includes('export default')) {
      failures.push(`- feature page entry must not use default export: ${file}`);
    }
  }
}

const commonIndexText = fs.readFileSync(
  path.join(projectRoot, 'src/components/common/index.ts'),
  'utf8'
);

for (const pattern of ["from './viewer'", "from './editor'", "from './assistant'"]) {
  if (commonIndexText.includes(pattern)) {
    failures.push(`- common root barrel must not re-export domain-common modules: ${pattern}`);
  }
}

const legacyCommonPagePath = path.join(projectRoot, 'src/components/common/page');
if (fs.existsSync(legacyCommonPagePath)) {
  const hasTrackedLegacyFiles = walk(legacyCommonPagePath).length > 0;

  if (hasTrackedLegacyFiles) {
    failures.push('- legacy common/page layer must not exist; use templates/page-frame');
  }
}

if (failures.length > 0) {
  console.error('[golden-example] failed');
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log('[golden-example] passed');
