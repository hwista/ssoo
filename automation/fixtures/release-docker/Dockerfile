ARG NODE_IMAGE=node:22
ARG POSTGRES_IMAGE=pgvector/pgvector:pg17
FROM ${NODE_IMAGE} AS node
FROM ${POSTGRES_IMAGE}
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY . /fixture/
RUN mkdir -p /app/apps/server/dist/config && \
    cp /fixture/config-validation.mjs /app/apps/server/dist/config/config.validation.js && \
    printf '{"type":"module"}\n' > /app/package.json && \
    cp /fixture/pnpm /usr/local/bin/pnpm && chmod +x /usr/local/bin/pnpm
ARG FIXTURE_REVISION
LABEL ssoo.test.fixture="release-docker" ssoo.test.revision="${FIXTURE_REVISION}"
ENTRYPOINT ["node", "/fixture/server.mjs"]
