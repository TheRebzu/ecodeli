#!/bin/bash

# Script de vérification de la qualité du code EcoDeli
# À exécuter avant chaque commit ou dans la CI/CD

set -e

echo "🔍 VÉRIFICATION DE LA QUALITÉ DU CODE ECODELI"
echo "=============================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
ERRORS=0
WARNINGS=0

# Fonction pour afficher les erreurs
error() {
    echo -e "${RED}❌ ERREUR: $1${NC}"
    ((ERRORS++))
}

# Fonction pour afficher les avertissements
warning() {
    echo -e "${YELLOW}⚠️  AVERTISSEMENT: $1${NC}"
    ((WARNINGS++))
}

# Fonction pour afficher les succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher l'info
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
info "Vérification des anti-patterns de données mockées..."

# 1. Vérifier Math.random() dans les routers
echo "Vérification de Math.random() dans les routers..."
MATH_RANDOM_COUNT=$(find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "Math\.random()" {} \; 2>/dev/null | wc -l)
if [ "$MATH_RANDOM_COUNT" -gt 0 ]; then
    error "Math.random() trouvé dans $MATH_RANDOM_COUNT router(s)"
    find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "Math\.random()" {} \; 2>/dev/null | while read file; do
        echo "  📍 $file"
    done
else
    success "Aucun Math.random() dans les routers"
fi

# 2. Vérifier setTimeout() dans les routers
echo "Vérification de setTimeout() dans les routers..."
SETTIMEOUT_COUNT=$(find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "setTimeout" {} \; 2>/dev/null | wc -l)
if [ "$SETTIMEOUT_COUNT" -gt 0 ]; then
    error "setTimeout() trouvé dans $SETTIMEOUT_COUNT router(s)"
    find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "setTimeout" {} \; 2>/dev/null | while read file; do
        echo "  📍 $file"
    done
else
    success "Aucun setTimeout() dans les routers"
fi

# 3. Vérifier les fonctions vides qui retournent []
echo "Vérification des fonctions vides..."
EMPTY_FUNCTIONS=$(find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "return \[\]" {} \; 2>/dev/null | wc -l)
if [ "$EMPTY_FUNCTIONS" -gt 0 ]; then
    warning "Fonctions retournant [] trouvées dans $EMPTY_FUNCTIONS fichier(s)"
    find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "return \[\]" {} \; 2>/dev/null | while read file; do
        echo "  📍 $file"
    done
fi

# 4. Vérifier les TODO/FIXME critiques
echo "Vérification des TODO critiques..."
TODO_COUNT=$(find apps/web/src/server/api/routers -name "*.ts" -exec grep -i "todo.*implement\|fixme.*implement" {} \; 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    warning "$TODO_COUNT TODO d'implémentation trouvés"
fi

# 5. Vérifier l'utilisation des utilitaires optimisés
echo "Vérification de l'utilisation des utilitaires..."

# Vérifier si calculateDistance est importé correctement
CORRECT_IMPORTS=$(find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "from '@/server/utils/geo-calculations'" {} \; 2>/dev/null | wc -l)
LOCAL_DISTANCE_FUNCS=$(find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "function calculateDistance" {} \; 2>/dev/null | wc -l)

if [ "$LOCAL_DISTANCE_FUNCS" -gt 0 ]; then
    warning "Fonctions calculateDistance locales trouvées (utilisez l'utilitaire centralisé)"
    find apps/web/src/server/api/routers -name "*.ts" -exec grep -l "function calculateDistance" {} \; 2>/dev/null | while read file; do
        echo "  📍 $file"
    done
fi

if [ "$CORRECT_IMPORTS" -gt 0 ]; then
    success "$CORRECT_IMPORTS fichier(s) utilisent les utilitaires optimisés"
fi

echo ""
info "Vérification de la structure du code..."

# 6. Vérifier la présence des utilitaires
if [ -f "apps/web/src/server/utils/geo-calculations.ts" ]; then
    success "Utilitaire geo-calculations.ts présent"
else
    error "Utilitaire geo-calculations.ts manquant"
fi

if [ -f "apps/web/src/server/utils/validation-helpers.ts" ]; then
    success "Utilitaire validation-helpers.ts présent"
else
    error "Utilitaire validation-helpers.ts manquant"
fi

if [ -f "apps/web/src/server/utils/database-helpers.ts" ]; then
    success "Utilitaire database-helpers.ts présent"
else
    error "Utilitaire database-helpers.ts manquant"
fi

# 7. Vérifier la documentation
if [ -f "MOCK_DATA_ELIMINATION_REPORT.md" ]; then
    success "Rapport d'élimination présent"
else
    warning "Rapport d'élimination manquant"
fi

if [ -f "DEVELOPMENT_BEST_PRACTICES.md" ]; then
    success "Guide des bonnes pratiques présent"
else
    warning "Guide des bonnes pratiques manquant"
fi

echo ""
info "Vérification TypeScript (si disponible)..."

# 8. Vérification TypeScript basique
if command -v tsc >/dev/null 2>&1; then
    echo "Compilation TypeScript des utilitaires..."
    cd apps/web
    
    # Vérifier seulement les utilitaires pour éviter les timeouts
    if npx tsc --noEmit src/server/utils/*.ts 2>/dev/null; then
        success "Utilitaires TypeScript compilent sans erreur"
    else
        error "Erreurs de compilation TypeScript dans les utilitaires"
    fi
    cd ../..
else
    info "TypeScript non disponible, vérification ignorée"
fi

echo ""
echo "=============================================="

# Résumé final
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}🎉 PARFAIT! Aucun problème détecté${NC}"
    exit 0
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}📝 CODE ACCEPTABLE: $WARNINGS avertissement(s)${NC}"
    exit 0
else
    echo -e "${RED}🚨 PROBLÈMES DÉTECTÉS: $ERRORS erreur(s), $WARNINGS avertissement(s)${NC}"
    echo -e "${RED}Veuillez corriger les erreurs avant de continuer${NC}"
    exit 1
fi