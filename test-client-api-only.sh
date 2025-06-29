#!/bin/bash

# Script de test rapide des API client uniquement
# Version simplifiée pour tester rapidement les endpoints API

# Configuration
BASE_URL="http://localhost:3000"
OUTPUT_FILE="client-api-test-results.json"

# Comptes client de test
declare -a CLIENT_ACCOUNTS=(
    "client1@test.com:Test123!"
    "client2@test.com:Test123!"
)

# API Endpoints critiques à tester
declare -a CRITICAL_ENDPOINTS=(
    "/api/auth/session"
    "/api/client/dashboard"
    "/api/client/profile"
    "/api/client/announcements"
    "/api/client/deliveries"
    "/api/client/payments"
)

# Fonction pour se connecter
login_user() {
    local email=$1
    local password=$2
    
    echo "🔐 Connexion $email..."
    
    local response=$(curl -s -c "/tmp/cookies_${email//[@.]/_}.txt" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        -w "%{http_code}" \
        "$BASE_URL/api/auth/login")
    
    if [[ "$response" =~ 200$ ]]; then
        echo "✅ Connecté: $email"
        return 0
    else
        echo "❌ Échec connexion: $email (Status: $response)"
        return 1
    fi
}

# Fonction pour tester un endpoint
test_endpoint() {
    local endpoint=$1
    local email=$2
    local cookie_file="/tmp/cookies_${email//[@.]/_}.txt"
    
    local response=$(curl -s -b "$cookie_file" \
        -w "%{http_code}|%{time_total}" \
        "$BASE_URL$endpoint")
    
    local status_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local time_total=$(echo "$response" | tail -1 | cut -d'|' -f2)
    
    local status="❌"
    case $status_code in
        200) status="✅" ;;
        401) status="🔒" ;;
        403) status="🚫" ;;
        404) status="🔍" ;;
        500) status="💥" ;;
    esac
    
    echo "$status $endpoint ($status_code - ${time_total}s)"
    
    # JSON output
    cat >> "$OUTPUT_FILE" << EOF
    {
      "endpoint": "$endpoint",
      "email": "$email",
      "status_code": $status_code,
      "response_time": $time_total,
      "timestamp": "$(date -Iseconds)"
    },
EOF
}

# Initialisation
echo "🚀 Test rapide des API Client"
echo "[" > "$OUTPUT_FILE"

# Tests
for account in "${CLIENT_ACCOUNTS[@]}"; do
    email=$(echo "$account" | cut -d':' -f1)
    password=$(echo "$account" | cut -d':' -f2)
    
    echo ""
    echo "👤 Test: $email"
    
    if login_user "$email" "$password"; then
        for endpoint in "${CRITICAL_ENDPOINTS[@]}"; do
            test_endpoint "$endpoint" "$email"
        done
        rm -f "/tmp/cookies_${email//[@.]/_}.txt"
    fi
done

# Finalisation JSON
sed -i '$ s/,$//' "$OUTPUT_FILE" 2>/dev/null || true
echo "]" >> "$OUTPUT_FILE"

echo ""
echo "✅ Tests terminés - Résultats dans: $OUTPUT_FILE"

# Résumé
success_count=$(grep -c '"status_code": 200' "$OUTPUT_FILE" 2>/dev/null || echo "0")
error_count=$(grep -c '"status_code": [45][0-9][0-9]' "$OUTPUT_FILE" 2>/dev/null || echo "0")

echo "📊 Résumé: $success_count succès, $error_count erreurs"