# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy pnpm workspace configurations and lockfiles
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/zalo-mini-app/package.json ./apps/zalo-mini-app/

# Install dependencies for frontend only to leverage Docker caching
RUN pnpm install --frozen-lockfile --filter zalo-mini-app

# Copy source code
COPY apps/zalo-mini-app ./apps/zalo-mini-app

# Build application
RUN pnpm --filter zalo-mini-app build

# Production stage
FROM nginx:alpine AS production

# Copy built application from builder stage
COPY --from=builder /app/apps/zalo-mini-app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/zalo-mini-app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

