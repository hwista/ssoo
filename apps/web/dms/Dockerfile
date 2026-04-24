# ============================================================
# DMS Workspace Dockerfile
# 모노레포 통합 런타임용 (pnpm workspace + @ssoo/types)
# ============================================================

FROM node:20 AS base
RUN corepack enable && \
    corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/dms/package.json apps/web/dms/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/web-auth/package.json packages/web-auth/package.json
COPY packages/web-shell/package.json packages/web-shell/package.json
COPY packages/types/tsconfig.json packages/types/tsconfig.json
RUN pnpm install --filter web-dms... --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/ ./
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @ssoo/types build && \
    pnpm --filter @ssoo/web-auth build && \
    pnpm --filter @ssoo/web-shell build && \
    pnpm --filter web-dms build

FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 nextjs

COPY --from=builder /app/apps/web/dms/.next/standalone ./
COPY --from=builder /app/apps/web/dms/.next/static ./apps/web/dms/.next/static

USER nextjs
WORKDIR /app/apps/web/dms

EXPOSE 3001

CMD ["node", "server.js"]
