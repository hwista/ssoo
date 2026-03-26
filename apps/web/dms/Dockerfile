# ============================================================
# DMS Standalone Dockerfile
# 독립 배포용 (npm 기반, @ssoo/* 미참조)
# ============================================================

# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 서버 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 기본 설정 파일 (런타임 참조용)
COPY --from=builder /app/dms.config.default.json ./

# data 디렉토리 (볼륨 마운트 포인트)
RUN mkdir -p data/wiki data/templates data/ingest data/storage/local && \
    chown -R nextjs:nodejs data

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
