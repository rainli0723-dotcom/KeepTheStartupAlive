# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=prisma-postgres/schema.prisma
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 ktsa

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built assets
COPY --from=builder --chown=ktsa:nodejs /app/.next/standalone ./
COPY --from=builder --chown=ktsa:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=ktsa:nodejs /app/prisma-postgres ./prisma-postgres
COPY --from=builder --chown=ktsa:nodejs /app/scripts ./scripts
COPY --from=builder --chown=ktsa:nodejs /app/public ./public
COPY --from=builder --chown=ktsa:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=ktsa:nodejs /app/node_modules/prisma ./node_modules/prisma

# Docs for reference (optional)
COPY --from=builder --chown=ktsa:nodejs /app/docs ./docs

USER ktsa
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
