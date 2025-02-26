#!/bin/bash

# Script pour initialiser correctement l'environnement Docker d'EcoDeli

echo "📦 Initialisation de l'environnement Docker pour EcoDeli..."

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer."
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "❌ Docker Compose n'est pas installé. Veuillez l'installer avant de continuer."
  exit 1
fi

# Vérification des fichiers critiques
echo "🔍 Vérification des fichiers requis..."
if [ ! -f "package.json" ]; then
  echo "❌ package.json non trouvé. Veuillez exécuter ce script depuis la racine du projet."
  exit 1
fi

if [ ! -d "prisma" ]; then
  echo "❌ Dossier prisma non trouvé. Veuillez créer ce dossier avant de continuer."
  exit 1
fi

if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Fichier prisma/schema.prisma non trouvé."
  exit 1
fi

# Nettoyage des conteneurs et volumes existants
echo "🧹 Nettoyage des conteneurs existants..."
docker-compose down

# Confirmation avant de supprimer les volumes
read -p "❓ Voulez-vous également supprimer les volumes de données (base de données)? (y/n): " answer
if [[ $answer =~ ^[Yy]$ ]]; then
  echo "🧹 Suppression des volumes..."
  docker-compose down -v
fi

# Création du dossier docker s'il n'existe pas
if [ ! -d "docker/development" ]; then
  echo "📁 Création du dossier docker/development..."
  mkdir -p docker/development
fi

# Création du Dockerfile de développement
echo "📝 Création du Dockerfile de développement..."
cat > docker/development/Dockerfile << 'EOF'
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
EOF

# Vérification et mise à jour du docker-compose.yml
echo "📝 Mise à jour du docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
services:
  web:
    build:
      context: .
      dockerfile: docker/development/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      # Monter uniquement les dossiers source, config et assets
      - ./src:/app/src
      - ./public:/app/public
      # Ne pas monter le dossier prisma pour éviter les conflits
      - ./next.config.mjs:/app/next.config.mjs
      - ./postcss.config.mjs:/app/postcss.config.mjs
      - ./tailwind.config.ts:/app/tailwind.config.ts
      - ./tsconfig.json:/app/tsconfig.json
      # Exclure explicitement node_modules
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/ecodeli?schema=public
    depends_on:
      - db
      - redis
      - mailhog
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=ecodeli
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
    restart: unless-stopped

  prisma-studio:
    build:
      context: .
      dockerfile: docker/development/Dockerfile
    command: npx prisma studio
    ports:
      - "5555:5555"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/ecodeli?schema=public
    # Important: ne pas monter les répertoires locaux qui peuvent interférer avec prisma
    volumes:
      - /app/node_modules
    depends_on:
      - db
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

# Construction et démarrage des conteneurs
echo "🏗️ Construction et démarrage des conteneurs..."
docker-compose build --no-cache
docker-compose up -d

# Vérification du démarrage des conteneurs
echo "⏳ Vérification du démarrage des conteneurs..."
sleep 5
if [ "$(docker-compose ps | grep 'web' | grep -c 'Up')" -eq 1 ]; then
  echo "✅ Le conteneur web est démarré."
else
  echo "⚠️ Le conteneur web n'est pas démarré correctement."
fi

# Affichage des informations utiles
echo "
🚀 Configuration Docker terminée avec succès!

📊 Accès aux services