FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package files
COPY apps/web/package.json ./apps/web/
COPY packages/domain/package.json ./packages/domain/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy shared domain source (for TypeScript)
COPY packages/domain ./packages/domain

# Source mounted via volume at runtime

WORKDIR /app/apps/web

EXPOSE 3100

CMD ["pnpm", "dev", "-p", "3100"]
