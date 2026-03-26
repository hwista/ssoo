import { statSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..'); // packages/database
const workspaceRoot = join(root, '..', '..'); // sooo

const targets = [
  { schema: 'common', out: ['docs', 'common', 'reference', 'db', 'erd.svg'] },
  { schema: 'pms', out: ['docs', 'pms', 'reference', 'db', 'erd.svg'] },
  { schema: 'dms', out: ['docs', 'dms', 'reference', 'db', 'erd.svg'] },
];

for (const { schema, out } of targets) {
  const src = join(root, 'dbml', `${schema}.dbml`);
  const dest = join(workspaceRoot, ...out);
  try {
    const size = statSync(src).size;
    if (size === 0) {
      // eslint-disable-next-line no-console
      console.log(`[skip] ${schema}.dbml is empty; ERD not generated`);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    execSync(`npx dbml-renderer --input "${src}" --output "${dest}"`, { stdio: 'inherit' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[error] rendering ${schema}:`, err.message);
    process.exitCode = 1;
  }
}
