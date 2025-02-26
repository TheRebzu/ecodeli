FROM node:20-alpine

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    openssl \
    openssl-dev

WORKDIR /app

# Copie des fichiers de définition des dépendances
COPY package*.json ./

# Modifie temporairement package.json pour éviter l'exécution de prisma generate
# pendant l'installation des packages
RUN sed -i 's/"postinstall": "prisma generate"/"postinstall": "echo Skipping prisma generate during build"/' package.json

# Installation des dépendances sans exécuter les scripts postinstall modifiés
RUN npm install --legacy-peer-deps

# Copie des fichiers Prisma avant d'exécuter prisma generate manuellement
COPY prisma ./prisma/

# Installation explicite des plugins Tailwind
RUN npm install --no-save \
    @tailwindcss/typography \
    @tailwindcss/forms \
    @tailwindcss/aspect-ratio \
    framer-motion \
    next-themes \
    @vercel/analytics

# Génération des clients Prisma manuellement
RUN npx prisma generate

# Vérification des installations
RUN ls -la node_modules/@tailwindcss || echo "Tailwind plugins missing"

# Copie du reste des fichiers de l'application
COPY . .

# Exposition du port utilisé par Next.js
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "run", "dev"]
