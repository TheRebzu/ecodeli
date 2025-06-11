#!/bin/bash

# =============================================================================
# SCRIPT DE DÉPLOIEMENT ECODELI
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"
VERSION="${VERSION:-latest}"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_OVERRIDE=""

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging avec couleurs
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $*${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $*${NC}"
}

# Fonction d'affichage de l'aide
show_help() {
    cat << EOF
Déploiement EcoDeli - Script de déploiement automatisé

Usage: $0 [OPTIONS] COMMAND

COMMANDS:
    init        Initialisation complète de l'environnement
    deploy      Déploiement de l'application
    update      Mise à jour de l'application
    restart     Redémarrage des services
    stop        Arrêt des services
    start       Démarrage des services
    logs        Affichage des logs
    status      Statut des services
    backup      Déclenchement d'un backup manuel
    restore     Restauration depuis un backup
    cleanup     Nettoyage des resources inutilisées

OPTIONS:
    -e, --env ENV           Environnement (development|staging|production)
    -v, --version VERSION   Version à déployer
    -f, --force            Forcer le déploiement
    -h, --help             Afficher cette aide
    --dry-run              Simulation sans exécution
    --verbose              Mode verbeux

EXAMPLES:
    $0 init                                 # Initialisation complète
    $0 deploy --env production              # Déploiement en production
    $0 update --version 1.2.0              # Mise à jour vers v1.2.0
    $0 logs web                            # Logs du service web
    $0 backup                              # Backup manuel

Variables d'environnement:
    ENVIRONMENT            Environnement de déploiement
    VERSION               Version à déployer
    DOCKER_REGISTRY       Registry Docker personnalisé
    BACKUP_BEFORE_DEPLOY  Backup automatique avant déploiement (true/false)

EOF
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier l'espace disque (minimum 5GB)
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 5242880 ]; then # 5GB en KB
        log_warning "Espace disque faible: $(echo "$available_space" | awk '{print $1/1024/1024 " GB"}')"
    fi
    
    # Vérifier les fichiers de configuration
    if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
        log_error "Fichier docker-compose.yml introuvable"
        exit 1
    fi
    
    # Vérifier le fichier .env
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log_warning "Fichier .env introuvable, copie depuis .env.example"
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        else
            log_error "Fichier .env introuvable"
            exit 1
        fi
    fi
    
    log_success "Prérequis vérifiés"
}

# Fonction de configuration de l'environnement
setup_environment() {
    log "⚙️  Configuration de l'environnement: $ENVIRONMENT"
    
    case "$ENVIRONMENT" in
        "development")
            COMPOSE_OVERRIDE="docker-compose.dev.yml"
            ;;
        "staging")
            COMPOSE_OVERRIDE="docker-compose.staging.yml"
            ;;
        "production")
            COMPOSE_OVERRIDE="docker-compose.prod.yml"
            ;;
        *)
            log_error "Environnement non supporté: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Configuration des variables d'environnement
    export ENVIRONMENT
    export VERSION
    
    log_success "Environnement configuré: $ENVIRONMENT"
}

# Fonction de construction des images
build_images() {
    log "🔨 Construction des images Docker..."
    
    local build_args=""
    if [ "$ENVIRONMENT" = "development" ]; then
        build_args="--no-cache"
    fi
    
    if [ -f "$PROJECT_ROOT/$COMPOSE_OVERRIDE" ]; then
        docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" -f "$PROJECT_ROOT/$COMPOSE_OVERRIDE" build $build_args
    else
        docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" build $build_args
    fi
    
    log_success "Images construites"
}

# Fonction de backup pré-déploiement
pre_deploy_backup() {
    if [ "${BACKUP_BEFORE_DEPLOY:-true}" = "true" ] && [ "$ENVIRONMENT" = "production" ]; then
        log "💾 Backup pré-déploiement..."
        
        # Vérifier si les services sont en cours
        if docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" ps | grep -q "Up"; then
            # Déclenchement du backup
            docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T backup /app/scripts/backup-all.sh
            log_success "Backup pré-déploiement terminé"
        else
            log_warning "Services non actifs, backup ignoré"
        fi
    fi
}

# Fonction d'initialisation de la base de données
init_database() {
    log "🗃️  Initialisation de la base de données..."
    
    # Attendre que PostgreSQL soit prêt
    log "⏳ Attente de PostgreSQL..."
    timeout 60 bash -c 'until docker-compose -f "$1/$2" exec -T postgres pg_isready -U postgres; do sleep 2; done' -- "$PROJECT_ROOT" "$COMPOSE_FILE"
    
    # Exécution des migrations Prisma
    log "🔄 Exécution des migrations..."
    docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T web sh -c "cd apps/web && npx prisma migrate deploy"
    
    # Génération du client Prisma
    docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T web sh -c "cd apps/web && npx prisma generate"
    
    # Seeding (uniquement en développement)
    if [ "$ENVIRONMENT" = "development" ]; then
        log "🌱 Seeding de la base de données..."
        docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T web sh -c "cd apps/web && npx prisma db seed"
    fi
    
    log_success "Base de données initialisée"
}

# Fonction de déploiement
deploy_services() {
    log "🚀 Déploiement des services..."
    
    local compose_files="-f $PROJECT_ROOT/$COMPOSE_FILE"
    if [ -f "$PROJECT_ROOT/$COMPOSE_OVERRIDE" ]; then
        compose_files="$compose_files -f $PROJECT_ROOT/$COMPOSE_OVERRIDE"
    fi
    
    # Arrêt en douceur des anciens conteneurs
    docker-compose $compose_files down --remove-orphans
    
    # Démarrage des nouveaux services
    docker-compose $compose_files up -d
    
    # Vérification du démarrage
    log "⏳ Vérification du démarrage des services..."
    sleep 10
    
    # Health checks
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy_services=0
        local total_services=0
        
        while IFS= read -r line; do
            if [[ $line == *"healthy"* ]]; then
                ((healthy_services++))
            fi
            ((total_services++))
        done < <(docker-compose $compose_files ps --format "table {{.Service}}\t{{.Status}}" | tail -n +2)
        
        if [ $healthy_services -eq $total_services ] && [ $total_services -gt 0 ]; then
            log_success "Tous les services sont opérationnels"
            break
        fi
        
        log "⏳ Services en cours de démarrage ($healthy_services/$total_services) - Tentative $attempt/$max_attempts"
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Timeout lors du démarrage des services"
        return 1
    fi
    
    log_success "Services déployés avec succès"
}

# Fonction de vérification post-déploiement
post_deploy_verification() {
    log "🔍 Vérification post-déploiement..."
    
    # Test de l'application web
    local web_url="http://localhost:3000"
    if curl -s --max-time 10 "$web_url/api/health" >/dev/null; then
        log_success "Application web accessible"
    else
        log_error "Application web non accessible"
        return 1
    fi
    
    # Test de l'API desktop (si en mode production)
    if [ "$ENVIRONMENT" = "production" ]; then
        local desktop_url="http://localhost:8080"
        if curl -s --max-time 10 "$desktop_url/health" >/dev/null; then
            log_success "Application desktop accessible"
        else
            log_warning "Application desktop non accessible"
        fi
    fi
    
    # Vérification des métriques
    local metrics_url="http://localhost:9090"
    if curl -s --max-time 10 "$metrics_url/-/healthy" >/dev/null; then
        log_success "Système de monitoring opérationnel"
    else
        log_warning "Système de monitoring non accessible"
    fi
    
    log_success "Vérifications post-déploiement terminées"
}

# Fonction d'affichage du statut
show_status() {
    log "📊 Statut des services EcoDeli"
    echo ""
    
    local compose_files="-f $PROJECT_ROOT/$COMPOSE_FILE"
    if [ -f "$PROJECT_ROOT/$COMPOSE_OVERRIDE" ]; then
        compose_files="$compose_files -f $PROJECT_ROOT/$COMPOSE_OVERRIDE"
    fi
    
    docker-compose $compose_files ps
    echo ""
    
    # Affichage des URLs d'accès
    log "🌐 URLs d'accès:"
    echo "  - Application Web: http://localhost"
    echo "  - Monitoring: http://localhost/monitoring"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Application Desktop: http://localhost:8080 (si déployée)"
}

# Fonction d'affichage des logs
show_logs() {
    local service="${1:-}"
    local compose_files="-f $PROJECT_ROOT/$COMPOSE_FILE"
    if [ -f "$PROJECT_ROOT/$COMPOSE_OVERRIDE" ]; then
        compose_files="$compose_files -f $PROJECT_ROOT/$COMPOSE_OVERRIDE"
    fi
    
    if [ -n "$service" ]; then
        docker-compose $compose_files logs -f "$service"
    else
        docker-compose $compose_files logs -f
    fi
}

# Fonction de nettoyage
cleanup() {
    log "🧹 Nettoyage des ressources Docker..."
    
    # Supprimer les images non utilisées
    docker image prune -f
    
    # Supprimer les volumes orphelins
    docker volume prune -f
    
    # Supprimer les réseaux non utilisés
    docker network prune -f
    
    log_success "Nettoyage terminé"
}

# Fonction principale d'initialisation
init_project() {
    log "🎯 Initialisation complète du projet EcoDeli"
    
    check_prerequisites
    setup_environment
    build_images
    deploy_services
    init_database
    post_deploy_verification
    show_status
    
    log_success "🎉 Initialisation terminée avec succès!"
    log "📖 Consultez la documentation pour les prochaines étapes"
}

# Fonction principale de déploiement
deploy_project() {
    log "🚀 Déploiement EcoDeli v$VERSION en $ENVIRONMENT"
    
    check_prerequisites
    setup_environment
    pre_deploy_backup
    build_images
    deploy_services
    post_deploy_verification
    show_status
    
    log_success "🎉 Déploiement terminé avec succès!"
}

# Parsing des arguments
FORCE=false
DRY_RUN=false
VERBOSE=false
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        init|deploy|update|restart|stop|start|logs|status|backup|restore|cleanup)
            COMMAND="$1"
            shift
            break
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Changement vers le répertoire du projet
cd "$PROJECT_ROOT"

# Traitement des commandes
case "$COMMAND" in
    "init")
        init_project
        ;;
    "deploy")
        deploy_project
        ;;
    "update")
        deploy_project
        ;;
    "restart")
        docker-compose -f "$COMPOSE_FILE" restart
        ;;
    "stop")
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    "start")
        docker-compose -f "$COMPOSE_FILE" up -d
        ;;
    "logs")
        show_logs "$1"
        ;;
    "status")
        show_status
        ;;
    "backup")
        docker-compose -f "$COMPOSE_FILE" exec backup /app/scripts/backup-all.sh
        ;;
    "cleanup")
        cleanup
        ;;
    "")
        log_error "Commande requise"
        show_help
        exit 1
        ;;
    *)
        log_error "Commande inconnue: $COMMAND"
        show_help
        exit 1
        ;;
esac