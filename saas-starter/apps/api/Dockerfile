FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/billing/package.json packages/billing/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --network-concurrency=4 --fetch-timeout=600000

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=deps /app/packages/billing/node_modules packages/billing/node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json turbo.json ./
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY packages/billing packages/billing
COPY apps/api apps/api
RUN pnpm exec turbo run build --filter=@saas/api...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/db/dist packages/db/dist
COPY --from=build /app/packages/db/package.json packages/db/package.json
COPY --from=build /app/packages/db/migrations packages/db/migrations
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/billing/dist packages/billing/dist
COPY --from=build /app/packages/billing/package.json packages/billing/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/scripts apps/api/scripts
COPY --from=deps /app/packages/db/node_modules packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=deps /app/packages/billing/node_modules packages/billing/node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
EXPOSE 4000
CMD ["sh", "-c", "node apps/api/scripts/migrate.mjs && node apps/api/dist/index.js"]
