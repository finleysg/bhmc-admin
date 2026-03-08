# Build stage
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy package.json files for dependency resolution
COPY apps/admin/package.json ./apps/admin/
COPY packages/domain/package.json ./packages/domain/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/admin ./apps/admin
COPY packages/domain ./packages/domain

# Build domain package first
WORKDIR /app/packages/domain
RUN pnpm build

# Build Next.js app
WORKDIR /app/apps/admin
ARG NEXT_PUBLIC_DJANGO_URL
ENV NEXT_PUBLIC_DJANGO_URL=$NEXT_PUBLIC_DJANGO_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
RUN pnpm build

# Source maps stage (for CI extraction only)
FROM builder AS sourcemaps
RUN mkdir -p /sourcemaps && find /app/apps/admin/.next/static -name '*.map' -exec cp {} /sourcemaps/ \;

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static

# Remove source maps so they are not served publicly
RUN find ./apps/admin/.next/static -name '*.map' -delete

USER nextjs

EXPOSE 3000

CMD ["node", "apps/admin/server.js"]
