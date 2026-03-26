import { copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..'); // packages/database
const workspaceRoot = join(root, '..', '..'); // sooo

const targets = [
  { schema: 'common', outDir: ['docs', 'common', 'reference', 'db'] },
  { schema: 'pms', outDir: ['docs', 'pms', 'reference', 'db'] },
  { schema: 'dms', outDir: ['docs', 'dms', 'reference', 'db'] },
];

for (const { schema, outDir } of targets) {
  const src = join(root, 'dbml', `${schema}.dbml`);
  const destDir = join(workspaceRoot, ...outDir);
  const dest = join(destDir, 'schema.dbml');
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  // eslint-disable-next-line no-console
  console.log(`Copied ${schema}.dbml -> ${dest}`);
}
