# syntax=docker/dockerfile:1

# ─── Build stage ──────────────────────────────────────────────────────────────
# Compiles the web bundle and the server, then prunes dev dependencies so the
# resulting node_modules (including the compiled better-sqlite3 binary) can be
# copied verbatim into the slim runtime image.
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Toolchain for any native module that lacks a prebuilt binary (better-sqlite3).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

# Build both workspaces.
COPY tsconfig.base.json ./
COPY apps ./apps
RUN npm run build

# Drop dev dependencies; keep compiled native binaries.
RUN npm prune --omit=dev

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATABASE_PATH=/app/data/sshid.sqlite \
    WEB_ROOT=/app/apps/web/dist

# Pruned production dependencies and compiled output.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist

# Persisted SQLite data, owned by the unprivileged runtime user.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 8080

# Liveness probe using Node's built-in fetch (no extra packages required).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/server/dist/index.js"]
