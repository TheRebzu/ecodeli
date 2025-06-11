#!/bin/bash

# Script de build pour EcoDeli Desktop
echo "🔨 === Build EcoDeli Desktop Analytics ==="

# Variables
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$PROJECT_DIR/target"
JAVA_VERSION="17"

# Fonction pour vérifier les prérequis
check_prerequisites() {
    echo "📋 Vérification des prérequis..."
    
    # Vérifier Java
    if ! command -v java &> /dev/null; then
        echo "❌ Java n'est pas installé ou pas dans le PATH"
        exit 1
    fi
    
    # Vérifier Maven
    if ! command -v mvn &> /dev/null; then
        echo "❌ Maven n'est pas installé ou pas dans le PATH"
        exit 1
    fi
    
    # Vérifier la version Java
    JAVA_VER=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_VER" -lt "$JAVA_VERSION" ]; then
        echo "❌ Java $JAVA_VERSION ou supérieur requis (version actuelle: $JAVA_VER)"
        exit 1
    fi
    
    echo "✅ Tous les prérequis sont satisfaits"
}

# Fonction de nettoyage
clean_build() {
    echo "🧹 Nettoyage du projet..."
    cd "$PROJECT_DIR"
    mvn clean
    echo "✅ Nettoyage terminé"
}

# Fonction de compilation
compile_project() {
    echo "⚙️ Compilation du projet..."
    cd "$PROJECT_DIR"
    
    if mvn compile; then
        echo "✅ Compilation réussie"
    else
        echo "❌ Erreur lors de la compilation"
        exit 1
    fi
}

# Fonction de test
run_tests() {
    echo "🧪 Exécution des tests..."
    cd "$PROJECT_DIR"
    
    if mvn test; then
        echo "✅ Tests réussis"
    else
        echo "⚠️ Certains tests ont échoué"
        read -p "Continuer malgré les échecs de tests ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Fonction de packaging
package_application() {
    echo "📦 Packaging de l'application..."
    cd "$PROJECT_DIR"
    
    if mvn package -DskipTests; then
        echo "✅ Packaging réussi"
    else
        echo "❌ Erreur lors du packaging"
        exit 1
    fi
}

# Fonction de génération du JAR exécutable
create_executable_jar() {
    echo "🚀 Création du JAR exécutable..."
    cd "$PROJECT_DIR"
    
    if mvn package -DskipTests -P executable-jar; then
        echo "✅ JAR exécutable créé"
    else
        echo "❌ Erreur lors de la création du JAR exécutable"
        exit 1
    fi
}

# Fonction d'affichage des informations de build
show_build_info() {
    echo ""
    echo "📊 === Informations de Build ==="
    echo "📁 Répertoire du projet: $PROJECT_DIR"
    echo "📁 Répertoire target: $TARGET_DIR"
    
    if [ -f "$TARGET_DIR/ecodeli-desktop-1.0.0.jar" ]; then
        JAR_SIZE=$(du -h "$TARGET_DIR/ecodeli-desktop-1.0.0.jar" | cut -f1)
        echo "📦 JAR principal: ecodeli-desktop-1.0.0.jar ($JAR_SIZE)"
    fi
    
    if [ -f "$TARGET_DIR/ecodeli-desktop-1.0.0-jar-with-dependencies.jar" ]; then
        EXEC_JAR_SIZE=$(du -h "$TARGET_DIR/ecodeli-desktop-1.0.0-jar-with-dependencies.jar" | cut -f1)
        echo "🚀 JAR exécutable: ecodeli-desktop-1.0.0-jar-with-dependencies.jar ($EXEC_JAR_SIZE)"
    fi
    
    echo ""
    echo "🎯 Pour lancer l'application:"
    echo "   ./scripts/run.sh"
    echo "   ou"
    echo "   java -jar target/ecodeli-desktop-1.0.0-jar-with-dependencies.jar"
}

# Menu principal
main() {
    case "${1:-full}" in
        "clean")
            check_prerequisites
            clean_build
            ;;
        "compile")
            check_prerequisites
            compile_project
            ;;
        "test")
            check_prerequisites
            run_tests
            ;;
        "package")
            check_prerequisites
            package_application
            ;;
        "quick")
            check_prerequisites
            clean_build
            compile_project
            package_application
            create_executable_jar
            show_build_info
            ;;
        "full"|*)
            check_prerequisites
            clean_build
            compile_project
            run_tests
            package_application
            create_executable_jar
            show_build_info
            ;;
    esac
}

# Exécution
main "$@"

echo ""
echo "🎉 Build terminé avec succès!"
echo "📝 Logs détaillés disponibles dans target/maven.log"