#!/bin/bash

# Script de démarrage Docker pour EcoDeli
# Lance l'initialisation puis démarre l'application

echo "🚀 Démarrage de EcoDeli..."

# Vérifier les variables d'environnement critiques
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL n'est pas définie"
  exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "❌ NEXTAUTH_SECRET n'est pas définie"
  exit 1
fi

echo "✅ Variables d'environnement OK"

# Exécuter l'initialisation
echo "🔄 Initialisation..."
bash /app/scripts/docker-init.sh

if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de l'initialisation"
  exit 1
fi

echo "✅ Initialisation terminée"

# Démarrer l'application Next.js
echo "🚀 Démarrage de l'application Next.js..."
echo "📍 Application disponible sur : http://localhost:3000"
echo "💾 PgAdmin disponible sur : http://localhost:8080"
echo "📊 Grafana disponible sur : http://localhost:3001"

# Démarrer l'application
exec node server.js 