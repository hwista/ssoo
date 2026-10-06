ARG SSOO_NODE_IMAGE=node:22
FROM ${SSOO_NODE_IMAGE} AS base
RUN corepack enable && \
    corepack prepare pnpm@11.13.1 --activate
WORKDIR /app

FROM base AS deps
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
    pnpm install --filter server... --frozen-lockfile

FROM base AS builder
ARG SSOO_RELEASE_SHA=local-development
COPY --from=deps /app/ ./
COPY apps/server/ apps/server/
COPY packages/database/ packages/database/
COPY packages/types/ packages/types/

ENV NODE_ENV=production
ENV SSOO_RELEASE_SHA=${SSOO_RELEASE_SHA}
RUN --mount=type=secret,id=ssoo_tls_ca,required=false \
    if [ -s /run/secrets/ssoo_tls_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; \
    fi && \
    pnpm --filter @ssoo/database db:generate && \
    pnpm --filter @ssoo/types build && \
    pnpm --filter @ssoo/database build && \
    pnpm --filter server build

FROM ${SSOO_NODE_IMAGE} AS runner
ARG SSOO_RELEASE_SHA=local-development
RUN apt-get update -qq && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
RUN git config --global --add safe.directory /var/lib/ssoo/documents
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV SSOO_RELEASE_SHA=${SSOO_RELEASE_SHA}

COPY --from=builder /app /app
COPY --chmod=755 docker/node-tls-ca-entrypoint.sh /usr/local/bin/node-tls-ca-entrypoint

WORKDIR /app/apps/server

EXPOSE 4000

ENTRYPOINT ["node-tls-ca-entrypoint"]
CMD ["node", "dist/main.js"]
