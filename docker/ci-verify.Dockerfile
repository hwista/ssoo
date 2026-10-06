# syntax=docker/dockerfile:1

FROM node:22

RUN corepack enable && \
    corepack prepare pnpm@11.13.1 --activate && \
    git config --system --add safe.directory /app

WORKDIR /app
COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=ssoo_tls_ca,required=false \
    if [ -s /run/secrets/ssoo_tls_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; fi && \
    pnpm install --frozen-lockfile

RUN --mount=type=secret,id=ssoo_tls_ca,required=false \
    if [ -s /run/secrets/ssoo_tls_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; fi && \
    pnpm --filter @ssoo/database db:generate
