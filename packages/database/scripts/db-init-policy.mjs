import { pathToFileURL } from 'node:url';
import { assertDisposableDbPushTarget } from './db-push-target.mjs';

// A populated database is never a bootstrap target, even when its row counts are zero.
export function assertDbInitPolicy({ mode = 'upgrade', tableCount, databaseUrl, baselineMode, nodeEnv }) {
  if (!['upgrade', 'bootstrap', 'demo'].includes(mode)) {
    throw new Error('DB_INIT_SEED_MODE must be upgrade, bootstrap, or demo.');
  }
  if (!/^\d+$/u.test(String(tableCount))) throw new Error('Application table count is invalid.');
  const empty = Number(tableCount) === 0;
  if (mode === 'upgrade' && empty) {
    throw new Error('Empty database: provision explicitly with DB_INIT_SEED_MODE=bootstrap before deployment.');
  }
  if (mode !== 'upgrade' && !empty) {
    throw new Error('Bootstrap/demo requires an empty database. Existing databases must use upgrade; failed provisioning requires restore/review.');
  }
  if (mode === 'demo') {
    // Reuse the existing local/disposable target policy; never log connection URLs.
    assertDisposableDbPushTarget({ databaseUrl, baselineMode, nodeEnv });
  }
  return mode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertDbInitPolicy({
      mode: process.env.DB_INIT_SEED_MODE,
      tableCount: process.argv[2],
      databaseUrl: process.env.DATABASE_URL,
      baselineMode: process.env.DB_INIT_BASELINE_MODE,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error(`[db-init] ${error.message}`);
    process.exitCode = 1;
  }
}
