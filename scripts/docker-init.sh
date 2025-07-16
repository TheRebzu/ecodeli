#!/bin/bash

# Script d'initialisation Docker pour EcoDeli
# Exécute la migration et le seeding de la base de données

echo "🚀 Initialisation EcoDeli Docker..."

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
while ! pg_isready -h postgres -p 5432 -U postgres; do
  echo "   PostgreSQL n'est pas encore prêt..."
  sleep 2
done

echo "✅ PostgreSQL est prêt"

# Vérifier si la base de données existe déjà avec des données
echo "🔍 Vérification de la base de données..."
USER_COUNT=$(psql -h postgres -U postgres -d ecodeli -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -gt 0 ]; then
  echo "📊 Base de données déjà initialisée avec $USER_COUNT utilisateurs"
  echo "✅ Initialisation terminée"
  exit 0
fi

echo "🛠️  Initialisation de la base de données..."

# Générer le client Prisma
echo "🔄 Génération du client Prisma..."
pnpm run prisma:generate

# Appliquer les migrations
echo "🔄 Application des migrations..."
pnpm run prisma:migrate

# Exécuter le seeding
echo "🌱 Seeding de la base de données..."
pnpm run db:seed

echo "✅ Initialisation terminée avec succès"
echo "🎯 Comptes de test créés :"
echo "   - client@test.com (CLIENT)"
echo "   - livreur@test.com (DELIVERER)"
echo "   - admin@test.com (ADMIN)"
echo "   - commercant@test.com (MERCHANT)"
echo "   - prestataire@test.com (PROVIDER)"
echo "   - Mot de passe : Test123!" 