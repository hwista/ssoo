FROM node:20 AS base
RUN corepack enable && \
    corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/admin/package.json apps/web/admin/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/web-auth/package.json packages/web-auth/package.json
COPY packages/web-shell/package.json packages/web-shell/package.json
RUN pnpm install --filter web-admin... --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/ ./
COPY . .

RUN pnpm --filter @ssoo/types build && \
    pnpm --filter @ssoo/web-auth build && \
    pnpm --filter @ssoo/web-shell build && \
    pnpm --filter web-admin build

FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 nextjs

COPY --from=builder /app/apps/web/admin/.next/standalone ./
COPY --from=builder /app/apps/web/admin/.next/static ./apps/web/admin/.next/static

USER nextjs
WORKDIR /app/apps/web/admin

EXPOSE 3003

CMD ["node", "server.js"]
