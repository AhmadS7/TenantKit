# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Enable pnpm via the Node-bundled corepack shim
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# --- Stage 2: Production Run ---
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /usr/src/app/dist ./dist
# Also copy migrations so the server can run them on start
COPY --from=builder /usr/src/app/src/migrations ./src/migrations

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
