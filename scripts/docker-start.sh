#!/bin/bash

# Script de démarrage Docker pour EcoDeli
# Gère l'initialisation de la base de données et le démarrage du serveur

set -e

echo "🚀 Démarrage de l'application EcoDeli..."

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de la base de données PostgreSQL..."
until pg_isready -h postgres -p 5432 > /dev/null 2>&1; do
  echo "🔄 PostgreSQL n'est pas encore prêt - attente..."
  sleep 2
done

echo "✅ PostgreSQL est prêt"

# Générer le client Prisma avec fusion des schémas
echo "🔧 Génération du client Prisma..."
pnpm run prisma:generate

# Exécuter les migrations
echo "🗄️ Exécution des migrations Prisma..."
pnpm run prisma:migrate

# Exécuter le seeding si nécessaire
if [ "$NODE_ENV" = "development" ] || [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding de la base de données..."
  pnpm run db:seed || echo "⚠️ Seeding terminé avec des avertissements"
fi

echo "🎯 Démarrage du serveur Next.js..."
exec node server.js 