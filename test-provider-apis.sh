#!/bin/bash

echo "=========================================="
echo "Test des API Routes Prestataires EcoDeli"
echo "=========================================="

# Configuration
BASE_URL="http://localhost:3000"
PROVIDER_EMAIL="prestataire@test.com"
PROVIDER_PASSWORD="Test123!"

echo "1. Test de connexion prestataire..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${PROVIDER_EMAIL}\",
    \"password\": \"${PROVIDER_PASSWORD}\"
  }" \
  -c cookies.txt)

echo "Réponse connexion: $LOGIN_RESPONSE"

if [ $? -eq 0 ]; then
  echo "✅ Connexion réussie"
else
  echo "❌ Échec de la connexion"
  exit 1
fi

# Récupérer l'ID utilisateur depuis la réponse
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "User ID: $USER_ID"

echo ""
echo "2. Test du profil prestataire..."
PROFILE_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/provider/profile?userId=${USER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt)

echo "Réponse profil: $PROFILE_RESPONSE"

# Extraire l'ID du provider si disponible
PROVIDER_ID=$(echo $PROFILE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Provider ID: $PROVIDER_ID"

if [ ! -z "$PROVIDER_ID" ]; then
  echo ""
  echo "3. Test des statistiques d'évaluations..."
  STATS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/provider/evaluations/stats?providerId=${PROVIDER_ID}" \
    -H "Content-Type: application/json" \
    -b cookies.txt)
  
  echo "Statistiques: $STATS_RESPONSE"
  
  echo ""
  echo "4. Test des évaluations..."
  EVAL_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/provider/evaluations?providerId=${PROVIDER_ID}&limit=5" \
    -H "Content-Type: application/json" \
    -b cookies.txt)
  
  echo "Évaluations: $EVAL_RESPONSE"
  
  echo ""
  echo "5. Test des réservations à venir..."
  BOOKINGS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/provider/bookings/upcoming?providerId=${PROVIDER_ID}" \
    -H "Content-Type: application/json" \
    -b cookies.txt)
  
  echo "Réservations: $BOOKINGS_RESPONSE"
  
  echo ""
  echo "6. Test des factures..."
  INVOICES_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/provider/billing/invoices?providerId=${PROVIDER_ID}&limit=5" \
    -H "Content-Type: application/json" \
    -b cookies.txt)
  
  echo "Factures: $INVOICES_RESPONSE"
  
  echo ""
  echo "7. Test de création d'un service..."
  SERVICE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/provider/services" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{
      \"name\": \"Ménage à domicile\",
      \"description\": \"Service de ménage professionnel à domicile avec matériel inclus\",
      \"type\": \"HOME_SERVICE\",
      \"basePrice\": 25.50,
      \"priceUnit\": \"HOUR\",
      \"duration\": 120,
      \"requirements\": [\"INSURANCE\", \"EXPERIENCE\"],
      \"minAdvanceBooking\": 24,
      \"maxAdvanceBooking\": 720
    }")
  
  echo "Création service: $SERVICE_RESPONSE"
  
else
  echo "⚠️ Aucun profil prestataire trouvé - Test de candidature..."
  
  echo ""
  echo "3. Test de soumission de candidature..."
  CANDIDATURE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/provider/validation/submit" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{
      \"profile\": {
        \"businessName\": \"Services Pro SARL\",
        \"siret\": \"12345678901234\",
        \"description\": \"Entreprise spécialisée dans les services à domicile avec plus de 10 ans d'expérience. Nous proposons des prestations de qualité avec du personnel qualifié et assuré.\",
        \"specialties\": [\"HOME_CLEANING\", \"GARDENING\", \"HANDYMAN\"],
        \"hourlyRate\": 35.0,
        \"zone\": {
          \"coordinates\": [2.3522, 48.8566],
          \"radius\": 15
        }
      },
      \"services\": [
        {
          \"name\": \"Ménage complet\",
          \"description\": \"Service de ménage complet incluant toutes les pièces\",
          \"type\": \"HOME_CLEANING\",
          \"basePrice\": 30.0,
          \"priceUnit\": \"HOUR\",
          \"duration\": 120,
          \"requirements\": [\"INSURANCE\", \"EXPERIENCE\"],
          \"minAdvanceBooking\": 24,
          \"maxAdvanceBooking\": 720
        }
      ],
      \"certifications\": [
        {
          \"name\": \"Certification Qualité Service\",
          \"issuingOrganization\": \"AFNOR\",
          \"issueDate\": \"2023-01-15T00:00:00.000Z\",
          \"expiryDate\": \"2025-01-15T00:00:00.000Z\",
          \"certificateNumber\": \"QS-2023-001\"
        }
      ],
      \"rates\": [
        {
          \"serviceType\": \"HOME_CLEANING\",
          \"baseRate\": 30.0,
          \"unitType\": \"HOUR\",
          \"minimumCharge\": 60.0
        }
      ]
    }")
  
  echo "Candidature: $CANDIDATURE_RESPONSE"
fi

echo ""
echo "8. Test des gains et transactions..."
EARNINGS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/provider/earnings/summary?providerId=${PROVIDER_ID}" \
  -H "Content-Type: application/json" \
  -b cookies.txt)

echo "Gains: $EARNINGS_RESPONSE"

echo ""
echo "=========================================="
echo "Tests terminés !"
echo "=========================================="

# Nettoyer les cookies
rm -f cookies.txt 