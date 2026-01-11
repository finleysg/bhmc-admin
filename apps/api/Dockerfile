# Build stage
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy package.json files for dependency resolution
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/domain ./packages/domain

# Build domain package first (API depends on it)
WORKDIR /app/packages/domain
RUN pnpm build

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# Production stage
FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
