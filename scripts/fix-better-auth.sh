#!/bin/bash

# Script pour corriger et tester Better-Auth EcoDeli

echo "🔧 Correction Better-Auth EcoDeli..."

# 1. Générer le schéma Prisma avec Better-Auth
echo "📦 Génération schéma Prisma..."
cd /mnt/c/Users/Amine/WebstormProjects/ecodeli

# Vérifier que Prisma est accessible
if ! command -v prisma &> /dev/null; then
    echo "❌ Prisma CLI non trouvé"
    exit 1
fi

# Merge et génération
pnpm run prisma:merge
if [ $? -eq 0 ]; then
    echo "✅ Schéma fusionné"
else
    echo "❌ Erreur fusion schéma"
fi

prisma generate --schema=prisma/merged.prisma
if [ $? -eq 0 ]; then
    echo "✅ Prisma généré"
else
    echo "❌ Erreur génération Prisma"
fi

# 2. Push vers la base de données
echo "🗄️ Mise à jour base de données..."
prisma db push --schema=prisma/merged.prisma
if [ $? -eq 0 ]; then
    echo "✅ Base de données mise à jour"
else
    echo "❌ Erreur mise à jour DB"
fi

# 3. Tester l'authentification
echo "🧪 Test authentification Better-Auth..."

# Test API health
echo "  - Test /api/health..."
curl -s "http://windows:3000/api/health" > /dev/null
if [ $? -eq 0 ]; then
    echo "    ✅ API accessible"
else
    echo "    ❌ API non accessible"
fi

# Test endpoint Better-Auth
echo "  - Test /api/auth/session..."
curl -s "http://windows:3000/api/auth/session" > /dev/null
if [ $? -eq 0 ]; then
    echo "    ✅ Better-Auth endpoint accessible"
else
    echo "    ❌ Better-Auth endpoint inaccessible"
fi

echo "🎉 Script de correction terminé!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Démarrer le serveur: pnpm dev"
echo "2. Tester l'inscription: POST /api/auth/sign-up"
echo "3. Tester la connexion: POST /api/auth/sign-in"
echo "4. Vérifier la session: GET /api/auth/session"