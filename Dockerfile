# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json tsconfig.server.json vite.config.ts ./
COPY src ./src
COPY data ./data
COPY scripts ./scripts
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4310
ENV LOCAL_BRAIN_PATH=/app/data/local-brain.json
ENV STARTER_BRAIN_PATH=/app/data/starter-brain.json
ENV ENABLE_EXTERNAL_STORES=false

RUN apk add --no-cache python3 \
    && addgroup -S neural && adduser -S neural -G neural

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts
RUN chown -R neural:neural /app/data

USER neural
EXPOSE 4310

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4310/api/v1/health?mode=liveness').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server/presentation/main.js"]
