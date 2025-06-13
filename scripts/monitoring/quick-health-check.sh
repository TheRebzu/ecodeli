#!/bin/bash

# Script de vérification rapide de santé EcoDeli

echo "======================================"
echo "📊 RAPPORT DE MONITORING ECODELI"
echo "======================================"
echo "Date : $(date +'%d/%m/%Y %H:%M:%S')"
echo ""

BASE_URL="http://localhost:3000"
ERRORS=0
TOTAL=0

# Fonction pour tester un endpoint
test_endpoint() {
    local endpoint=$1
    local expected_code=$2
    local description=$3
    
    TOTAL=$((TOTAL + 1))
    
    response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" -L --max-time 10 "$BASE_URL$endpoint" 2>/dev/null)
    http_code=$(echo $response | cut -d',' -f1)
    response_time=$(echo $response | cut -d',' -f2)
    
    if [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
        echo "❌ $description ($endpoint) : Serveur inaccessible"
        ERRORS=$((ERRORS + 1))
    elif [ "$http_code" = "$expected_code" ]; then
        echo "✅ $description ($endpoint) : HTTP $http_code - ${response_time}s"
    else
        echo "⚠️  $description ($endpoint) : HTTP $http_code (attendu: $expected_code) - ${response_time}s"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "🌐 PAGES PUBLIQUES"
echo "──────────────────"
test_endpoint "/" "200" "Page d'accueil"
test_endpoint "/login" "200" "Page de connexion"
test_endpoint "/register" "200" "Page d'inscription"
test_endpoint "/about" "200" "À propos"
test_endpoint "/contact" "200" "Contact"

echo ""
echo "🔒 PAGES PROTÉGÉES (redirection attendue)"
echo "──────────────────────────────────────────"
test_endpoint "/client/dashboard" "302" "Dashboard client"
test_endpoint "/deliverer/dashboard" "302" "Dashboard livreur"
test_endpoint "/merchant/dashboard" "302" "Dashboard marchand"
test_endpoint "/admin/dashboard" "302" "Dashboard admin"

echo ""
echo "🔌 ENDPOINTS API"
echo "────────────────"
test_endpoint "/api/health" "200" "API Health"

echo ""
echo "📈 RÉSUMÉ"
echo "─────────"
echo "Pages testées : $TOTAL"
echo "Erreurs : $ERRORS"

if [ $ERRORS -eq 0 ]; then
    echo "Statut global : ✅ Sain"
elif [ $ERRORS -lt 3 ]; then
    echo "Statut global : ⚠️  Dégradé"
else
    echo "Statut global : ❌ Critique"
fi

echo ""
echo "======================================"

# Vérifier si le serveur Next.js est en cours d'exécution
echo ""
echo "🔧 ÉTAT DU SERVEUR"
echo "──────────────────"
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Serveur Next.js en cours d'exécution"
    echo "PID: $(pgrep -f "next dev")"
else
    echo "❌ Serveur Next.js non détecté"
    echo "💡 Lancez 'npm run dev' pour démarrer le serveur"
fi

# Vérifier la connexion à la base de données via prisma
echo ""
echo "🗄️  BASE DE DONNÉES"
echo "───────────────────"
if command -v npx &> /dev/null; then
    if npx prisma db push --skip-generate --accept-data-loss=false 2>&1 | grep -q "error"; then
        echo "❌ Connexion à la base de données échouée"
    else
        echo "✅ Connexion à la base de données OK"
    fi
else
    echo "⚠️  Impossible de vérifier la base de données (npx non disponible)"
fi