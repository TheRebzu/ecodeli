#!/bin/bash

# =============================================================================
# SCRIPT D'ENTRYPOINT POUR L'APPLICATION DESKTOP ECODELI
# =============================================================================

set -e

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Configuration des variables d'environnement
APP_ENV="${APP_ENV:-production}"
APP_MODE="${APP_MODE:-gui}"
JAVA_OPTS="${JAVA_OPTS:--Xmx2G -Xms512M -XX:+UseG1GC}"

log "🚀 === Démarrage EcoDeli Desktop Application ==="
log "📅 Date: $(date)"
log "🏷️  Environnement: $APP_ENV"
log "🖥️  Mode: $APP_MODE"
log "☁️  Java Options: $JAVA_OPTS"

# Fonction de vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier Java
    if ! java -version >/dev/null 2>&1; then
        log "❌ Java n'est pas installé ou configuré"
        exit 1
    fi
    
    # Vérifier l'application JAR
    if [ ! -f "/app/ecodeli-desktop.jar" ]; then
        log "❌ Application JAR introuvable"
        exit 1
    fi
    
    # Vérifier les répertoires
    for dir in "/app/config" "/app/logs" "/app/data" "/app/reports" "/app/temp"; do
        if [ ! -d "$dir" ]; then
            log "📁 Création du répertoire: $dir"
            mkdir -p "$dir"
        fi
    done
    
    log "✅ Prérequis vérifiés"
}

# Configuration de l'affichage pour mode GUI
setup_display() {
    if [ "$APP_MODE" = "gui" ]; then
        log "🖥️  Configuration de l'affichage..."
        
        # Démarrer Xvfb si DISPLAY n'est pas configuré
        if [ -z "$DISPLAY" ]; then
            log "🖼️  Démarrage du serveur X virtuel..."
            export DISPLAY=:1
            Xvfb :1 -screen 0 1024x768x24 &
            XVFB_PID=$!
            
            # Attendre que Xvfb soit prêt
            sleep 2
            
            # Démarrer un gestionnaire de fenêtres minimal
            fluxbox &
            FLUXBOX_PID=$!
            
            log "✅ Serveur X virtuel démarré (PID: $XVFB_PID)"
        fi
    fi
}

# Configuration des logs
setup_logging() {
    log "📝 Configuration des logs..."
    
    # Configuration de logback
    export LOGBACK_CONFIG_FILE="/app/config/logback.xml"
    
    # Créer le fichier de log principal
    touch "/app/logs/application.log"
    
    log "✅ Logs configurés"
}

# Test de connectivité backend
test_backend_connection() {
    log "🔗 Test de connexion au backend..."
    
    if [ -n "$BACKEND_URL" ]; then
        if curl -s --max-time 10 "$BACKEND_URL/health" >/dev/null 2>&1; then
            log "✅ Backend accessible"
        else
            log "⚠️  Backend non accessible, certaines fonctionnalités peuvent être limitées"
        fi
    else
        log "ℹ️  URL du backend non configurée"
    fi
}

# Fonction de nettoyage au signal TERM
cleanup() {
    log "🛑 Arrêt en cours..."
    
    # Arrêter les processus X11 si lancés
    if [ -n "$FLUXBOX_PID" ]; then
        kill $FLUXBOX_PID 2>/dev/null || true
    fi
    
    if [ -n "$XVFB_PID" ]; then
        kill $XVFB_PID 2>/dev/null || true
    fi
    
    # Nettoyage des fichiers temporaires
    rm -rf /app/temp/* 2>/dev/null || true
    
    log "✅ Nettoyage terminé"
}

# Fonction de monitoring de santé
health_check() {
    log "🏥 Démarrage du service de santé..."
    
    # Créer un endpoint de santé simple
    while true; do
        sleep 30
        
        # Vérifier si l'application Java est toujours en cours
        if ! pgrep -f "ecodeli-desktop.jar" >/dev/null; then
            log "❌ Application Java non trouvée"
            exit 1
        fi
        
        # Écrire le statut de santé
        echo "{\"status\":\"healthy\",\"timestamp\":\"$(date -Iseconds)\"}" > /app/health.json
    done &
    
    HEALTH_PID=$!
}

# Fonction de démarrage de l'application
start_application() {
    log "🎯 Démarrage de l'application EcoDeli Desktop..."
    
    # Construction de la commande Java
    JAVA_CMD="java $JAVA_OPTS"
    
    # Ajouter les propriétés système
    JAVA_CMD="$JAVA_CMD -Dapp.environment=$APP_ENV"
    JAVA_CMD="$JAVA_CMD -Dapp.mode=$APP_MODE"
    JAVA_CMD="$JAVA_CMD -Dlogback.configurationFile=/app/config/logback.xml"
    JAVA_CMD="$JAVA_CMD -Djava.io.tmpdir=/app/temp"
    
    # Configuration spécifique selon le mode
    case "$APP_MODE" in
        "headless")
            JAVA_CMD="$JAVA_CMD -Djava.awt.headless=true"
            JAVA_CMD="$JAVA_CMD -Dprism.order=sw"
            log "🤖 Mode headless activé"
            ;;
        "gui")
            JAVA_CMD="$JAVA_CMD -Dprism.order=sw"
            JAVA_CMD="$JAVA_CMD -Dprism.fontsmoothing=true"
            log "🖥️  Mode GUI activé"
            ;;
    esac
    
    # Lancement de l'application
    JAVA_CMD="$JAVA_CMD -jar /app/ecodeli-desktop.jar"
    
    log "▶️  Commande: $JAVA_CMD"
    
    # Démarrage avec gestion des arguments
    if [ $# -gt 0 ]; then
        exec $JAVA_CMD "$@"
    else
        exec $JAVA_CMD
    fi
}

# Fonction principale
main() {
    # Configuration du gestionnaire de signal
    trap cleanup TERM INT
    
    # Initialisation
    check_prerequisites
    setup_display
    setup_logging
    test_backend_connection
    
    # Services auxiliaires
    if [ "$APP_MODE" = "gui" ]; then
        health_check
    fi
    
    log "🎉 Initialisation terminée, démarrage de l'application..."
    
    # Démarrage de l'application
    start_application "$@"
}

# Gestion des arguments spéciaux
case "${1:-}" in
    "--help")
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --headless     Mode sans interface graphique"
        echo "  --dev          Mode développement"
        echo "  --test         Mode test"
        echo "  --help         Afficher cette aide"
        echo ""
        echo "Variables d'environnement:"
        echo "  APP_ENV        Environnement (development|production)"
        echo "  APP_MODE       Mode d'exécution (gui|headless)"
        echo "  BACKEND_URL    URL du backend EcoDeli"
        echo "  JAVA_OPTS      Options JVM"
        exit 0
        ;;
    "--headless")
        APP_MODE="headless"
        shift
        ;;
    "--dev")
        APP_ENV="development"
        JAVA_OPTS="$JAVA_OPTS -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
        shift
        ;;
    "--test")
        APP_ENV="test"
        shift
        ;;
esac

# Lancement principal
main "$@"