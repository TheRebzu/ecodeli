#!/bin/bash

# Script de test des endpoints d'inscription EcoDeli
# Usage: ./test-api-endpoints.sh

BASE_URL="http://windows:3000"
API_URL="$BASE_URL/api"

echo "🧪 Tests des endpoints d'inscription EcoDeli"
echo "============================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing:${NC} $description"
    echo -e "${YELLOW}$method${NC} $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success ($http_code)${NC}"
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${YELLOW}⚠ Client Error ($http_code)${NC}"
    else
        echo -e "${RED}✗ Error ($http_code)${NC}"
    fi
    
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    echo ""
}

echo "📝 1. Test de santé de l'API"
test_endpoint "GET" "/health" "" "API Health Check"

echo "👤 2. Tests d'inscription CLIENT"

# Test inscription client valide
client_data='{
  "email": "client.test@ecodeli.fr",
  "password": "TestPassword123!",
  "firstName": "Jean",
  "lastName": "Client",
  "phoneNumber": "+33123456789",
  "role": "CLIENT"
}'

test_endpoint "POST" "/auth/register" "$client_data" "Inscription client valide"

# Test inscription client - email déjà utilisé
test_endpoint "POST" "/auth/register" "$client_data" "Inscription client - email existant"

# Test inscription client - données invalides
invalid_client_data='{
  "email": "invalid-email",
  "password": "123",
  "firstName": "",
  "lastName": "Client"
}'

test_endpoint "POST" "/auth/register" "$invalid_client_data" "Inscription client - données invalides"

echo "🚚 3. Tests d'inscription DELIVERER (Livreur)"

deliverer_data='{
  "email": "livreur.test@ecodeli.fr",
  "password": "TestPassword123!",
  "firstName": "Pierre",
  "lastName": "Livreur",
  "phoneNumber": "+33123456790",
  "role": "DELIVERER",
  "vehicleType": "Voiture",
  "licensePlate": "AB-123-CD",
  "maxWeight": 50,
  "maxVolume": 100
}'

test_endpoint "POST" "/auth/register" "$deliverer_data" "Inscription livreur valide"

echo "🏪 4. Tests d'inscription MERCHANT (Commerçant)"

merchant_data='{
  "email": "merchant.test@ecodeli.fr",
  "password": "TestPassword123!",
  "firstName": "Marie",
  "lastName": "Merchant",
  "phoneNumber": "+33123456791",
  "role": "MERCHANT",
  "companyName": "Boutique Test",
  "siret": "12345678901234",
  "vatNumber": "FR12345678901"
}'

test_endpoint "POST" "/auth/register" "$merchant_data" "Inscription commerçant valide"

echo "👨‍🔧 5. Tests d'inscription PROVIDER (Prestataire)"

provider_data='{
  "email": "provider.test@ecodeli.fr",
  "password": "TestPassword123!",
  "firstName": "Paul",
  "lastName": "Provider",
  "phoneNumber": "+33123456792",
  "role": "PROVIDER",
  "businessName": "Services Paul",
  "siret": "98765432109876",
  "specialties": ["HOME_CLEANING", "GARDENING"],
  "hourlyRate": 25.50,
  "description": "Prestataire de services à domicile"
}'

test_endpoint "POST" "/auth/register" "$provider_data" "Inscription prestataire valide"

echo "🔐 6. Tests de connexion"

# Test connexion valide
login_data='{
  "email": "client.test@ecodeli.fr",
  "password": "TestPassword123!"
}'

test_endpoint "POST" "/auth/login" "$login_data" "Connexion valide"

# Test connexion invalide
invalid_login_data='{
  "email": "client.test@ecodeli.fr",
  "password": "wrongpassword"
}'

test_endpoint "POST" "/auth/login" "$invalid_login_data" "Connexion mot de passe incorrect"

echo "📋 7. Tests endpoints publics"

test_endpoint "GET" "/announcements" "" "Liste des annonces publiques"
test_endpoint "GET" "/services" "" "Liste des services disponibles"

echo "📊 8. Tests endpoints nécessitant authentification"

# Ces tests échoueront car pas de token, mais permettent de vérifier la protection
test_endpoint "GET" "/admin/users" "" "Admin users (sans auth - doit échouer)"
test_endpoint "GET" "/client/announcements" "" "Client announcements (sans auth - doit échouer)"
test_endpoint "GET" "/deliverer/opportunities" "" "Deliverer opportunities (sans auth - doit échouer)"

echo "✅ Tests terminés!"
echo ""
echo "📝 Résumé:"
echo "- Les endpoints d'inscription doivent fonctionner pour créer les utilisateurs"
echo "- Les endpoints protégés doivent retourner 401/403 sans authentification"
echo "- Les endpoints publics doivent être accessibles"
echo ""
echo "💡 Pour tester avec authentification, utilisez le token retourné par /auth/login"