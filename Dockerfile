# ── Stage 1: Compile backend TypeScript ──────────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init

# Backend production deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled backend
COPY --from=backend-build /build/backend/dist ./dist

# Pre-built frontend (committed to git, avoids OOM from running Vite in CI)
COPY frontend/dist /app/frontend/dist

# Persistent uploads folder
RUN mkdir -p /app/backend/uploads && chown -R node:node /app

USER node
EXPOSE 3001
WORKDIR /app/backend

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
