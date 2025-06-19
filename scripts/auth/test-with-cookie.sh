#!/bin/bash

# Script de test avec cookie de session
# Usage: ./test-with-cookie.sh "VOTRE_COOKIE_VALUE"

if [ -z "$1" ]; then
  echo "❌ Usage: $0 <session-token>"
  echo "📖 Exemple: $0 'eyJhbGciOiJIUzI1NiJ9...'"
  echo ""
  echo "🔧 Pour extraire le cookie:"
  echo "  1. Allez sur http://localhost:3000/fr/login"
  echo "  2. Connectez-vous avec: jean.dupont@orange.fr / password123"
  echo "  3. F12 > Application > Cookies > next-auth.session-token"
  echo "  4. Copiez la valeur et relancez ce script"
  exit 1
fi

COOKIE="next-auth.session-token=$1"
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

echo "🧪 Test des pages avec authentification..."
echo "🍪 Cookie: ${1:0:50}..."
echo

# Test de connectivité
echo "📡 Test de connectivité..."
if ! curl -s -f http://localhost:3000/api/health > /dev/null; then
  echo "❌ Application non accessible. Démarrez avec: pnpm dev"
  exit 1
fi
echo "✅ Application accessible"
echo

# Test page client
echo "📋 Test page client:"
RESPONSE=$(curl -s -H "Cookie: $COOKIE" -H "User-Agent: $USER_AGENT" \
     http://localhost:3000/fr/client)

if echo "$RESPONSE" | grep -q -i "tableau de bord\|dashboard\|client"; then
  echo "✅ Page client OK - Utilisateur authentifié"
elif echo "$RESPONSE" | grep -q -i "login\|connexion"; then
  echo "❌ Page client KO - Redirection vers login (cookie invalide?)"
else
  echo "⚠️  Page client - Réponse inattendue"
fi

# Test page annonces
echo "📋 Test page annonces:"
RESPONSE=$(curl -s -H "Cookie: $COOKIE" -H "User-Agent: $USER_AGENT" \
     http://localhost:3000/fr/client/announcements)

if echo "$RESPONSE" | grep -q -i "annonce\|créer"; then
  echo "✅ Page annonces OK"
elif echo "$RESPONSE" | grep -q -i "login\|connexion"; then
  echo "❌ Page annonces KO - Redirection vers login"
else
  echo "⚠️  Page annonces - Réponse inattendue"
fi

# Test page création
echo "📋 Test page création:"
RESPONSE=$(curl -s -H "Cookie: $COOKIE" -H "User-Agent: $USER_AGENT" \
     http://localhost:3000/fr/client/announcements/create)

if echo "$RESPONSE" | grep -q -i "créer\|annonce\|formulaire"; then
  echo "✅ Page création OK"
elif echo "$RESPONSE" | grep -q -i "login\|connexion"; then
  echo "❌ Page création KO - Redirection vers login"
else
  echo "⚠️  Page création - Réponse inattendue"
fi

# Test des erreurs JavaScript
echo "📋 Test des erreurs:"
ERROR_COUNT=0

if echo "$RESPONSE" | grep -q -i "missing_message"; then
  echo "❌ Erreurs de traduction détectées"
  ERROR_COUNT=$((ERROR_COUNT + 1))
fi

if echo "$RESPONSE" | grep -q -i "error\|exception"; then
  echo "❌ Erreurs JavaScript détectées"
  ERROR_COUNT=$((ERROR_COUNT + 1))
fi

if echo "$RESPONSE" | grep -q "\[EN\]"; then
  echo "⚠️  Traductions non finalisées détectées"
fi

if [ $ERROR_COUNT -eq 0 ]; then
  echo "✅ Aucune erreur majeure détectée"
fi

echo
echo "✅ Tests terminés"

# Test du bouton de création (extraction du HTML)
echo "📋 Test du bouton de création:"
if echo "$RESPONSE" | grep -q -i "href.*create\|créer.*annonce"; then
  echo "✅ Bouton de création trouvé dans le HTML"
else
  echo "❌ Bouton de création non trouvé"
fi

echo
echo "🔧 Pour tester la création d'annonce manuellement:"
echo "  1. Allez sur http://localhost:3000/fr/client/announcements"
echo "  2. Cliquez sur 'Créer une annonce'"
echo "  3. Remplissez le formulaire"
echo "  4. Vérifiez la console (F12) pour les erreurs"