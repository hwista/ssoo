function assertDisposableDbPushTarget({ databaseUrl, nodeEnv, baselineMode }) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for local Prisma db push.');
  }

  let target;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('Prisma db push is limited to PostgreSQL development targets.');
  }

  const host = target.hostname.toLowerCase();
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//u, ''));
  // `postgres` is the compose service name and `ssoo-postgres` its container_name;
  // both address the compose-local database container.
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'ssoo-postgres']);
  const disposableName = /(^|[_-])(dev|test|local|scratch|tmp|candidate)([_-]|$)/iu.test(databaseName);

  if (nodeEnv?.toLowerCase() === 'production' || baselineMode?.toLowerCase() === 'strict') {
    throw new Error('Prisma db push is forbidden in production or strict baseline mode.');
  }
  if (!localHosts.has(host)) {
    throw new Error('Prisma db push is limited to a local PostgreSQL host.');
  }
  if (!disposableName) {
    throw new Error('Prisma db push requires a database name marked dev, test, local, scratch, tmp, or candidate.');
  }

  return { databaseName, host };
}

export { assertDisposableDbPushTarget };
