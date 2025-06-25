# Dockerfile pour EcoDeli - Application Next.js avec optimisations de production

# Stage 1: Base image avec Node.js
FROM node:18-alpine AS base

# Installation des dépendances système nécessaires
RUN apk add --no-cache libc6-compat

# Configuration des variables d'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration des dépendances
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Installation de pnpm
RUN npm install -g pnpm

# Stage 2: Installation des dépendances
FROM base AS deps

# Installation des dépendances de production et de développement
RUN pnpm install --frozen-lockfile

# Stage 3: Build de l'application
FROM base AS builder

# Copie des dépendances depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules

# Copie de tous les fichiers source
COPY . .

# Configuration des variables d'environnement pour le build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Variables d'environnement placeholder (à remplacer en runtime)
ENV DATABASE_URL="placeholder"
ENV NEXTAUTH_SECRET="placeholder"
ENV NEXTAUTH_URL="placeholder"

# Build de l'application Next.js
RUN pnpm build

# Stage 4: Image finale de production
FROM node:18-alpine AS runner

# Installation des dépendances système pour la production
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Configuration du timezone
ENV TZ=Europe/Paris

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Configuration du répertoire de travail
WORKDIR /app

# Variables d'environnement de production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copie des fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copie du build Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Création des répertoires pour les logs
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Création du répertoire pour les uploads
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Configuration des permissions
RUN chown -R nextjs:nodejs /app

# Passage à l'utilisateur non-root
USER nextjs

# Exposition du port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Script de démarrage avec dumb-init pour une gestion propre des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage
CMD ["node", "server.js"]

# Labels pour la métadonnée
LABEL maintainer="EcoDeli Team <dev@ecodeli.fr>"
LABEL description="EcoDeli - Plateforme de crowdshipping et services collaboratifs"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/ecodeli/platform"