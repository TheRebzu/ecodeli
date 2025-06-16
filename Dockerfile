# Dockerfile pour EcoDeli avec CSS fonctionnel
FROM node:20-alpine

WORKDIR /app

# Installation des dépendances système
RUN apk add --no-cache curl libc6-compat

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installation des dépendances
RUN pnpm install

# Copie des fichiers de configuration
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./
COPY tailwind.config.* ./

# Copie du dossier prisma
COPY prisma ./prisma/

# Copie du code source
COPY src ./src/

# Génération du client Prisma
RUN pnpm prisma generate

# Exposition du port
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Commande de démarrage
CMD ["pnpm", "dev"]