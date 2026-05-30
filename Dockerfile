# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production Run ---
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
# Also copy migrations so the server can run them on start
COPY --from=builder /usr/src/app/src/migrations ./src/migrations

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
