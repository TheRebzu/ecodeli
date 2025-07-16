#!/bin/bash

# Script de déploiement EcoDeli
# Utilisation: ./scripts/deploy.sh [dev|prod]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
PROJECT_NAME="ecodeli"
DOCKER_REGISTRY="registry.ecodeli.com"
VERSION=${VERSION:-latest}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
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
    
    if [ ! -f ".env.docker" ]; then
        warn "Le fichier .env.docker n'existe pas, création d'un fichier par défaut..."
        cp .env.docker.example .env.docker 2>/dev/null || true
    fi
    
    log "Prérequis OK"
}

# Nettoyage des anciens containers
cleanup() {
    log "Nettoyage des anciens containers..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans || true
    else
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans || true
    fi
    
    # Nettoyage des images non utilisées
    docker image prune -f
    
    log "Nettoyage terminé"
}

# Build de l'application
build_application() {
    log "Construction de l'application..."
    
    # Build de l'image Docker
    docker build -t ${PROJECT_NAME}:${VERSION} .
    
    # Tag pour le registry si en production
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker tag ${PROJECT_NAME}:${VERSION} ${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}
    fi
    
    log "Construction terminée"
}

# Déploiement
deploy() {
    log "Déploiement en mode $ENVIRONMENT..."
    
    # Copie du fichier d'environnement
    if [ -f ".env.docker" ]; then
        cp .env.docker .env
    fi
    
    # Génération des certificats SSL si nécessaire
    if [ "$ENVIRONMENT" = "prod" ] && [ ! -f "nginx/ssl/cert.pem" ]; then
        log "Génération des certificats SSL auto-signés..."
        mkdir -p nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=FR/ST=Paris/L=Paris/O=EcoDeli/CN=localhost"
    fi
    
    # Déploiement selon l'environnement
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
    else
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    fi
    
    log "Déploiement terminé"
}

# Vérification du déploiement
verify_deployment() {
    log "Vérification du déploiement..."
    
    # Attendre que les services soient prêts
    sleep 10
    
    # Vérifier que l'application répond
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log "✅ Application déployée avec succès"
    else
        error "❌ L'application ne répond pas"
    fi
    
    # Vérifier la base de données
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log "✅ Base de données opérationnelle"
    else
        error "❌ Problème avec la base de données"
    fi
}

# Affichage des logs
show_logs() {
    log "Affichage des logs..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
    else
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    fi
}

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  deploy      Déploie l'application (défaut)"
    echo "  build       Construit l'image Docker"
    echo "  cleanup     Nettoie les containers"
    echo "  logs        Affiche les logs"
    echo "  status      Affiche le statut des services"
    echo "  help        Affiche cette aide"
    echo ""
    echo "Environments:"
    echo "  dev         Déploiement de développement (défaut)"
    echo "  prod        Déploiement de production"
    echo ""
    echo "Examples:"
    echo "  $0 deploy dev"
    echo "  $0 build"
    echo "  $0 cleanup"
    echo "  $0 logs prod"
}

# Affichage du statut
show_status() {
    log "Statut des services..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
    else
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    fi
}

# Fonction principale
main() {
    local command=${1:-deploy}
    
    case $command in
        deploy)
            check_prerequisites
            cleanup
            build_application
            deploy
            verify_deployment
            log "🚀 Déploiement $ENVIRONMENT terminé avec succès!"
            log "📱 Application disponible sur: http://localhost:3000"
            if [ "$ENVIRONMENT" = "dev" ]; then
                log "🔧 PgAdmin disponible sur: http://localhost:8080"
            fi
            ;;
        build)
            check_prerequisites
            build_application
            ;;
        cleanup)
            cleanup
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        help)
            show_help
            ;;
        *)
            error "Commande inconnue: $command"
            show_help
            ;;
    esac
}

# Exécution
main "$@"