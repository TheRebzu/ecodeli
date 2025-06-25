#!/bin/bash

# Script de déploiement EcoDeli
# Usage: ./deploy.sh [environment] [options]
# Environments: dev, staging, production

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Node.js (pour le build local si nécessaire)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js n'est pas installé (optionnel pour build local)"
    fi
    
    # Vérifier l'espace disque
    AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        log_error "Espace disque insuffisant (minimum 5GB requis)"
        exit 1
    fi
    
    log_success "Prérequis validés"
}

# Chargement de l'environnement
load_environment() {
    local env_name="$1"
    local env_file="${PROJECT_ROOT}/.env.${env_name}"
    
    if [ ! -f "$env_file" ]; then
        log_error "Fichier d'environnement manquant: $env_file"
        log_info "Copier le fichier .env.example et configurer les variables"
        exit 1
    fi
    
    # Charger les variables d'environnement
    set -a  # Automatically export all variables
    source "$env_file"
    set +a
    
    log_success "Environnement $env_name chargé"
}

# Vérification de la configuration
validate_config() {
    log_info "Validation de la configuration..."
    
    # Variables obligatoires
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
        "STRIPE_SECRET_KEY"
        "POSTGRES_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Variable d'environnement manquante: $var"
            exit 1
        fi
    done
    
    # Vérifier la force du mot de passe de la base de données
    if [ ${#POSTGRES_PASSWORD} -lt 12 ]; then
        log_error "Le mot de passe PostgreSQL doit contenir au moins 12 caractères"
        exit 1
    fi
    
    log_success "Configuration validée"
}

# Sauvegarde de la base de données
backup_database() {
    if [ "$ENVIRONMENT" != "production" ]; then
        return 0
    fi
    
    log_info "Sauvegarde de la base de données..."
    
    local backup_dir="${PROJECT_ROOT}/backups"
    local backup_file="${backup_dir}/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    # Créer la sauvegarde
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump \
        -U "${POSTGRES_USER:-ecodeli_user}" \
        -d "${POSTGRES_DB:-ecodeli}" > "$backup_file"; then
        log_success "Sauvegarde créée: $backup_file"
        
        # Compression
        gzip "$backup_file"
        log_success "Sauvegarde compressée: ${backup_file}.gz"
        
        # Nettoyage des anciennes sauvegardes (garder les 7 dernières)
        find "$backup_dir" -name "backup_*.sql.gz" -type f -mtime +7 -delete
        
    else
        log_error "Échec de la sauvegarde"
        return 1
    fi
}

# Arrêt des services
stop_services() {
    log_info "Arrêt des services..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" stop
        log_success "Services arrêtés"
    else
        log_info "Aucun service en cours d'exécution"
    fi
}

# Build des images
build_images() {
    log_info "Construction des images Docker..."
    
    # Nettoyage des images obsolètes
    docker system prune -f
    
    # Build de l'image de l'application
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache app
    
    log_success "Images construites"
}

# Migration de la base de données
run_migrations() {
    log_info "Exécution des migrations de base de données..."
    
    # Attendre que la base de données soit prête
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready \
            -U "${POSTGRES_USER:-ecodeli_user}" \
            -d "${POSTGRES_DB:-ecodeli}" > /dev/null 2>&1; then
            break
        fi
        
        log_info "Attente de la base de données... (tentative $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Impossible de se connecter à la base de données"
        exit 1
    fi
    
    # Exécuter les migrations Prisma
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec app npx prisma migrate deploy
    
    log_success "Migrations exécutées"
}

# Démarrage des services
start_services() {
    log_info "Démarrage des services..."
    
    # Profils à démarrer selon l'environnement
    local profiles=""
    if [ "$ENVIRONMENT" = "production" ]; then
        profiles="--profile monitoring --profile logging"
    fi
    
    # Démarrage avec Docker Compose
    docker-compose -f "$DOCKER_COMPOSE_FILE" $profiles up -d
    
    # Attendre que les services soient prêts
    local services=("postgres" "redis" "app" "nginx")
    
    for service in "${services[@]}"; do
        log_info "Vérification du service $service..."
        
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" | grep -q "healthy\|Up"; then
                log_success "Service $service démarré"
                break
            fi
            
            sleep 2
            ((attempt++))
        done
        
        if [ $attempt -gt $max_attempts ]; then
            log_error "Échec du démarrage du service $service"
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs "$service"
            exit 1
        fi
    done
    
    log_success "Tous les services sont démarrés"
}

# Tests de santé
health_check() {
    log_info "Vérification de la santé de l'application..."
    
    local app_url="${NEXTAUTH_URL:-http://localhost}"
    local health_endpoint="${app_url}/api/health"
    
    # Test de l'endpoint de santé
    if curl -f -s "$health_endpoint" > /dev/null; then
        log_success "Application accessible et en bonne santé"
    else
        log_error "L'application ne répond pas correctement"
        log_info "Vérification des logs..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs app
        exit 1
    fi
    
    # Tests spécifiques selon l'environnement
    if [ "$ENVIRONMENT" = "production" ]; then
        # Test de la base de données
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready \
            -U "${POSTGRES_USER:-ecodeli_user}" \
            -d "${POSTGRES_DB:-ecodeli}" > /dev/null; then
            log_success "Base de données accessible"
        else
            log_error "Problème de connexion à la base de données"
            exit 1
        fi
        
        # Test de Redis
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
            log_success "Redis accessible"
        else
            log_error "Problème de connexion à Redis"
            exit 1
        fi
    fi
}

# Affichage des informations de déploiement
show_deployment_info() {
    log_success "=== DÉPLOIEMENT RÉUSSI ==="
    echo
    log_info "Environnement: $ENVIRONMENT"
    log_info "Application: ${NEXTAUTH_URL:-http://localhost}"
    log_info "Documentation API: ${NEXTAUTH_URL:-http://localhost}/api-docs"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Monitoring: http://localhost:3001 (Grafana)"
        log_info "Métriques: http://localhost:9090 (Prometheus)"
    fi
    
    echo
    log_info "Services Docker:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo
    log_info "Commandes utiles:"
    echo "  - Voir les logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  - Arrêter: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  - Redémarrer: docker-compose -f $DOCKER_COMPOSE_FILE restart"
}

# Nettoyage en cas d'erreur
cleanup_on_error() {
    log_error "Erreur pendant le déploiement, nettoyage..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    exit 1
}

# Fonction principale
main() {
    # Capture des erreurs
    trap cleanup_on_error ERR
    
    # Parse des arguments
    ENVIRONMENT="${1:-production}"
    FORCE_REBUILD="${2:-false}"
    
    # Validation de l'environnement
    case "$ENVIRONMENT" in
        dev|development)
            ENVIRONMENT="development"
            DOCKER_COMPOSE_FILE="docker-compose.yml"
            ;;
        staging)
            ENVIRONMENT="staging"
            ;;
        prod|production)
            ENVIRONMENT="production"
            ;;
        *)
            log_error "Environnement invalide: $ENVIRONMENT"
            log_info "Utilisation: $0 [dev|staging|production] [force-rebuild]"
            exit 1
            ;;
    esac
    
    # Changement vers le répertoire du projet
    cd "$PROJECT_ROOT"
    
    # Exécution du déploiement
    log_info "🚀 Déploiement EcoDeli - Environnement: $ENVIRONMENT"
    echo
    
    check_prerequisites
    load_environment "$ENVIRONMENT"
    validate_config
    
    if [ "$ENVIRONMENT" = "production" ]; then
        backup_database
    fi
    
    stop_services
    
    if [ "$FORCE_REBUILD" = "force-rebuild" ] || [ "$FORCE_REBUILD" = "true" ]; then
        build_images
    fi
    
    start_services
    run_migrations
    health_check
    show_deployment_info
    
    log_success "🎉 Déploiement terminé avec succès!"
}

# Exécution si le script est appelé directement
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi