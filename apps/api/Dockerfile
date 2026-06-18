# Production API image — multi-stage build
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/schema/package.json ./packages/schema/
COPY packages/routing/package.json ./packages/routing/
COPY packages/parser/package.json ./packages/parser/
COPY packages/mcc/package.json ./packages/mcc/
RUN pnpm install --frozen-lockfile --filter @stipulate/api...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @stipulate/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S stipulate && adduser -S stipulate -G stipulate
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/migrations ./migrations
COPY --from=build /app/node_modules ./node_modules
USER stipulate
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1
CMD ["node", "dist/index.js"]
