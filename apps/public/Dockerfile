FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/public/package.json apps/public/vite.config.ts apps/public/tsconfig.json apps/public/index.html ./apps/public/
COPY apps/public/public ./apps/public/public
COPY packages/domain/package.json ./packages/domain/

RUN pnpm install --frozen-lockfile

COPY packages/domain ./packages/domain
RUN pnpm --filter @repo/domain build

WORKDIR /app/apps/public

EXPOSE 3000

CMD ["pnpm", "dev", "--host"]
