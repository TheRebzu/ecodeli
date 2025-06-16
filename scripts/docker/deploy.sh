#!/bin/bash

# =============================================================================
# SCRIPT DE DÉPLOIEMENT DOCKER POUR ECODELI
# =============================================================================

set -e

# Configuration
PROJECT_NAME="ecodeli"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_FILE_PROD="docker-compose.prod.yml"
ENV_FILE=".env.docker"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        warn "Fichier $ENV_FILE non trouvé, création depuis le template..."
        cp .env.docker.example .env.docker 2>/dev/null || true
    fi
    
    log "Prérequis OK"
}

# Fonction de déploiement pour le développement
deploy_development() {
    log "Déploiement en mode développement..."
    
    # Arrêt des services existants
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down --volumes --remove-orphans 2>/dev/null || true
    
    # Construction et démarrage des services
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    # Attendre que les services soient prêts
    wait_for_services
    
    # Exécution des migrations Prisma
    run_migrations
    
    log "Déploiement développement terminé!"
    show_status
}

# Fonction de déploiement pour la production
deploy_production() {
    log "Déploiement en mode production..."
    
    if [ ! -f ".env.production" ]; then
        error "Fichier .env.production requis pour le déploiement en production"
    fi
    
    # Backup avant déploiement
    backup_before_deploy
    
    # Arrêt des services existants (avec graceful shutdown)
    docker-compose -f $COMPOSE_FILE_PROD --env-file .env.production down --timeout 30
    
    # Construction et démarrage des services
    docker-compose -f $COMPOSE_FILE_PROD --env-file .env.production build --no-cache
    docker-compose -f $COMPOSE_FILE_PROD --env-file .env.production up -d
    
    # Attendre que les services soient prêts
    wait_for_services_prod
    
    # Exécution des migrations Prisma
    run_migrations_prod
    
    # Test de santé post-déploiement
    health_check_post_deploy
    
    log "Déploiement production terminé!"
    show_status_prod
}

# Attendre que les services soient prêts
wait_for_services() {
    log "Attente de la disponibilité des services..."
    
    # Attendre PostgreSQL
    timeout 60 bash -c 'until docker-compose exec ecodeli-db pg_isready -U ecodeli; do sleep 2; done'
    
    # Attendre l'application web
    timeout 120 bash -c 'until curl -f http://localhost:3000/api/health; do sleep 5; done'
    
    log "Tous les services sont prêts"
}

# Attendre que les services de production soient prêts
wait_for_services_prod() {
    log "Attente de la disponibilité des services (production)..."
    
    # Attendre PostgreSQL
    timeout 120 bash -c 'until docker-compose -f docker-compose.prod.yml exec ecodeli-db pg_isready -U $POSTGRES_USER; do sleep 2; done'
    
    # Attendre l'application web
    timeout 180 bash -c 'until curl -f https://ecodeli.me/api/health; do sleep 10; done'
    
    log "Tous les services de production sont prêts"
}

# Exécution des migrations Prisma
run_migrations() {
    log "Exécution des migrations Prisma..."
    docker-compose exec ecodeli-web pnpm prisma migrate deploy
    docker-compose exec ecodeli-web pnpm prisma generate
    log "Migrations terminées"
}

# Exécution des migrations Prisma en production
run_migrations_prod() {
    log "Exécution des migrations Prisma (production)..."
    docker-compose -f docker-compose.prod.yml exec ecodeli-web pnpm prisma migrate deploy
    docker-compose -f docker-compose.prod.yml exec ecodeli-web pnpm prisma generate
    log "Migrations de production terminées"
}

# Backup avant déploiement
backup_before_deploy() {
    log "Création d'un backup avant déploiement..."
    
    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="backups/pre-deploy-$BACKUP_DATE"
    
    mkdir -p $BACKUP_DIR
    
    # Backup de la base de données
    docker-compose -f docker-compose.prod.yml exec ecodeli-db pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_DIR/database.sql
    
    # Backup des uploads
    docker cp ecodeli-web-prod:/app/uploads $BACKUP_DIR/ 2>/dev/null || true
    
    log "Backup créé dans $BACKUP_DIR"
}

# Test de santé post-déploiement
health_check_post_deploy() {
    log "Vérification de la santé des services..."
    
    # Vérifier tous les endpoints critiques
    ENDPOINTS=(
        "https://ecodeli.me/api/health"
        "https://ecodeli.me/api/auth/session"
        "https://ecodeli.me/fr"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            log "✓ $endpoint OK"
        else
            error "✗ $endpoint FAILED"
        fi
    done
    
    log "Tests de santé terminés avec succès"
}

# Affichage du statut des services
show_status() {
    log "Statut des services:"
    docker-compose ps
    
    log "\nServices disponibles:"
    echo "- Application Web: http://localhost:3000"
    echo "- Nginx: http://localhost"
    echo "- Base de données: localhost:5432"
    echo "- Logs: docker-compose logs -f"
}

# Affichage du statut des services de production
show_status_prod() {
    log "Statut des services de production:"
    docker-compose -f docker-compose.prod.yml ps
    
    log "\nServices de production disponibles:"
    echo "- Application Web: https://ecodeli.me"
    echo "- Base de données: (interne)"
    echo "- Monitoring: docker-compose -f docker-compose.prod.yml logs ecodeli-monitoring"
}

# Nettoyage des ressources Docker
cleanup() {
    log "Nettoyage des ressources Docker..."
    
    # Supprimer les conteneurs arrêtés
    docker container prune -f
    
    # Supprimer les images non utilisées
    docker image prune -f
    
    # Supprimer les volumes anonymes
    docker volume prune -f
    
    # Supprimer les réseaux non utilisés
    docker network prune -f
    
    log "Nettoyage terminé"
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  dev, development    Déploiement en mode développement"
    echo "  prod, production    Déploiement en mode production"
    echo "  stop               Arrêter tous les services"
    echo "  restart            Redémarrer tous les services"
    echo "  logs               Afficher les logs"
    echo "  status             Afficher le statut des services"
    echo "  cleanup            Nettoyer les ressources Docker"
    echo "  backup             Créer un backup manuel"
    echo "  restore [BACKUP]   Restaurer depuis un backup"
    echo "  help               Afficher cette aide"
    echo ""
}

# Script principal
main() {
    case "${1:-}" in
        "dev"|"development")
            check_prerequisites
            deploy_development
            ;;
        "prod"|"production")
            check_prerequisites
            deploy_production
            ;;
        "stop")
            docker-compose down --remove-orphans
            docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
            ;;
        "restart")
            docker-compose restart
            ;;
        "logs")
            docker-compose logs -f ${2:-}
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "backup")
            backup_before_deploy
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            warn "Option non reconnue: ${1:-}"
            show_help
            exit 1
            ;;
    esac
}

# Exécution du script principal
main "$@"