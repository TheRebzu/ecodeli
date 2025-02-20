# Étape 1 : Construction de l'application
FROM node:18-alpine AS builder

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json et installer les dépendances
COPY package.json package-lock.json ./
RUN npm ci

# Copier le reste du projet
COPY . .

# Construire l'application Next.js
RUN npm run build

# Étape 2 : Image de production
FROM node:18-alpine

WORKDIR /app

# Copier l'application construite depuis le builder
COPY --from=builder /app ./

# Définir la variable d'environnement en production
ENV NODE_ENV=production

# Exposer le port 3000
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
