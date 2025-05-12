FROM node:20-alpine AS base

# Installer les dépendances nécessaires pour Prisma
RUN apk add --no-cache libc6-compat openssl

# Créer les répertoires d'application
WORKDIR /app

# Stage de dépendances
FROM base AS deps
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./

# Installer les dépendances avec pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Stage de construction
FROM base AS builder
WORKDIR /app

# Copier les dépendances et les sources du projet
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Générer les clients Prisma
RUN npx prisma generate

# Construire l'application Next.js pour production
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage de production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Créer un utilisateur non-root pour exécuter l'application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copier les fichiers nécessaires pour la production
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./

# Copier le script d'entrée
COPY --from=builder /app/docker/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Exposer le port
EXPOSE 3000

# Définir la commande par défaut
ENTRYPOINT ["/app/entrypoint.sh"] 