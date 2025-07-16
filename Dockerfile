# Utilisation d'une base Alpine pour la taille optimale
FROM node:18-alpine AS base

# Installation des dépendances système et des outils nécessaires
RUN apk add --no-cache \
    libc6-compat \
    postgresql-client \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration des dépendances
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copie des fichiers Prisma nécessaires pour le script postinstall
COPY prisma ./prisma

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

# Installation des dépendances système nécessaires en runtime
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    postgresql-client \
    bash \
    && rm -rf /var/cache/apk/*

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Définition du répertoire de travail
WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de configuration
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copie des fichiers de base de données et scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Copie du build de l'application Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copie des assets publics
COPY --from=builder /app/public ./public

# Copie des fichiers de traduction
COPY --from=builder /app/src/messages ./src/messages

# Création des répertoires nécessaires
RUN mkdir -p ./public/uploads ./logs

# Changement du propriétaire des fichiers
RUN chown -R nextjs:nodejs /app

# Changement vers l'utilisateur non-root
USER nextjs

# Exposition du port de l'application
EXPOSE 3000

# Configuration des variables d'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Utilisation de dumb-init pour gérer correctement les signaux
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Commande de démarrage utilisant le script d'initialisation
CMD ["/app/scripts/docker-start.sh"]

# Labels pour la métadonnée
LABEL maintainer="EcoDeli Team <dev@ecodeli.fr>"
LABEL description="EcoDeli - Plateforme de crowdshipping et services collaboratifs"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/ecodeli/platform"