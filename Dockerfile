# syntax=docker/dockerfile:1.4
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat postgresql-client bash git

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Install pnpm
RUN npm install -g pnpm

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Variables d'environnement pour le build
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG STRIPE_PUBLISHABLE_KEY
ARG ONESIGNAL_APP_ID
ARG ONESIGNAL_API_KEY
ARG NODE_ENV
ARG DOCKER

# Passer les variables comme variables d'environnement
ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
ENV ONESIGNAL_APP_ID=$ONESIGNAL_APP_ID
ENV ONESIGNAL_API_KEY=$ONESIGNAL_API_KEY
ENV NODE_ENV=$NODE_ENV
ENV DOCKER=$DOCKER

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm for builder
RUN npm install -g pnpm

# Générer le client Prisma
RUN pnpm prisma generate

# Build with cache optimization
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_ENV_VALIDATION 1

RUN --mount=type=cache,target=/app/.next/cache \
    pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    postgresql-client \
    bash

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy messages for i18n
COPY --from=builder --chown=nextjs:nodejs /app/src/messages ./src/messages

# Create necessary directories
RUN mkdir -p ./public/uploads ./logs
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy and make executable the startup script
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/docker-start.sh"]