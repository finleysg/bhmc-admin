FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy api package files
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Source mounted via volume at runtime

WORKDIR /app/apps/api

EXPOSE 3333

CMD ["pnpm", "dev"]
