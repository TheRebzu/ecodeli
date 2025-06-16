#!/bin/bash

# =============================================================================
# SCRIPT DE HEALTH CHECK POUR ECODELI
# =============================================================================

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
COMPOSE_FILE_PROD="docker-compose.prod.yml"
TIMEOUT=30

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
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# Détecter l'environnement
detect_environment() {
    if docker-compose -f $COMPOSE_FILE_PROD ps 2>/dev/null | grep -q "Up"; then
        ENVIRONMENT="production"
        COMPOSE_CMD="docker-compose -f $COMPOSE_FILE_PROD"
        WEB_URL="https://ecodeli.me"
        DB_CONTAINER="ecodeli-db-prod"
        WEB_CONTAINER="ecodeli-web-prod"
        NGINX_CONTAINER="ecodeli-nginx-prod"
    elif docker-compose -f $COMPOSE_FILE ps 2>/dev/null | grep -q "Up"; then
        ENVIRONMENT="development"
        COMPOSE_CMD="docker-compose -f $COMPOSE_FILE"
        WEB_URL="http://localhost:3000"
        DB_CONTAINER="ecodeli-db"
        WEB_CONTAINER="ecodeli-web"
        NGINX_CONTAINER="ecodeli-nginx"
    else
        error "Aucun environnement EcoDeli détecté"
        exit 1
    fi
    
    log "Environnement détecté: $ENVIRONMENT"
}

# Test de connectivité réseau
test_network_connectivity() {
    log "Test de connectivité réseau..."
    
    # Test des conteneurs
    containers=($DB_CONTAINER $WEB_CONTAINER $NGINX_CONTAINER)
    
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            success "✓ Conteneur $container en cours d'exécution"
        else
            error "✗ Conteneur $container non trouvé ou arrêté"
            return 1
        fi
    done
    
    # Test de la connectivité réseau entre conteneurs
    if docker exec $WEB_CONTAINER ping -c 1 $DB_CONTAINER > /dev/null 2>&1; then
        success "✓ Connectivité réseau Web -> DB OK"
    else
        error "✗ Problème de connectivité réseau Web -> DB"
        return 1
    fi
}

# Test de la base de données
test_database() {
    log "Test de la base de données..."
    
    # Test de connectivité PostgreSQL
    if docker exec $DB_CONTAINER pg_isready -U ecodeli > /dev/null 2>&1; then
        success "✓ PostgreSQL répond"
    else
        error "✗ PostgreSQL ne répond pas"
        return 1
    fi
    
    # Test de connexion avec les credentials
    if docker exec $DB_CONTAINER psql -U ecodeli -d ecodeli -c "SELECT 1;" > /dev/null 2>&1; then
        success "✓ Connexion à la base de données OK"
    else
        error "✗ Impossible de se connecter à la base de données"
        return 1
    fi
    
    # Test des tables principales (Prisma)
    if docker exec $DB_CONTAINER psql -U ecodeli -d ecodeli -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" | grep -q "User\|Account" 2>/dev/null; then
        success "✓ Tables de base détectées"
    else
        warn "⚠ Tables de base non trouvées (migrations non exécutées?)"
    fi
}

# Test de l'application web
test_web_application() {
    log "Test de l'application web..."
    
    # Test de l'endpoint de santé
    if timeout $TIMEOUT curl -f -s "$WEB_URL/api/health" > /dev/null; then
        success "✓ Endpoint de santé OK"
    else
        error "✗ Endpoint de santé inaccessible"
        return 1
    fi
    
    # Test de la page d'accueil
    if timeout $TIMEOUT curl -f -s "$WEB_URL/" > /dev/null; then
        success "✓ Page d'accueil accessible"
    else
        error "✗ Page d'accueil inaccessible"
        return 1
    fi
    
    # Test de l'API tRPC
    if timeout $TIMEOUT curl -f -s "$WEB_URL/api/trpc/health" > /dev/null 2>&1; then
        success "✓ API tRPC accessible"
    else
        warn "⚠ API tRPC non accessible (normal si pas d'endpoint health)"
    fi
    
    # Test de l'authentification
    if timeout $TIMEOUT curl -f -s "$WEB_URL/api/auth/session" > /dev/null; then
        success "✓ Système d'authentification OK"
    else
        warn "⚠ Problème avec le système d'authentification"
    fi
}

# Test du reverse proxy Nginx
test_nginx() {
    log "Test du reverse proxy Nginx..."
    
    # Test de Nginx
    if docker exec $NGINX_CONTAINER nginx -t > /dev/null 2>&1; then
        success "✓ Configuration Nginx valide"
    else
        error "✗ Configuration Nginx invalide"
        return 1
    fi
    
    # Test des ports
    if [ "$ENVIRONMENT" = "development" ]; then
        if timeout $TIMEOUT curl -f -s "http://localhost/" > /dev/null; then
            success "✓ Nginx accessible sur le port 80"
        else
            error "✗ Nginx inaccessible sur le port 80"
            return 1
        fi
    else
        # Test HTTPS en production
        if timeout $TIMEOUT curl -f -s "https://ecodeli.me/" > /dev/null; then
            success "✓ Nginx accessible en HTTPS"
        else
            error "✗ Nginx inaccessible en HTTPS"
            return 1
        fi
    fi
}

# Test des volumes et stockage
test_storage() {
    log "Test du stockage et volumes..."
    
    # Vérifier les volumes Docker
    volumes=$(docker volume ls | grep ecodeli | wc -l)
    if [ $volumes -gt 0 ]; then
        success "✓ $volumes volumes EcoDeli détectés"
    else
        warn "⚠ Aucun volume EcoDeli trouvé"
    fi
    
    # Test d'écriture dans la base de données
    test_query="INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('test_health_check', 'test', NOW(), 'test_migration', '', NULL, NOW(), 0) ON CONFLICT (id) DO UPDATE SET finished_at = NOW();"
    
    if docker exec $DB_CONTAINER psql -U ecodeli -d ecodeli -c "$test_query" > /dev/null 2>&1; then
        # Nettoyer le test
        docker exec $DB_CONTAINER psql -U ecodeli -d ecodeli -c "DELETE FROM _prisma_migrations WHERE id = 'test_health_check';" > /dev/null 2>&1
        success "✓ Écriture en base de données OK"
    else
        warn "⚠ Test d'écriture en base échoué"
    fi
}

# Test des performances
test_performance() {
    log "Test des performances..."
    
    # Mesurer le temps de réponse de l'API de santé
    start_time=$(date +%s%N)
    curl -f -s "$WEB_URL/api/health" > /dev/null
    end_time=$(date +%s%N)
    
    response_time=$(( (end_time - start_time) / 1000000 )) # en millisecondes
    
    if [ $response_time -lt 2000 ]; then
        success "✓ Temps de réponse API: ${response_time}ms"
    elif [ $response_time -lt 5000 ]; then
        warn "⚠ Temps de réponse API lent: ${response_time}ms"
    else
        error "✗ Temps de réponse API très lent: ${response_time}ms"
    fi
    
    # Vérifier l'utilisation mémoire des conteneurs
    memory_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | grep ecodeli)
    log "Utilisation mémoire:"
    echo "$memory_usage"
}

# Test complet
full_health_check() {
    log "=== HEALTH CHECK COMPLET ECODELI ==="
    log "Date: $(date)"
    
    detect_environment
    
    local failed_tests=0
    
    # Exécuter tous les tests
    test_network_connectivity || ((failed_tests++))
    test_database || ((failed_tests++))
    test_web_application || ((failed_tests++))
    test_nginx || ((failed_tests++))
    test_storage || ((failed_tests++))
    test_performance
    
    # Résumé
    echo ""
    log "=== RÉSUMÉ ==="
    
    if [ $failed_tests -eq 0 ]; then
        success "Tous les tests sont passés avec succès! ✓"
        exit 0
    else
        error "$failed_tests test(s) ont échoué ✗"
        exit 1
    fi
}

# Test rapide
quick_health_check() {
    log "=== HEALTH CHECK RAPIDE ECODELI ==="
    
    detect_environment
    
    # Tests essentiels uniquement
    if timeout $TIMEOUT curl -f -s "$WEB_URL/api/health" > /dev/null; then
        success "Application web accessible ✓"
    else
        error "Application web inaccessible ✗"
        exit 1
    fi
    
    if docker exec $DB_CONTAINER pg_isready -U ecodeli > /dev/null 2>&1; then
        success "Base de données accessible ✓"
    else
        error "Base de données inaccessible ✗"
        exit 1
    fi
    
    success "Health check rapide réussi! ✓"
}

# Afficher le statut des services
show_status() {
    detect_environment
    
    log "=== STATUT DES SERVICES ECODELI ==="
    log "Environnement: $ENVIRONMENT"
    echo ""
    
    $COMPOSE_CMD ps
    
    echo ""
    log "Logs récents (dernières 10 lignes):"
    $COMPOSE_CMD logs --tail=10
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  full               Health check complet"
    echo "  quick              Health check rapide"
    echo "  status             Afficher le statut des services"
    echo "  network            Tester la connectivité réseau"
    echo "  database           Tester la base de données"
    echo "  web                Tester l'application web"
    echo "  nginx              Tester le reverse proxy"
    echo "  performance        Tester les performances"
    echo "  help               Afficher cette aide"
    echo ""
}

# Script principal
main() {
    case "${1:-full}" in
        "full")
            full_health_check
            ;;
        "quick")
            quick_health_check
            ;;
        "status")
            show_status
            ;;
        "network")
            detect_environment
            test_network_connectivity
            ;;
        "database")
            detect_environment
            test_database
            ;;
        "web")
            detect_environment
            test_web_application
            ;;
        "nginx")
            detect_environment
            test_nginx
            ;;
        "performance")
            detect_environment
            test_performance
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            warn "Option non reconnue: $1"
            show_help
            exit 1
            ;;
    esac
}

# Exécution du script principal
main "$@"