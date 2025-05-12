#!/bin/sh
set -e

# Variables avec des valeurs par défaut
MAX_RETRIES=${MAX_RETRIES:-30}
RETRY_INTERVAL=${RETRY_INTERVAL:-2}

echo "🚀 Démarrage du script d'entrée EcoDeli..."

# Fonction pour tester la connexion à la base de données
check_database() {
  npx prisma@latest db execute --schema=./prisma/schema.prisma --stdin < /dev/null > /dev/null 2>&1
  return $?
}

# Attendre que la base de données soit disponible
echo "⏳ Attente de la disponibilité de la base de données PostgreSQL..."
RETRIES=0
until check_database || [ $RETRIES -eq $MAX_RETRIES ]; do
  RETRIES=$((RETRIES+1))
  echo "🔄 Tentative $RETRIES/$MAX_RETRIES - Connexion à la base de données impossible, nouvelle tentative dans ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
  echo "❌ Impossible de se connecter à la base de données après $MAX_RETRIES tentatives."
  exit 1
fi

echo "✅ Connexion à la base de données établie avec succès!"

# Exécuter les migrations Prisma en production
echo "🔄 Exécution des migrations Prisma..."
npx prisma@latest migrate deploy --schema=./prisma/schema.prisma

# Vérifier si le seeding est demandé (désactivé par défaut en production)
if [ "$PRISMA_SEED" = "true" ]; then
  echo "🌱 Démarrage du seeding de la base de données..."
  npx tsx ./prisma/seed.ts
  echo "✅ Seeding terminé avec succès!"
fi

echo "🚀 Démarrage de l'application Next.js..."
# Utiliser exec pour que node reçoive les signaux SIGTERM/SIGINT
exec node server.js 