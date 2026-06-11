FROM node:20 AS base
RUN corepack enable &&     corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/crm/package.json apps/web/crm/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/web-shell/package.json packages/web-shell/package.json
RUN pnpm install --filter web-crm... --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ARG CRM_SERVER_API_URL=http://server:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV CRM_SERVER_API_URL=${CRM_SERVER_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/ ./
COPY . .

RUN pnpm --filter @ssoo/types build &&     pnpm --filter @ssoo/web-shell build &&     pnpm --filter web-crm build

FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3004
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs &&     useradd --system --uid 1001 --gid 1001 nextjs

COPY --from=builder /app/apps/web/crm/.next/standalone ./
COPY --from=builder /app/apps/web/crm/.next/static ./apps/web/crm/.next/static

USER nextjs
WORKDIR /app/apps/web/crm

EXPOSE 3004

CMD ["node", "server.js"]
