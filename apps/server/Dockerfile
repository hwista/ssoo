FROM node:20 AS base
RUN corepack enable && \
    corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --filter server... --frozen-lockfile

FROM base AS builder
ARG NODE_TLS_REJECT_UNAUTHORIZED=0
COPY --from=deps /app/ ./
COPY . .

ENV NODE_ENV=production
ENV NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED}
RUN pnpm --filter @ssoo/database db:generate && \
    pnpm --filter @ssoo/types build && \
    pnpm --filter @ssoo/database build && \
    pnpm --filter server build

FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app /app

RUN mkdir -p /app/apps/web/dms/data/wiki \
    /app/apps/web/dms/data/templates \
    /app/apps/web/dms/data/ingest \
    /app/apps/web/dms/data/storage/local \
    /app/apps/web/dms/data/documents && \
    git init /app/apps/web/dms/data/documents

WORKDIR /app/apps/server

EXPOSE 4000

CMD ["node", "dist/main.js"]
