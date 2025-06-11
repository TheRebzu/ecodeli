#!/bin/bash

# Script de lancement pour EcoDeli Desktop
echo "🚀 === Lancement EcoDeli Desktop Analytics ==="

# Variables
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAR_FILE="$PROJECT_DIR/target/ecodeli-desktop-1.0.0-jar-with-dependencies.jar"
JAVA_OPTS=""
API_URL=""
DEBUG_MODE=""

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Affiche cette aide"
    echo "  -d, --debug             Active le mode debug"
    echo "  -a, --api-url URL       URL de l'API tRPC (défaut: http://localhost:3000)"
    echo "  -m, --memory SIZE       Taille mémoire JVM (ex: 512m, 1g)"
    echo "  --demo                  Force le mode démo"
    echo "  --build                 Build avant lancement"
    echo ""
    echo "Exemples:"
    echo "  $0                                    # Lancement normal"
    echo "  $0 --debug                           # Avec debug"
    echo "  $0 --api-url http://prod.api.com     # Avec URL API personnalisée"
    echo "  $0 --memory 1g --debug               # Avec plus de mémoire et debug"
    echo "  $0 --build                           # Build puis lance"
}

# Fonction de vérification des prérequis
check_prerequisites() {
    # Vérifier Java
    if ! command -v java &> /dev/null; then
        echo "❌ Java n'est pas installé ou pas dans le PATH"
        echo "   Veuillez installer Java 17 ou supérieur"
        exit 1
    fi
    
    # Vérifier la version Java
    JAVA_VER=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_VER" -lt "17" ]; then
        echo "❌ Java 17 ou supérieur requis (version actuelle: $JAVA_VER)"
        exit 1
    fi
    
    # Vérifier que le JAR existe
    if [ ! -f "$JAR_FILE" ]; then
        echo "❌ JAR exécutable non trouvé: $JAR_FILE"
        echo "   Veuillez d'abord builder l'application avec:"
        echo "   ./scripts/build.sh"
        exit 1
    fi
    
    echo "✅ Prérequis vérifiés"
}

# Fonction de build
build_application() {
    echo "🔨 Build de l'application..."
    "$PROJECT_DIR/scripts/build.sh" quick
    
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors du build"
        exit 1
    fi
}

# Fonction de configuration des options Java
configure_java_opts() {
    # Options de base
    JAVA_OPTS="$JAVA_OPTS -Dfile.encoding=UTF-8"
    JAVA_OPTS="$JAVA_OPTS -Djava.awt.headless=false"
    
    # Configuration JavaFX
    JAVA_OPTS="$JAVA_OPTS -Djavafx.preloader=com.ecodeli.desktop.Preloader"
    JAVA_OPTS="$JAVA_OPTS -Dprism.lcdtext=false"
    JAVA_OPTS="$JAVA_OPTS -Dprism.text=t2k"
    
    # URL de l'API
    if [ -n "$API_URL" ]; then
        JAVA_OPTS="$JAVA_OPTS -Dapi.base.url=$API_URL"
        echo "🔗 URL API: $API_URL"
    else
        JAVA_OPTS="$JAVA_OPTS -Dapi.base.url=http://localhost:3000"
        echo "🔗 URL API par défaut: http://localhost:3000"
    fi
    
    # Mode debug
    if [ "$DEBUG_MODE" = "true" ]; then
        JAVA_OPTS="$JAVA_OPTS -Ddebug=true"
        JAVA_OPTS="$JAVA_OPTS -Dorg.slf4j.simpleLogger.defaultLogLevel=DEBUG"
        echo "🐛 Mode debug activé"
    fi
    
    echo "⚙️ Options Java configurées"
}

# Fonction de lancement
launch_application() {
    echo "🎯 Lancement de l'application..."
    echo "📁 Répertoire de travail: $PROJECT_DIR"
    echo "📦 JAR: $JAR_FILE"
    
    if [ "$DEBUG_MODE" = "true" ]; then
        echo "🔧 Options Java: $JAVA_OPTS"
    fi
    
    cd "$PROJECT_DIR"
    
    # Lancement avec gestion d'erreur
    java $JAVA_OPTS -jar "$JAR_FILE" "$@"
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Application fermée normalement"
    else
        echo "❌ Application fermée avec le code d'erreur: $EXIT_CODE"
        
        # Suggestions d'aide en cas d'erreur
        case $EXIT_CODE in
            1)
                echo "💡 Suggestions:"
                echo "   - Vérifiez les logs pour plus de détails"
                echo "   - Essayez le mode debug: $0 --debug"
                ;;
            130)
                echo "💡 Application interrompue par l'utilisateur (Ctrl+C)"
                ;;
            *)
                echo "💡 Suggestions:"
                echo "   - Vérifiez que l'API tRPC est démarrée"
                echo "   - Essayez le mode démo: $0 --demo"
                echo "   - Consultez la documentation"
                ;;
        esac
    fi
    
    return $EXIT_CODE
}

# Analyse des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--debug)
            DEBUG_MODE="true"
            shift
            ;;
        -a|--api-url)
            API_URL="$2"
            shift 2
            ;;
        -m|--memory)
            JAVA_OPTS="$JAVA_OPTS -Xmx$2"
            echo "💾 Mémoire configurée: $2"
            shift 2
            ;;
        --demo)
            JAVA_OPTS="$JAVA_OPTS -Ddemo.mode=true"
            echo "🎭 Mode démo forcé"
            shift
            ;;
        --build)
            BUILD_FIRST="true"
            shift
            ;;
        *)
            echo "❌ Option inconnue: $1"
            echo "Utilisez --help pour voir les options disponibles"
            exit 1
            ;;
    esac
done

# Exécution principale
main() {
    # Build si demandé
    if [ "$BUILD_FIRST" = "true" ]; then
        build_application
    fi
    
    # Vérifications
    check_prerequisites
    
    # Configuration
    configure_java_opts
    
    # Lancement
    launch_application
}

# Point d'entrée
main "$@"