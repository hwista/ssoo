FROM node:20 AS base
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN corepack enable && \
    corepack prepare pnpm@10.28.0 --activate && \
    apt-get update && apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --filter @ssoo/database... --frozen-lockfile

COPY packages/database/ packages/database/
COPY packages/types/ packages/types/
COPY scripts/db-init-entrypoint.sh scripts/db-init-entrypoint.sh

ENTRYPOINT ["bash", "scripts/db-init-entrypoint.sh"]
