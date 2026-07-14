# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy pnpm workspace configurations and lockfiles
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies for backend only to leverage Docker caching
RUN pnpm install --frozen-lockfile --filter backend

# Copy source code
COPY apps/backend ./apps/backend

# Generate Prisma Client
RUN pnpm --filter backend prisma generate

# Build backend
RUN pnpm --filter backend build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy pnpm workspace configurations and lockfiles
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --filter backend

# Copy built application from builder stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]

