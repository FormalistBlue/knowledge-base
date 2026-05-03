# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --filter server... --frozen-lockfile

FROM deps AS build
COPY apps/server apps/server
RUN pnpm --filter server db:generate \
  && pnpm --filter server build

FROM deps AS runtime-deps
COPY apps/server/prisma apps/server/prisma
RUN pnpm --filter server db:generate

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init \
  && addgroup -S app \
  && adduser -S app -G app \
  && mkdir -p /app/data/uploads \
  && chown -R app:app /app
COPY --from=runtime-deps --chown=app:app /app/package.json ./package.json
COPY --from=runtime-deps --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=runtime-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=runtime-deps --chown=app:app /app/apps/server/node_modules apps/server/node_modules
COPY --from=runtime-deps --chown=app:app /app/apps/server/package.json apps/server/package.json
COPY --from=runtime-deps --chown=app:app /app/apps/server/prisma apps/server/prisma
COPY --from=build --chown=app:app /app/apps/server/dist apps/server/dist
USER app
EXPOSE 3000
CMD ["dumb-init", "node", "apps/server/dist/server.js"]
