#!/bin/bash

# Script pour vérifier toutes les pages du projet EcoDeli
# Utilisation: ./scripts/run-pages-checker.sh [options]

set -e

echo "🚀 ECODELI - VÉRIFICATEUR DE PAGES"
echo "=================================="

# Vérifier si Node.js et tsx sont disponibles
if ! command -v tsx &> /dev/null; then
    echo "❌ Erreur: tsx n'est pas installé"
    echo "   Installez-le avec: npm install -g tsx"
    exit 1
fi

# Vérifier que l'instance de développement est en cours
echo "🔍 Vérification de l'instance de développement..."
if ! curl -s -f http://localhost:3000 > /dev/null; then
    echo "⚠️  ATTENTION: L'instance de développement n'est pas accessible sur http://localhost:3000"
    echo "   Assurez-vous que 'pnpm run dev' est en cours d'exécution dans un autre terminal"
    read -p "   Voulez-vous continuer quand même ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Annulation"
        exit 1
    fi
else
    echo "✅ Instance de développement détectée"
fi

# Variables d'environnement par défaut
export NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-"http://localhost:3000"}
export NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-"your-secret-key"}

# Exécuter le script principal
echo "🎯 Lancement du vérificateur..."
tsx scripts/pages-checker.ts "$@"

# Afficher les fichiers générés
echo ""
echo "📁 FICHIERS GÉNÉRÉS:"
echo "==================="

if [ -f "pages-list.json" ]; then
    echo "✅ pages-list.json - Liste de toutes les pages trouvées"
    echo "   📖 Voir: cat pages-list.json | jq '.[] | select(.isProtected == true)'"
fi

if [ -f "pages-test-results.json" ]; then
    echo "✅ pages-test-results.json - Résultats des tests"
    echo "   📖 Erreurs: cat pages-test-results.json | jq '.[] | select(.status >= 400)'"
    echo "   📖 Succès: cat pages-test-results.json | jq '.[] | select(.status == 200)'"
fi

echo ""
echo "🔧 COMMANDES UTILES:"
echo "==================="
echo "# Voir les pages par type:"
echo "cat pages-list.json | jq '.[] | select(.isProtected == true) | .route'"
echo ""
echo "# Voir les erreurs 404:"
echo "cat pages-test-results.json | jq '.[] | select(.status == 404) | {route, role}'"
echo ""
echo "# Voir les erreurs de permission:"
echo "cat pages-test-results.json | jq '.[] | select(.status == 401 or .status == 403) | {route, role, status}'"
echo ""
echo "# Tester une page spécifique avec curl:"
echo "tsx scripts/pages-checker.ts --curl /fr/admin/users"

echo ""
echo "✅ Vérification terminée" 