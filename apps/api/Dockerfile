# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN npm install --global pnpm@10.34.9

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @app/shared build && pnpm --filter @app/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo

# Only the manifests needed to resolve the API's production dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod --filter @app/api

COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
# SQL migrations stay with the image so deploy can run dist/migrate.js.
COPY --from=build /repo/apps/api/drizzle apps/api/drizzle

WORKDIR /repo/apps/api
ENV PORT=8080
EXPOSE 8080

# Non-root: the API writes nothing to disk except Postgres and Redis connections.
USER node
CMD ["node", "dist/index.js"]
