ARG SSOO_NODE_IMAGE=node:22
FROM pgvector/pgvector:pg17 AS postgres-client

FROM ${SSOO_NODE_IMAGE} AS base
RUN corepack enable && \
    corepack prepare pnpm@11.13.1 --activate && \
    apt-get update && apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*
# Debian's default client can lag behind the PostgreSQL 17 runtime. Use its
# matching dump/restore tools and libpq; keep the packaged runtime dependencies.
COPY --from=postgres-client /usr/lib/postgresql/17/bin/pg_dump /usr/local/bin/pg_dump
COPY --from=postgres-client /usr/lib/postgresql/17/bin/pg_restore /usr/local/bin/pg_restore
COPY --from=postgres-client /usr/lib/postgresql/17/bin/psql /usr/local/bin/psql
COPY --from=postgres-client /usr/lib/*-linux-gnu/libpq.so.5 /usr/local/lib/libpq.so.5
RUN ldconfig && pg_dump --version && pg_restore --version && psql --version
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/admin/package.json apps/web/admin/package.json
COPY apps/web/crm/package.json apps/web/crm/package.json
COPY apps/web/dms/package.json apps/web/dms/package.json
COPY apps/web/pms/package.json apps/web/pms/package.json
COPY apps/web/sns/package.json apps/web/sns/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/web-auth/package.json packages/web-auth/package.json
COPY packages/web-shell/package.json packages/web-shell/package.json
COPY packages/web-ui/package.json packages/web-ui/package.json
RUN --mount=type=secret,id=ssoo_tls_ca,required=false \
    --mount=type=cache,id=ssoo-pnpm-v11,target=/root/.local/share/pnpm/store,sharing=locked \
    --mount=type=cache,id=ssoo-pnpm-v11-metadata,target=/root/.cache/pnpm,sharing=locked \
    if [ -s /run/secrets/ssoo_tls_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; \
    fi && \
    pnpm install --filter @ssoo/database... --frozen-lockfile

COPY packages/database/ packages/database/
COPY packages/types/ packages/types/
COPY scripts/db-init-entrypoint.sh scripts/db-init-entrypoint.sh
COPY scripts/verify-dms-backup-restore.mjs scripts/verify-dms-backup-restore.mjs

# Rehearsal and deployment run without downloading Prisma engines at startup.
RUN --mount=type=secret,id=ssoo_tls_ca,required=false \
    if [ -s /run/secrets/ssoo_tls_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; fi && \
    pnpm --filter @ssoo/database db:generate

ENTRYPOINT ["bash", "scripts/db-init-entrypoint.sh"]
