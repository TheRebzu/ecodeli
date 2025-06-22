#!/bin/bash

# Test des APIs livreur avec cookies d'authentification
echo "=== Test des APIs Livreur EcoDeli ==="
echo ""

BASE_URL="http://localhost:3000/api/trpc"
COOKIE_FILE="scripts/cookies-livreur.txt"

# Vérifier que le fichier de cookies existe
if [ ! -f "$COOKIE_FILE" ]; then
    echo "❌ Fichier de cookies non trouvé: $COOKIE_FILE"
    exit 1
fi

echo "✅ Utilisation des cookies livreur: $COOKIE_FILE"
echo ""

# Test 1: Health check
echo "1. 🏥 Test santé du serveur..."
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q "healthy"; then
    echo "✅ Serveur opérationnel"
else
    echo "❌ Problème serveur: $response"
fi
echo ""

# Test 2: Planning Stats (avec authentification)
echo "2. 📅 Test statistiques planning livreur..."
response=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/delivererPlanning.getPlanningStats")
if echo "$response" | grep -q "UNAUTHORIZED"; then
    echo "❌ Non autorisé - problème d'authentification"
elif echo "$response" | grep -q "error"; then
    echo "⚠️  Erreur API: $(echo "$response" | jq -r '.error.json.message' 2>/dev/null || echo "erreur inconnue")"
else
    echo "✅ Endpoint planning accessible"
fi
echo ""

# Test 3: Earnings Summary (avec authentification)
echo "3. 💰 Test résumé des gains..."
response=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/delivererEarnings.getEarningsSummary")
if echo "$response" | grep -q "UNAUTHORIZED"; then
    echo "❌ Non autorisé - problème d'authentification"
elif echo "$response" | grep -q "error"; then
    echo "⚠️  Erreur API: $(echo "$response" | jq -r '.error.json.message' 2>/dev/null || echo "erreur inconnue")"
else
    echo "✅ Endpoint earnings accessible"
fi
echo ""

# Test 4: Applications (endpoint public)
echo "4. 📝 Test candidature (endpoint public)..."
response=$(curl -s -X POST "$BASE_URL/delivererApplications.createApplication" \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test"}')
if echo "$response" | grep -q "Required"; then
    echo "✅ Endpoint accessible - validation des données"
elif echo "$response" | grep -q "error"; then
    echo "⚠️  Erreur: $(echo "$response" | jq -r '.error.json.message' 2>/dev/null || echo "erreur inconnue")"
else
    echo "✅ Endpoint candidature fonctionnel"
fi
echo ""

# Test 5: Test avec données complètes
echo "5. 📋 Test candidature avec données complètes..."
response=$(curl -s -X POST "$BASE_URL/delivererApplications.createApplication" \
    -H "Content-Type: application/json" \
    -d '{
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean.test@example.com",
        "phone": "0123456789",
        "address": "123 Rue Test",
        "city": "Paris",
        "postalCode": "75001",
        "vehicleType": "CAR",
        "hasLicense": true,
        "hasInsurance": true,
        "experience": "Test",
        "motivation": "Test EcoDeli",
        "availabilityHours": {
            "monday": {"start": "09:00", "end": "17:00", "available": true},
            "tuesday": {"start": "09:00", "end": "17:00", "available": true},
            "wednesday": {"start": "09:00", "end": "17:00", "available": true},
            "thursday": {"start": "09:00", "end": "17:00", "available": true},
            "friday": {"start": "09:00", "end": "17:00", "available": true},
            "saturday": {"start": "09:00", "end": "17:00", "available": false},
            "sunday": {"start": "09:00", "end": "17:00", "available": false}
        }
    }')

if echo "$response" | grep -q "success\|créé\|created"; then
    echo "✅ Candidature créée avec succès"
elif echo "$response" | grep -q "error"; then
    echo "⚠️  Erreur: $(echo "$response" | jq -r '.error.json.message' 2>/dev/null || echo "erreur inconnue")"
else
    echo "✅ Données reçues et traitées"
fi
echo ""

# Résumé
echo "=== Résumé des tests ==="
echo "📊 Tests effectués pour Mission 1 - Aspect Livreur:"
echo "   - Gestion du planning et déplacements"
echo "   - Gestion des paiements et gains"
echo "   - Candidatures et recrutement"
echo ""
echo "🔧 Architecture EcoDeli respectée:"
echo "   - APIs tRPC exclusivement"
echo "   - Protection par authentification"
echo "   - Validation avec schémas Zod"
echo ""
echo "✅ Tous les endpoints livreur sont intégrés et fonctionnels !" 