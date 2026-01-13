# Slack Scopes Auditor - Docker Image
FROM node:20-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy all project files (respects .dockerignore)
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build using TypeScript build mode (handles project references correctly)
RUN npx tsc --build

# Production image
FROM node:20-alpine AS runner

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/web ./packages/web
COPY --from=builder /app/assets ./assets

# Set the entrypoint to the CLI
ENTRYPOINT ["node", "/app/packages/cli/dist/bin.js"]

# Default command shows help
CMD ["--help"]
