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
    pnpm install --filter web-pms... --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ARG NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_CRM_APP_URL=http://localhost:3001
ARG NEXT_PUBLIC_PMS_APP_URL=http://localhost:3002
ARG NEXT_PUBLIC_DMS_APP_URL=http://localhost:3003
ARG NEXT_PUBLIC_SNS_APP_URL=http://localhost:3004
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_ADMIN_APP_URL=${NEXT_PUBLIC_ADMIN_APP_URL}
ENV NEXT_PUBLIC_CRM_APP_URL=${NEXT_PUBLIC_CRM_APP_URL}
ENV NEXT_PUBLIC_PMS_APP_URL=${NEXT_PUBLIC_PMS_APP_URL}
ENV NEXT_PUBLIC_DMS_APP_URL=${NEXT_PUBLIC_DMS_APP_URL}
ENV NEXT_PUBLIC_SNS_APP_URL=${NEXT_PUBLIC_SNS_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/ ./
COPY apps/web/pms/ apps/web/pms/
COPY packages/types/ packages/types/
COPY packages/web-ui/ packages/web-ui/
COPY packages/web-shell/ packages/web-shell/
COPY packages/web-auth/ packages/web-auth/

RUN --mount=type=secret,id=ssoo_tls_ca,required=false \
    if [ -s /run/secrets/ssoo_tls_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; \
    fi && \
    pnpm --filter @ssoo/types build && \
    pnpm --filter @ssoo/web-ui build && \
    pnpm --filter @ssoo/web-shell build && \
    pnpm --filter @ssoo/web-auth build && \
    pnpm --filter web-pms build

FROM ${SSOO_NODE_IMAGE} AS runner
ARG SSOO_RELEASE_SHA=local-development
ENV SSOO_RELEASE_SHA=${SSOO_RELEASE_SHA}
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_CRM_APP_URL=http://localhost:3001
ENV NEXT_PUBLIC_PMS_APP_URL=http://localhost:3002
ENV NEXT_PUBLIC_DMS_APP_URL=http://localhost:3003
ENV NEXT_PUBLIC_SNS_APP_URL=http://localhost:3004

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 nextjs

COPY --from=builder /app/apps/web/pms/.next/standalone ./
COPY --from=builder /app/apps/web/pms/.next/static ./apps/web/pms/.next/static

USER nextjs
WORKDIR /app/apps/web/pms

EXPOSE 3002

CMD ["node", "server.js"]
