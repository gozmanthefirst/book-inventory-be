FROM node:20-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat

# Set up the application directory
WORKDIR /app

# Copy only the files needed for installation
COPY pnpm-lock.yaml package.json tsconfig.json src ./

# Copy the Prisma directory to allow for `pnpm dlx prisma generate`
COPY prisma ./prisma

# Install dependencies and build application
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm dlx prisma generate && \
    pnpm build && \
    pnpm prune --prod

# Production stage with only essential files
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

# Use non-root user
USER hono

# Expose the application port
EXPOSE 8000

# Start the application
CMD ["node", "/app/dist/index.js"]