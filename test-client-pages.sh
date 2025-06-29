#!/bin/bash

# Script de test des pages client avec les comptes seed
# Ce script teste toutes les pages client avec les comptes clients de seed

# Configuration
BASE_URL="http://localhost:3000"
LOCALE="fr"
OUTPUT_FILE="client-pages-test-results.md"

# Comptes client de test (seed)
declare -a CLIENT_ACCOUNTS=(
    "client1@test.com:Test123!"
    "client2@test.com:Test123!"
    "client3@test.com:Test123!"
    "client4@test.com:Test123!"
    "client5@test.com:Test123!"
)

# Pages client à tester
declare -a CLIENT_PAGES=(
    "/client"
    "/client/announcements"
    "/client/announcements/create"
    "/client/bookings"
    "/client/deliveries"
    "/client/payments"
    "/client/profile"
    "/client/services"
    "/client/storage"
    "/client/subscription"
    "/client/tracking"
    "/client/notifications"
    "/client/service-requests"
    "/client/tutorial"
)

# API Endpoints à tester
declare -a API_ENDPOINTS=(
    "/api/client/dashboard"
    "/api/client/profile"
    "/api/client/announcements"
    "/api/client/announcements/stats"
    "/api/client/bookings"
    "/api/client/deliveries"
    "/api/client/payments"
    "/api/client/orders"
    "/api/client/reviews"
    "/api/client/services"
    "/api/client/storage-boxes"
    "/api/client/subscription"
    "/api/client/tutorial"
    "/api/client/notifications"
)

# Fonction pour se connecter et récupérer les cookies de session
login_and_get_cookies() {
    local email=$1
    local password=$2
    local cookie_jar="/tmp/cookies_${email//[@.]/_}.txt"
    
    echo "🔐 Connexion pour $email..."
    
    # Tentative de connexion
    local login_response=$(curl -s -c "$cookie_jar" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        "$BASE_URL/api/auth/login")
    
    local status_code=$(curl -s -c "$cookie_jar" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        -w "%{http_code}" -o /dev/null \
        "$BASE_URL/api/auth/login")
    
    if [ "$status_code" = "200" ]; then
        echo "✅ Connexion réussie pour $email"
        echo "$cookie_jar"
    else
        echo "❌ Échec de connexion pour $email (Status: $status_code)"
        echo "Response: $login_response"
        return 1
    fi
}

# Fonction pour tester une page
test_page() {
    local url=$1
    local cookie_jar=$2
    local email=$3
    
    echo "📄 Test de la page: $url"
    
    local response=$(curl -s -b "$cookie_jar" -w "%{http_code}|%{time_total}|%{size_download}" \
        "$BASE_URL/$LOCALE$url" 2>/dev/null)
    
    local status_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local time_total=$(echo "$response" | tail -1 | cut -d'|' -f2)
    local size_download=$(echo "$response" | tail -1 | cut -d'|' -f3)
    
    local status_icon="❌"
    case $status_code in
        200) status_icon="✅" ;;
        302|301) status_icon="🔄" ;;
        401) status_icon="🔒" ;;
        403) status_icon="🚫" ;;
        404) status_icon="🔍" ;;
        500) status_icon="💥" ;;
    esac
    
    echo "$status_icon $url - Status: $status_code, Time: ${time_total}s, Size: ${size_download} bytes"
    
    # Log vers le fichier de résultats
    echo "| $url | $status_code | ${time_total}s | ${size_download} | $email |" >> "$OUTPUT_FILE"
}

# Fonction pour tester un endpoint API
test_api_endpoint() {
    local endpoint=$1
    local cookie_jar=$2
    local email=$3
    
    echo "🔗 Test API: $endpoint"
    
    local response=$(curl -s -b "$cookie_jar" -w "%{http_code}|%{time_total}|%{size_download}" \
        "$BASE_URL$endpoint" 2>/dev/null)
    
    local status_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local time_total=$(echo "$response" | tail -1 | cut -d'|' -f2)
    local size_download=$(echo "$response" | tail -1 | cut -d'|' -f3)
    
    local status_icon="❌"
    case $status_code in
        200) status_icon="✅" ;;
        302|301) status_icon="🔄" ;;
        401) status_icon="🔒" ;;
        403) status_icon="🚫" ;;
        404) status_icon="🔍" ;;
        500) status_icon="💥" ;;
    esac
    
    echo "$status_icon $endpoint - Status: $status_code, Time: ${time_total}s, Size: ${size_download} bytes"
    
    # Log vers le fichier de résultats API
    echo "| $endpoint | $status_code | ${time_total}s | ${size_download} | $email |" >> "$OUTPUT_FILE"
}

# Initialisation du fichier de résultats
echo "# Rapport de Test des Pages Client" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Date:** $(date)" >> "$OUTPUT_FILE"
echo "**URL de base:** $BASE_URL" >> "$OUTPUT_FILE"
echo "**Locale:** $LOCALE" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## Résultats des Tests de Pages" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "| Page | Status Code | Temps | Taille | Compte |" >> "$OUTPUT_FILE"
echo "|------|-------------|-------|--------|--------|" >> "$OUTPUT_FILE"

echo "🚀 Début des tests des pages client..."
echo "📊 Résultats seront sauvegardés dans: $OUTPUT_FILE"
echo ""

# Test pour chaque compte client
for account in "${CLIENT_ACCOUNTS[@]}"; do
    email=$(echo "$account" | cut -d':' -f1)
    password=$(echo "$account" | cut -d':' -f2)
    
    echo "👤 Test avec le compte: $email"
    echo "=" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "### Tests pour $email" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Connexion
    cookie_jar=$(login_and_get_cookies "$email" "$password")
    
    if [ $? -eq 0 ]; then
        # Test des pages
        echo "🌐 Test des pages frontend..."
        for page in "${CLIENT_PAGES[@]}"; do
            test_page "$page" "$cookie_jar" "$email"
        done
        
        echo "" >> "$OUTPUT_FILE"
        echo "#### API Endpoints pour $email" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        
        # Test des endpoints API
        echo "🔌 Test des endpoints API..."
        for endpoint in "${API_ENDPOINTS[@]}"; do
            test_api_endpoint "$endpoint" "$cookie_jar" "$email"
        done
        
        # Nettoyage
        rm -f "$cookie_jar"
        
    else
        echo "❌ Impossible de tester avec $email - connexion échouée"
        echo "| ERREUR | Connexion échouée | - | - | $email |" >> "$OUTPUT_FILE"
    fi
    
    echo ""
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Résumé final
echo "" >> "$OUTPUT_FILE"
echo "## Résumé" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "- **Comptes testés:** ${#CLIENT_ACCOUNTS[@]}" >> "$OUTPUT_FILE"
echo "- **Pages testées par compte:** ${#CLIENT_PAGES[@]}" >> "$OUTPUT_FILE"
echo "- **Endpoints API testés par compte:** ${#API_ENDPOINTS[@]}" >> "$OUTPUT_FILE"
echo "- **Total de tests:** $((${#CLIENT_ACCOUNTS[@]} * (${#CLIENT_PAGES[@]} + ${#API_ENDPOINTS[@]})))" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Légende des statuts" >> "$OUTPUT_FILE"
echo "- ✅ 200: Succès" >> "$OUTPUT_FILE"
echo "- 🔄 301/302: Redirection" >> "$OUTPUT_FILE"
echo "- 🔒 401: Non autorisé" >> "$OUTPUT_FILE"
echo "- 🚫 403: Accès interdit" >> "$OUTPUT_FILE"
echo "- 🔍 404: Page non trouvée" >> "$OUTPUT_FILE"
echo "- 💥 500: Erreur serveur" >> "$OUTPUT_FILE"
echo "- ❌ Autres erreurs" >> "$OUTPUT_FILE"

echo "✅ Tests terminés!"
echo "📄 Rapport complet disponible dans: $OUTPUT_FILE"

# Affichage d'un résumé rapide
echo ""
echo "📊 Résumé rapide:"
total_success=$(grep -c "| .*200.*|" "$OUTPUT_FILE" || echo "0")
total_errors=$(grep -c "| .*[45][0-9][0-9].*|" "$OUTPUT_FILE" || echo "0")
total_redirects=$(grep -c "| .*3[0-9][0-9].*|" "$OUTPUT_FILE" || echo "0")

echo "   ✅ Succès (200): $total_success"
echo "   🔄 Redirections (3xx): $total_redirects"
echo "   ❌ Erreurs (4xx/5xx): $total_errors"