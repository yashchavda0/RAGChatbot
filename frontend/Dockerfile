# ============================================
# Stage 1: Dependencies (monorepo workspace install)
# ============================================
FROM node:18-alpine AS deps

WORKDIR /app

# Copy root + every workspace manifest first for better layer caching.
# npm ci at the root installs all workspaces and creates the @ragchatbot/* symlinks.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY packages/shared-ui/package.json ./packages/shared-ui/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/widget/package.json ./packages/widget/

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ============================================
# Stage 2: Development (hot-reload)
# ============================================
FROM deps AS development

WORKDIR /app

# Workspace source is needed in the image; live frontend source comes via volume mounts.
COPY packages ./packages
COPY frontend/next.config.mjs frontend/tsconfig.json frontend/postcss.config.js frontend/tailwind.config.ts frontend/package.json ./frontend/

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    WATCHPACK_POLLING=true

EXPOSE 3000

WORKDIR /app/frontend
CMD ["npm", "run", "dev"]

# ============================================
# Stage 3: Builder (Production)
# ============================================
FROM deps AS builder

WORKDIR /app

COPY packages ./packages
COPY frontend ./frontend

# NEXT_PUBLIC_* are inlined into the browser bundle at build time — pass the
# public host in as build args so the shipped UI calls the right API origin.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

RUN --mount=type=cache,target=/app/frontend/.next/cache \
    npm run build --workspace=frontend

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

# With experimental.outputFileTracingRoot set to the monorepo root, the standalone
# output preserves the /frontend + /packages layout under .next/standalone.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "frontend/server.js"]
