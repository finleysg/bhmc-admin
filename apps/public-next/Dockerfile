# Build stage
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy package.json files for dependency resolution
COPY apps/public-next/package.json ./apps/public-next/
COPY packages/domain/package.json ./packages/domain/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/public-next ./apps/public-next
COPY packages/domain ./packages/domain

# Build domain package first
WORKDIR /app/packages/domain
RUN pnpm build

# Build Next.js app
WORKDIR /app/apps/public-next
ARG NEXT_PUBLIC_DJANGO_URL
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY
ARG NEXT_PUBLIC_GIPHY_API_KEY
ARG NEXT_PUBLIC_MODE=Live
ENV NEXT_PUBLIC_DJANGO_URL=$NEXT_PUBLIC_DJANGO_URL
ENV NEXT_PUBLIC_STRIPE_PUBLIC_KEY=$NEXT_PUBLIC_STRIPE_PUBLIC_KEY
ENV NEXT_PUBLIC_GIPHY_API_KEY=$NEXT_PUBLIC_GIPHY_API_KEY
ENV NEXT_PUBLIC_MODE=$NEXT_PUBLIC_MODE
RUN pnpm build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build and public assets
COPY --from=builder /app/apps/public-next/.next/standalone ./
COPY --from=builder /app/apps/public-next/.next/static ./apps/public-next/.next/static
COPY --from=builder /app/apps/public-next/public ./apps/public-next/public

RUN mkdir -p ./apps/public-next/.next/cache && chown nextjs:nodejs ./apps/public-next/.next/cache

USER nextjs

EXPOSE 3000

CMD ["node", "apps/public-next/server.js"]
