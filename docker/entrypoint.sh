#!/bin/sh
set -e

# Fusion du schéma Prisma fragmenté
echo "🔄 Fusion du schéma Prisma fragmenté..."
pnpm db:schema:build

# Génération du client Prisma
echo "🔧 Génération du client Prisma..."
pnpm db:generate

# Création d'un fichier de vérification
echo "✅ $(date) - Schema fusionné et client généré" > /app/prisma/.schema-build-status

# Démarrage de l'application
echo "🚀 Démarrage de l'application..."
exec pnpm start 