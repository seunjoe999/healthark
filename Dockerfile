# ── Stage 1: Build frontend ───────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Compile backend TypeScript ──────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init

# Backend production deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled backend
COPY --from=backend-build /build/backend/dist ./dist

# Built frontend (backend resolves __dirname/../../frontend/dist)
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

# Persistent uploads folder
RUN mkdir -p /app/backend/uploads && chown -R node:node /app

USER node
EXPOSE 3001
WORKDIR /app/backend

# dumb-init handles PID 1 / signal forwarding correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
