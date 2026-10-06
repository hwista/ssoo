# syntax=docker/dockerfile:1

FROM node:22

# jq: the GitLab pipeline contract test runs scripts/ci/ai-review.sh, which parses API JSON with jq.
RUN apt-get update -qq && apt-get install -y --no-install-recommends jq && rm -rf /var/lib/apt/lists/*

RUN corepack enable && \
    corepack prepare pnpm@11.13.1 --activate && \
    git config --system --add safe.directory /app

WORKDIR /app
COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @ssoo/database db:generate
