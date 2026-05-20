# ============================================
# Stage 1: Dependencies (cached by package.json hash)
# ============================================
FROM node:18-alpine AS deps

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ============================================
# Stage 2: Development (hot-reload)
# ============================================
FROM deps AS development

WORKDIR /app

# Only copy config files — source is mounted via docker-compose volumes
COPY frontend/next.config.mjs frontend/tsconfig.json frontend/postcss.config.mjs frontend/tailwind.config.ts ./
COPY frontend/package.json ./

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    WATCHPACK_POLLING=true

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================
# Stage 3: Builder (Production)
# ============================================
FROM deps AS builder

WORKDIR /app

COPY frontend/ .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ============================================
# Stage 4: Runner (Production)
# ============================================
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
