# docker/development/Dockerfile
FROM node:20-alpine AS base

# Installation des dépendances système avec OpenSSL
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    openssl \
    openssl-dev

# Répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installation des dépendances avec legacy-peer-deps
RUN npm install --legacy-peer-deps && \
    npm install bcryptjs @vercel/analytics --save --legacy-peer-deps

# Génération du client Prisma
RUN npx prisma generate

# Copie du reste du code source
COPY . .

# Exposition du port
EXPOSE 3000

# Commande de démarrage en mode développement
CMD ["npm", "run", "dev"]