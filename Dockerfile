# =============================================================================
# DOCKERFILE POUR L'APPLICATION WEB NEXT.JS - MULTI-STAGE
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY prisma/ ./prisma/

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des dépendances depuis le stage deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copie du code source
COPY . .

# Génération du client Prisma
RUN cd apps/web && pnpm prisma generate

# Build de l'application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN cd apps/web && pnpm build

# =============================================================================
# Stage 3: Development
FROM node:20-alpine AS development
WORKDIR /app

# Installation des outils de développement
RUN apk add --no-cache \
    curl \
    git \
    && npm install -g pnpm

# Copie des dépendances
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copie du code source
COPY . .

# Génération du client Prisma
RUN cd apps/web && pnpm prisma generate

# Exposition du port
EXPOSE 3000

# Variables d'environnement pour le développement
ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1
ENV WATCHPACK_POLLING true

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Commande de démarrage
CMD ["sh", "-c", "cd apps/web && pnpm dev"]

# =============================================================================
# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

# Création d'un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    curl \
    dumb-init \
    && npm install -g pnpm

# Copie des fichiers de build
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copie des fichiers de configuration
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/
COPY --from=builder /app/prisma ./prisma/

# Copie des node_modules optimisés
COPY --from=deps /app/node_modules ./node_modules

# Configuration des permissions
RUN chown -R nextjs:nodejs /app

# Changement vers l'utilisateur non-root
USER nextjs

# Exposition du port
EXPOSE 3000

# Variables d'environnement pour la production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Script d'entrypoint avec dumb-init pour une gestion propre des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage
CMD ["node", "apps/web/server.js"]

# =============================================================================
# Stage 5: Testing
FROM development AS testing

# Installation des dépendances de test supplémentaires
USER root
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configuration pour Chromium
ENV CHROMIUM_PATH /usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH ${CHROMIUM_PATH}

# Retour à l'utilisateur standard
USER node

# Variables d'environnement pour les tests
ENV NODE_ENV test
ENV CI true

# Commande de test
CMD ["sh", "-c", "cd apps/web && pnpm test"]

# =============================================================================
# Stage 6: Final (production par défaut)
FROM production AS final

# Métadonnées
LABEL maintainer="EcoDeli Team"
LABEL description="Application Web EcoDeli - Next.js"
LABEL version="1.0.0"

# Documentation
RUN echo "Application Web EcoDeli" > /app/README.txt
RUN echo "Port: 3000" >> /app/README.txt
RUN echo "Health: /api/health" >> /app/README.txt
RUN echo "Build: $(date)" >> /app/README.txt