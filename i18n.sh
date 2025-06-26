#!/bin/bash

# Script pour gérer l'internationalisation EcoDeli
# Usage: ./i18n.sh [action] [options]

# Fonction d'aide
show_help() {
    echo "🌍 EcoDeli I18n Manager"
    echo "======================="
    echo ""
    echo "Usage: ./i18n.sh [action] [options]"
    echo ""
    echo "Actions:"
    echo "  extract    Extract hardcoded labels from source code"
    echo "  merge      Merge extracted labels with existing translations"
    echo "  replace    Replace hardcoded labels with translation calls"
    echo "  all        Run the complete workflow"
    echo "  status     Show current project status"
    echo "  help       Show this help message"
    echo ""
    echo "Options:"
    echo "  --dry-run  Simulate replace action without modifying files"
    echo ""
    echo "Examples:"
    echo "  ./i18n.sh all           # Run complete workflow"
    echo "  ./i18n.sh extract       # Only extract labels"
    echo "  ./i18n.sh replace --dry-run  # Test replacement"
}

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Déterminer l'action
ACTION=${1:-help}

case $ACTION in
    extract|merge|replace|all|status)
        echo "🌍 EcoDeli I18n Manager"
        echo "======================="
        node i18n-workflow.js "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Action inconnue: $ACTION"
        echo ""
        show_help
        exit 1
        ;;
esac