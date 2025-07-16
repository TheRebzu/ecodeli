#!/bin/bash

# Script de vérification de santé pour EcoDeli
# Usage: ./scripts/health-check.sh [ENVIRONMENT]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
APP_URL="http://localhost:3000"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="ecodeli"
DB_USER="postgres"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Vérification des containers Docker
check_docker_containers() {
    info "Vérification des containers Docker..."
    
    local containers
    if [ "$ENVIRONMENT" = "dev" ]; then
        containers=$(docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps -q)
    else
        containers=$(docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps -q)
    fi
    
    if [ -z "$containers" ]; then
        error "Aucun container en cours d'exécution"
        return 1
    fi
    
    local running_count=0
    local total_count=0
    
    for container in $containers; do
        total_count=$((total_count + 1))
        if [ "$(docker inspect -f '{{.State.Running}}' $container)" = "true" ]; then
            running_count=$((running_count + 1))
            local name=$(docker inspect -f '{{.Name}}' $container | sed 's/\///')
            log "✅ Container $name en cours d'exécution"
        else
            local name=$(docker inspect -f '{{.Name}}' $container | sed 's/\///')
            error "❌ Container $name arrêté"
        fi
    done
    
    info "Containers: $running_count/$total_count en cours d'exécution"
    
    if [ $running_count -eq $total_count ]; then
        return 0
    else
        return 1
    fi
}

# Vérification de la base de données
check_database() {
    info "Vérification de la base de données..."
    
    # Vérification de la connexion
    if docker-compose exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log "✅ Base de données accessible"
    else
        error "❌ Base de données inaccessible"
        return 1
    fi
    
    # Vérification des tables principales
    local table_count=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " 2>/dev/null | xargs)
    
    if [ "$table_count" -gt 0 ]; then
        log "✅ Tables de base présentes ($table_count tables)"
    else
        error "❌ Aucune table trouvée"
        return 1
    fi
    
    # Vérification de l'espace disque
    local disk_usage=$(docker-compose exec -T postgres df -h /var/lib/postgresql/data | tail -n 1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        log "✅ Espace disque DB: ${disk_usage}% utilisé"
    else
        warn "⚠️  Espace disque DB: ${disk_usage}% utilisé (attention)"
    fi
    
    return 0
}

# Vérification de l'application web
check_web_application() {
    info "Vérification de l'application web..."
    
    # Vérification du health check
    if curl -f -s "$APP_URL/api/health" > /dev/null 2>&1; then
        log "✅ Application web accessible"
    else
        error "❌ Application web inaccessible"
        return 1
    fi
    
    # Vérification des pages principales
    local pages=("/" "/login" "/register")
    local failed_pages=0
    
    for page in "${pages[@]}"; do
        if curl -f -s "$APP_URL$page" > /dev/null 2>&1; then
            log "✅ Page $page accessible"
        else
            warn "⚠️  Page $page inaccessible"
            failed_pages=$((failed_pages + 1))
        fi
    done
    
    if [ $failed_pages -eq 0 ]; then
        log "✅ Toutes les pages principales sont accessibles"
    else
        warn "⚠️  $failed_pages pages inaccessibles"
    fi
    
    return 0
}

# Vérification des API endpoints
check_api_endpoints() {
    info "Vérification des endpoints API..."
    
    local endpoints=("/api/health" "/api/auth/session")
    local failed_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL$endpoint" 2>/dev/null)
        if [ "$response" -eq 200 ] || [ "$response" -eq 401 ]; then
            log "✅ API $endpoint répond (HTTP $response)"
        else
            warn "⚠️  API $endpoint ne répond pas (HTTP $response)"
            failed_endpoints=$((failed_endpoints + 1))
        fi
    done
    
    if [ $failed_endpoints -eq 0 ]; then
        log "✅ Tous les endpoints API répondent"
    else
        warn "⚠️  $failed_endpoints endpoints API ne répondent pas"
    fi
    
    return 0
}

# Vérification des volumes et logs
check_volumes_and_logs() {
    info "Vérification des volumes et logs..."
    
    # Vérification des volumes
    local volumes=$(docker volume ls -q | grep ecodeli)
    if [ -n "$volumes" ]; then
        log "✅ Volumes Docker présents"
        for volume in $volumes; do
            local size=$(docker system df -v | grep "$volume" | awk '{print $3}' | head -n 1)
            info "  - $volume: $size"
        done
    else
        warn "⚠️  Aucun volume Docker trouvé"
    fi
    
    # Vérification des logs d'application
    local log_errors=$(docker-compose logs ecodeli-app 2>/dev/null | grep -i error | wc -l)
    if [ "$log_errors" -eq 0 ]; then
        log "✅ Aucune erreur dans les logs d'application"
    else
        warn "⚠️  $log_errors erreurs trouvées dans les logs"
    fi
    
    return 0
}

# Vérification des performances
check_performance() {
    info "Vérification des performances..."
    
    # Temps de réponse de l'application
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$APP_URL/api/health" 2>/dev/null)
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if [ "$(echo "$response_time < 1" | bc)" -eq 1 ]; then
        log "✅ Temps de réponse: ${response_time_ms}ms"
    else
        warn "⚠️  Temps de réponse lent: ${response_time_ms}ms"
    fi
    
    # Utilisation mémoire des containers
    local memory_usage=$(docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | grep ecodeli)
    if [ -n "$memory_usage" ]; then
        log "✅ Utilisation mémoire:"
        echo "$memory_usage" | while read line; do
            info "  $line"
        done
    fi
    
    return 0
}

# Vérification de sécurité
check_security() {
    info "Vérification de sécurité..."
    
    # Vérification des headers de sécurité
    local security_headers=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection")
    local missing_headers=0
    
    for header in "${security_headers[@]}"; do
        if curl -s -I "$APP_URL/" | grep -i "$header" > /dev/null 2>&1; then
            log "✅ Header de sécurité $header présent"
        else
            warn "⚠️  Header de sécurité $header manquant"
            missing_headers=$((missing_headers + 1))
        fi
    done
    
    # Vérification HTTPS (en production)
    if [ "$ENVIRONMENT" = "prod" ]; then
        if curl -s -I "https://localhost/" > /dev/null 2>&1; then
            log "✅ HTTPS configuré"
        else
            error "❌ HTTPS non configuré"
        fi
    fi
    
    return 0
}

# Génération du rapport de santé
generate_health_report() {
    local report_file="health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== RAPPORT DE SANTÉ ECODELI ==="
        echo "Date: $(date)"
        echo "Environnement: $ENVIRONMENT"
        echo "Serveur: $(hostname)"
        echo ""
        echo "=== RÉSUMÉ ==="
        echo "Application: $APP_URL"
        echo "Base de données: $DB_HOST:$DB_PORT/$DB_NAME"
        echo ""
        echo "=== CONTAINERS DOCKER ==="
        if [ "$ENVIRONMENT" = "dev" ]; then
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
        else
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
        fi
        echo ""
        echo "=== UTILISATION DES RESSOURCES ==="
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        echo ""
        echo "=== ESPACE DISQUE ==="
        df -h
        echo ""
        echo "=== LOGS RÉCENTS ==="
        docker-compose logs --tail=10 ecodeli-app 2>/dev/null || echo "Aucun log disponible"
    } > "$report_file"
    
    log "Rapport de santé généré: $report_file"
}

# Fonction principale
main() {
    local all_checks_passed=true
    
    log "🔍 Démarrage de la vérification de santé EcoDeli ($ENVIRONMENT)"
    
    # Exécution des vérifications
    if ! check_docker_containers; then
        all_checks_passed=false
    fi
    
    if ! check_database; then
        all_checks_passed=false
    fi
    
    if ! check_web_application; then
        all_checks_passed=false
    fi
    
    if ! check_api_endpoints; then
        all_checks_passed=false
    fi
    
    if ! check_volumes_and_logs; then
        all_checks_passed=false
    fi
    
    if ! check_performance; then
        all_checks_passed=false
    fi
    
    if ! check_security; then
        all_checks_passed=false
    fi
    
    # Génération du rapport
    generate_health_report
    
    # Résultat final
    if $all_checks_passed; then
        log "✅ Toutes les vérifications ont réussi - Système en bonne santé"
        exit 0
    else
        error "❌ Certaines vérifications ont échoué - Vérifiez les logs ci-dessus"
        exit 1
    fi
}

# Exécution
main "$@"