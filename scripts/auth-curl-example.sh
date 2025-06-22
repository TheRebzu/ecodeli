#!/bin/bash

# Script d'exemple pour l'authentification NextAuth avec curl
# Configuration
BASE_URL="${NEXTAUTH_URL:-http://localhost:3000}"
EMAIL="jean.dupont@orange.fr"
PASSWORD="password123"

echo "🔐 Authentification NextAuth avec curl"
echo "====================================="
echo "URL de base: $BASE_URL"
echo "Email: $EMAIL"
echo ""

# Étape 1: Obtenir le token CSRF
echo "📋 Étape 1: Récupération du token CSRF..."
CSRF_RESPONSE=$(curl -s "$BASE_URL/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | grep -o '[^"]*$')

if [ -z "$CSRF_TOKEN" ]; then
    echo "❌ Erreur: Impossible d'obtenir le token CSRF"
    exit 1
fi

echo "✅ Token CSRF obtenu: $CSRF_TOKEN"
echo ""

# Étape 2: Se connecter avec les credentials
echo "🔐 Étape 2: Connexion..."

# Préparer les données du formulaire
LOGIN_DATA="email=$(echo -n "$EMAIL" | jq -sRr @uri)&password=$(echo -n "$PASSWORD" | jq -sRr @uri)&csrfToken=$CSRF_TOKEN&callbackUrl=$BASE_URL/client&json=true"

# Effectuer la requête de connexion
LOGIN_RESPONSE=$(curl -s -i -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Accept: application/json" \
    -d "$LOGIN_DATA" \
    "$BASE_URL/api/auth/callback/credentials")

# Extraire les cookies de la réponse
SESSION_COOKIE=$(echo "$LOGIN_RESPONSE" | grep -i "set-cookie:" | grep -E "(next-auth\.session-token|__Secure-next-auth\.session-token)" | head -1)

if [ -z "$SESSION_COOKIE" ]; then
    echo "❌ Erreur: Connexion échouée"
    echo "Réponse du serveur:"
    echo "$LOGIN_RESPONSE" | tail -20
    exit 1
fi

# Extraire le nom et la valeur du cookie
if [[ "$SESSION_COOKIE" =~ __Secure-next-auth\.session-token=([^;]+) ]]; then
    COOKIE_NAME="__Secure-next-auth.session-token"
    COOKIE_VALUE="${BASH_REMATCH[1]}"
elif [[ "$SESSION_COOKIE" =~ next-auth\.session-token=([^;]+) ]]; then
    COOKIE_NAME="next-auth.session-token"
    COOKIE_VALUE="${BASH_REMATCH[1]}"
else
    echo "❌ Erreur: Impossible d'extraire le cookie de session"
    exit 1
fi

echo "✅ Connexion réussie!"
echo ""
echo "🍪 Cookie d'authentification:"
echo "Nom: $COOKIE_NAME"
echo "Valeur: $COOKIE_VALUE"
echo ""

# Étape 3: Tester une route protégée
echo "🧪 Étape 3: Test d'une route protégée..."

# Appel à l'API TRPC pour obtenir le profil
PROFILE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE_NAME=$COOKIE_VALUE" \
    -d '{"input":{}}' \
    "$BASE_URL/api/trpc/client.getProfile")

if [ $? -eq 0 ]; then
    echo "✅ Accès à la route protégée réussi!"
    echo ""
    echo "📝 Réponse du serveur:"
    echo "$PROFILE_RESPONSE" | jq '.' 2>/dev/null || echo "$PROFILE_RESPONSE"
else
    echo "❌ Erreur lors de l'accès à la route protégée"
fi

echo ""
echo "📚 Exemples d'utilisation du cookie:"
echo ""
echo "1. Avec curl:"
echo "   curl -H \"Cookie: $COOKIE_NAME=$COOKIE_VALUE\" $BASE_URL/api/..."
echo ""
echo "2. Dans un script bash:"
echo "   AUTH_COOKIE=\"$COOKIE_NAME=$COOKIE_VALUE\""
echo "   curl -H \"Cookie: \$AUTH_COOKIE\" $BASE_URL/api/..."
echo ""
echo "3. Pour une session complète, sauvegarder dans un fichier:"
echo "   echo \"$COOKIE_NAME=$COOKIE_VALUE\" > auth-cookie.txt"
echo "   curl -b auth-cookie.txt $BASE_URL/api/..."
echo ""

# Optionnel: sauvegarder le cookie dans un fichier
if [ "$1" == "--save" ]; then
    echo "$COOKIE_NAME=$COOKIE_VALUE" > auth-cookie.txt
    echo "💾 Cookie sauvegardé dans auth-cookie.txt"
fi