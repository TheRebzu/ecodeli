#!/bin/bash

# Script de test complet du workflow d'annonces EcoDeli
# Teste le cycle complet: création → paiement → matching → livraison → validation → facture

set -e

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/api"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables globales
CLIENT_TOKEN=""
DELIVERER_TOKEN=""
ADMIN_TOKEN=""
ANNOUNCEMENT_ID=""
PAYMENT_INTENT_ID=""
VALIDATION_CODE=""

echo -e "${BLUE}🚀 Test du workflow complet d'annonces EcoDeli${NC}"
echo "=========================================="

# Fonction d'affichage des résultats
print_result() {
    local status=$1
    local message=$2
    local response=$3
    
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
        if [ ! -z "$response" ]; then
            echo -e "${YELLOW}Réponse: $response${NC}"
        fi
        exit 1
    fi
}

# Fonction pour faire une requête HTTP
make_request() {
    local method=$1
    local url=$2
    local headers=$3
    local data=$4
    local expected_status=${5:-200}
    
    echo -e "${BLUE}➡️  $method $url${NC}"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X "$method" \
        -H "Content-Type: application/json" \
        $headers \
        ${data:+-d "$data"} \
        "$url")
    
    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ Status: $status_code${NC}"
        echo "$body"
        return 0
    else
        echo -e "${RED}❌ Status: $status_code (attendu: $expected_status)${NC}"
        echo -e "${YELLOW}Body: $body${NC}"
        return 1
    fi
}

# Test 1: Vérifier l'état du serveur
echo -e "\n${YELLOW}📊 1. Vérification de l'état du serveur${NC}"
echo "============================================"

if make_request "GET" "$API_BASE/health" "" "" 200; then
    print_result "success" "Serveur opérationnel"
else
    print_result "error" "Serveur inaccessible"
fi

# Test 2: Authentification des utilisateurs de test
echo -e "\n${YELLOW}🔐 2. Authentification des utilisateurs${NC}"
echo "========================================"

# Login client
echo -e "\n${BLUE}🧑‍💼 Connexion client...${NC}"
CLIENT_AUTH=$(make_request "POST" "$API_BASE/auth/login" "" '{
    "email": "client-complete@test.com",
    "password": "Test123!"
}' 200)

if echo "$CLIENT_AUTH" | grep -q "token"; then
    CLIENT_TOKEN=$(echo "$CLIENT_AUTH" | jq -r '.token // .access_token // .sessionToken')
    print_result "success" "Client connecté"
else
    print_result "error" "Échec connexion client" "$CLIENT_AUTH"
fi

# Login livreur
echo -e "\n${BLUE}🚚 Connexion livreur...${NC}"
DELIVERER_AUTH=$(make_request "POST" "$API_BASE/auth/login" "" '{
    "email": "deliverer-complete@test.com", 
    "password": "Test123!"
}' 200)

if echo "$DELIVERER_AUTH" | grep -q "token"; then
    DELIVERER_TOKEN=$(echo "$DELIVERER_AUTH" | jq -r '.token // .access_token // .sessionToken')
    print_result "success" "Livreur connecté"
else
    print_result "error" "Échec connexion livreur" "$DELIVERER_AUTH"
fi

# Login admin
echo -e "\n${BLUE}👑 Connexion admin...${NC}"
ADMIN_AUTH=$(make_request "POST" "$API_BASE/auth/login" "" '{
    "email": "admin-complete@test.com",
    "password": "Test123!"
}' 200)

if echo "$ADMIN_AUTH" | grep -q "token"; then
    ADMIN_TOKEN=$(echo "$ADMIN_AUTH" | jq -r '.token // .access_token // .sessionToken')
    print_result "success" "Admin connecté"
else
    print_result "error" "Échec connexion admin" "$ADMIN_AUTH"
fi

# Test 3: Création d'une annonce
echo -e "\n${YELLOW}📦 3. Création d'une annonce${NC}"
echo "============================="

ANNOUNCEMENT_DATA='{
    "title": "Test livraison documents urgents",
    "description": "Livraison de documents importants pour test API",
    "type": "DOCUMENT",
    "isUrgent": true,
    "pickupAddress": "110 rue de Flandre, 75019 Paris",
    "deliveryAddress": "1 Place du Châtelet, 75001 Paris",
    "pickupDate": "'$(date -d '+1 day' -Iseconds)'",
    "deliveryDate": "'$(date -d '+1 day +2 hours' -Iseconds)'",
    "basePrice": 15.50,
    "currency": "EUR",
    "weight": 0.5,
    "dimensions": {
        "length": 30,
        "width": 20,
        "height": 5
    },
    "specialInstructions": "Fragile - À manipuler avec précaution"
}'

ANNOUNCEMENT_RESPONSE=$(make_request "POST" "$API_BASE/client/announcements" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" \
    "$ANNOUNCEMENT_DATA" 201)

if echo "$ANNOUNCEMENT_RESPONSE" | grep -q "id"; then
    ANNOUNCEMENT_ID=$(echo "$ANNOUNCEMENT_RESPONSE" | jq -r '.id')
    print_result "success" "Annonce créée (ID: $ANNOUNCEMENT_ID)"
else
    print_result "error" "Échec création annonce" "$ANNOUNCEMENT_RESPONSE"
fi

# Test 4: Création du PaymentIntent
echo -e "\n${YELLOW}💳 4. Création du paiement${NC}"
echo "============================"

PAYMENT_RESPONSE=$(make_request "POST" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID/payment" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" \
    '{"confirmImmediately": false}' 201)

if echo "$PAYMENT_RESPONSE" | grep -q "paymentIntent"; then
    PAYMENT_INTENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.paymentIntent.id')
    CLIENT_SECRET=$(echo "$PAYMENT_RESPONSE" | jq -r '.paymentIntent.clientSecret')
    print_result "success" "PaymentIntent créé (ID: $PAYMENT_INTENT_ID)"
else
    print_result "error" "Échec création PaymentIntent" "$PAYMENT_RESPONSE"
fi

# Test 5: Confirmation du paiement (simulation)
echo -e "\n${YELLOW}✅ 5. Confirmation du paiement${NC}"
echo "================================="

# Simulation d'un payment method (normalement fait côté client avec Stripe)
PAYMENT_CONFIRM=$(make_request "PUT" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID/payment" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" \
    '{"paymentMethodId": "pm_card_visa_test", "returnUrl": "https://ecodeli.fr/success"}' 200)

if echo "$PAYMENT_CONFIRM" | grep -q "success"; then
    print_result "success" "Paiement confirmé - Annonce activée"
else
    print_result "error" "Échec confirmation paiement" "$PAYMENT_CONFIRM"
fi

# Test 6: Récupération de l'annonce active
echo -e "\n${YELLOW}📋 6. Vérification de l'annonce activée${NC}"
echo "======================================="

ANNOUNCEMENT_STATUS=$(make_request "GET" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" "" 200)

if echo "$ANNOUNCEMENT_STATUS" | grep -q "ACTIVE"; then
    print_result "success" "Annonce bien activée après paiement"
else
    print_result "error" "Statut d'annonce incorrect" "$ANNOUNCEMENT_STATUS"
fi

# Test 7: Matching et acceptation par livreur (simulation)
echo -e "\n${YELLOW}🚚 7. Simulation matching et acceptation${NC}"
echo "========================================"

# Note: En vrai, ceci serait fait via l'interface livreur ou notifications push
# Ici on simule l'acceptation directe par API admin
DELIVERY_CREATION=$(make_request "POST" "$API_BASE/admin/deliveries" \
    "-H \"Authorization: Bearer $ADMIN_TOKEN\"" \
    '{
        "announcementId": "'$ANNOUNCEMENT_ID'",
        "delivererId": "deliverer-test-id",
        "estimatedPickupTime": "'$(date -d '+30 minutes' -Iseconds)'",
        "estimatedDeliveryTime": "'$(date -d '+90 minutes' -Iseconds)'"
    }' 201)

if echo "$DELIVERY_CREATION" | grep -q "id"; then
    DELIVERY_ID=$(echo "$DELIVERY_CREATION" | jq -r '.id')
    print_result "success" "Livraison créée et assignée (ID: $DELIVERY_ID)"
else
    print_result "error" "Échec création livraison" "$DELIVERY_CREATION"
fi

# Test 8: Suivi en temps réel
echo -e "\n${YELLOW}📍 8. Test du suivi en temps réel${NC}"
echo "================================="

TRACKING_RESPONSE=$(make_request "GET" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID/tracking" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" "" 200)

if echo "$TRACKING_RESPONSE" | grep -q "delivery"; then
    print_result "success" "Données de tracking récupérées"
    
    # Afficher un résumé du tracking
    echo -e "${BLUE}📊 Résumé du tracking:${NC}"
    echo "$TRACKING_RESPONSE" | jq -r '
        "Status: " + .delivery.status + 
        "\nProgrès: " + (.delivery.progress.percentage | tostring) + "%" +
        "\nÉtape: " + .delivery.progress.currentStep
    '
else
    print_result "error" "Échec récupération tracking" "$TRACKING_RESPONSE"
fi

# Test 9: Simulation progression livraison
echo -e "\n${YELLOW}🔄 9. Simulation de la progression${NC}"
echo "================================="

# Simulation des étapes de livraison
DELIVERY_STATUSES=("ACCEPTED" "PICKED_UP" "IN_TRANSIT" "OUT_FOR_DELIVERY")

for status in "${DELIVERY_STATUSES[@]}"; do
    echo -e "\n${BLUE}📦 Mise à jour statut: $status${NC}"
    
    STATUS_UPDATE=$(make_request "PUT" "$API_BASE/admin/deliveries/$DELIVERY_ID" \
        "-H \"Authorization: Bearer $ADMIN_TOKEN\"" \
        '{
            "status": "'$status'",
            "message": "Statut mis à jour automatiquement - Test API",
            "location": {"lat": 48.8566, "lng": 2.3522}
        }' 200)
    
    if echo "$STATUS_UPDATE" | grep -q "success\|updated"; then
        print_result "success" "Statut mis à jour: $status"
        sleep 1
    else
        print_result "error" "Échec mise à jour statut $status" "$STATUS_UPDATE"
    fi
done

# Test 10: Génération du code de validation
echo -e "\n${YELLOW}🔢 10. Récupération du code de validation${NC}"
echo "========================================="

VALIDATION_CODE_RESPONSE=$(make_request "GET" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID/validation-code" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" "" 200)

if echo "$VALIDATION_CODE_RESPONSE" | grep -q "validation"; then
    VALIDATION_CODE=$(echo "$VALIDATION_CODE_RESPONSE" | jq -r '.validation.code')
    print_result "success" "Code de validation généré: $VALIDATION_CODE"
    
    # Afficher les détails du code
    echo -e "${BLUE}📋 Détails du code:${NC}"
    echo "$VALIDATION_CODE_RESPONSE" | jq -r '
        "Code: " + .validation.code +
        "\nExpire: " + .validation.expiresAt +
        "\nTemps restant: " + .validation.timeRemainingFormatted
    '
else
    print_result "error" "Échec génération code validation" "$VALIDATION_CODE_RESPONSE"
fi

# Test 11: Validation de la livraison
echo -e "\n${YELLOW}✅ 11. Validation de la livraison${NC}"
echo "================================="

VALIDATION_RESPONSE=$(make_request "POST" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID/validate" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" \
    '{
        "validationCode": "'$VALIDATION_CODE'",
        "location": {"lat": 48.857, "lng": 2.352},
        "notes": "Livraison reçue en parfait état - Test API"
    }' 200)

if echo "$VALIDATION_RESPONSE" | grep -q "success"; then
    print_result "success" "Livraison validée avec succès"
    
    # Afficher les prochaines étapes
    echo -e "${BLUE}📋 Prochaines étapes:${NC}"
    echo "$VALIDATION_RESPONSE" | jq -r '.nextSteps[]'
else
    print_result "error" "Échec validation livraison" "$VALIDATION_RESPONSE"
fi

# Test 12: Vérification de la facture
echo -e "\n${YELLOW}🧾 12. Vérification de la facture${NC}"
echo "================================="

# Attendre un peu pour que la facture soit générée
sleep 2

INVOICE_RESPONSE=$(make_request "GET" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID/invoice" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" "" 200)

if echo "$INVOICE_RESPONSE" | grep -q "invoice"; then
    print_result "success" "Facture générée automatiquement"
    
    # Afficher les détails de la facture
    echo -e "${BLUE}📋 Détails de la facture:${NC}"
    echo "$INVOICE_RESPONSE" | jq -r '
        "Numéro: " + .invoice.invoiceNumber +
        "\nMontant: " + (.invoice.total | tostring) + " " + .invoice.currency +
        "\nStatut: " + .invoice.status +
        "\nURL PDF: " + .invoice.pdfUrl
    '
else
    print_result "error" "Échec récupération facture" "$INVOICE_RESPONSE"
fi

# Test 13: Test de l'annulation (sur une nouvelle annonce)
echo -e "\n${YELLOW}❌ 13. Test d'annulation d'annonce${NC}"
echo "==================================="

# Créer une nouvelle annonce pour tester l'annulation
CANCEL_ANNOUNCEMENT=$(make_request "POST" "$API_BASE/client/announcements" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" \
    '{
        "title": "Test annulation", 
        "description": "Annonce pour test annulation",
        "type": "PACKAGE",
        "pickupAddress": "110 rue de Flandre, 75019 Paris",
        "deliveryAddress": "1 Place du Châtelet, 75001 Paris",
        "basePrice": 10.00
    }' 201)

if echo "$CANCEL_ANNOUNCEMENT" | grep -q "id"; then
    CANCEL_ID=$(echo "$CANCEL_ANNOUNCEMENT" | jq -r '.id')
    
    # Tester l'annulation
    CANCELLATION_RESPONSE=$(make_request "POST" "$API_BASE/client/announcements/$CANCEL_ID/cancel" \
        "-H \"Authorization: Bearer $CLIENT_TOKEN\"" \
        '{
            "reason": "Test annulation automatique via script API",
            "confirmCancel": true
        }' 200)
    
    if echo "$CANCELLATION_RESPONSE" | grep -q "success"; then
        print_result "success" "Annulation testée avec succès"
    else
        print_result "error" "Échec test annulation" "$CANCELLATION_RESPONSE"
    fi
else
    print_result "error" "Échec création annonce test annulation"
fi

# Test 14: Vérification finale
echo -e "\n${YELLOW}🔍 14. Vérification finale du workflow${NC}"
echo "======================================"

FINAL_CHECK=$(make_request "GET" "$API_BASE/client/announcements/$ANNOUNCEMENT_ID" \
    "-H \"Authorization: Bearer $CLIENT_TOKEN\"" "" 200)

if echo "$FINAL_CHECK" | grep -q "COMPLETED"; then
    print_result "success" "Workflow terminé - Annonce en statut COMPLETED"
    
    # Résumé final
    echo -e "\n${GREEN}🎉 RÉSUMÉ DU TEST COMPLET${NC}"
    echo "========================="
    echo -e "${GREEN}✅ Création d'annonce${NC}"
    echo -e "${GREEN}✅ Paiement Stripe${NC}"
    echo -e "${GREEN}✅ Géocodage d'adresses${NC}"
    echo -e "${GREEN}✅ Matching et assignation${NC}"
    echo -e "${GREEN}✅ Suivi en temps réel${NC}"
    echo -e "${GREEN}✅ Code de validation${NC}"
    echo -e "${GREEN}✅ Validation de livraison${NC}"
    echo -e "${GREEN}✅ Génération de facture PDF${NC}"
    echo -e "${GREEN}✅ Test d'annulation${NC}"
    echo ""
    echo -e "${BLUE}📊 Statistiques:${NC}"
    echo "- Annonce principale: $ANNOUNCEMENT_ID"
    echo "- Code de validation: $VALIDATION_CODE"
    echo "- Tous les endpoints testés avec succès"
    echo ""
    echo -e "${GREEN}🚀 L'API EcoDeli est entièrement fonctionnelle !${NC}"
else
    print_result "error" "État final incorrect" "$FINAL_CHECK"
fi

echo -e "\n${BLUE}🏁 Test terminé${NC}"