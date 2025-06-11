#!/bin/bash

# =============================================================================
# SCRIPT DE MAINTENANCE ECODELI
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/ecodeli-maintenance-$(date +%Y%m%d_%H%M%S).log"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $*${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $*${NC}" | tee -a "$LOG_FILE"
}

# Fonction d'affichage de l'aide
show_help() {
    cat << EOF
Script de Maintenance EcoDeli

Usage: $0 [OPTIONS] COMMAND

COMMANDS:
    health              Vérification complète de santé du système
    monitor             Monitoring en temps réel
    optimize            Optimisation des performances
    security            Audit de sécurité
    backup              Gestion des backups
    restore             Restauration depuis backup
    update              Mise à jour du système
    troubleshoot        Diagnostic et résolution de problèmes
    maintenance-mode    Activation/désactivation du mode maintenance
    ssl                 Gestion des certificats SSL
    database            Maintenance de la base de données
    cleanup             Nettoyage des ressources

OPTIONS:
    -v, --verbose       Mode verbeux
    -h, --help          Afficher cette aide
    --dry-run           Simulation sans exécution
    --force             Forcer l'exécution

EXAMPLES:
    $0 health                           # Vérification complète
    $0 monitor --verbose                # Monitoring verbeux
    $0 database optimize                # Optimisation DB
    $0 backup --force                   # Backup forcé
    $0 maintenance-mode on              # Activer maintenance

EOF
}

# Fonction de vérification de santé système
check_system_health() {
    log "🏥 === Vérification de Santé Système ==="
    
    local issues=0
    
    # Vérification Docker
    log "🐳 Vérification Docker..."
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker non accessible"
        ((issues++))
    else
        log_success "Docker opérationnel"
    fi
    
    # Vérification des services
    log "🔍 Vérification des services..."
    local services=("web" "postgres" "redis" "nginx" "prometheus" "grafana")
    
    for service in "${services[@]}"; do
        if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps "$service" | grep -q "Up"; then
            log_success "Service $service: Opérationnel"
        else
            log_warning "Service $service: Problème détecté"
            ((issues++))
        fi
    done
    
    # Vérification de l'espace disque
    log "💾 Vérification de l'espace disque..."
    local disk_usage=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 85 ]; then
        log_warning "Espace disque critique: ${disk_usage}%"
        ((issues++))
    elif [ "$disk_usage" -gt 70 ]; then
        log_warning "Espace disque élevé: ${disk_usage}%"
    else
        log_success "Espace disque: ${disk_usage}%"
    fi
    
    # Vérification de la mémoire
    log "🧠 Vérification de la mémoire..."
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')
    
    if [ "$mem_usage" -gt 90 ]; then
        log_warning "Utilisation mémoire élevée: ${mem_usage}%"
        ((issues++))
    else
        log_success "Utilisation mémoire: ${mem_usage}%"
    fi
    
    # Vérification des logs d'erreur
    log "📋 Vérification des logs d'erreur..."
    local error_count=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" logs --since=1h 2>&1 | grep -i "error\|exception\|fatal" | wc -l)
    
    if [ "$error_count" -gt 10 ]; then
        log_warning "$error_count erreurs détectées dans la dernière heure"
        ((issues++))
    else
        log_success "Logs: $error_count erreurs récentes"
    fi
    
    # Résumé
    if [ $issues -eq 0 ]; then
        log_success "🎉 Système en parfaite santé!"
    else
        log_warning "⚠️  $issues problèmes détectés"
    fi
    
    return $issues
}

# Fonction de monitoring en temps réel
real_time_monitoring() {
    log "📊 === Monitoring Temps Réel ==="
    
    # Fonction de nettoyage pour Ctrl+C
    cleanup_monitoring() {
        log "🛑 Arrêt du monitoring..."
        exit 0
    }
    trap cleanup_monitoring INT
    
    while true; do
        clear
        echo -e "${BLUE}=== EcoDeli Monitoring - $(date) ===${NC}"
        echo ""
        
        # Statut des conteneurs
        echo -e "${YELLOW}Services:${NC}"
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        # Utilisation CPU et Mémoire
        echo -e "${YELLOW}Ressources:${NC}"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
        echo ""
        
        # Derniers logs d'erreur
        echo -e "${YELLOW}Dernières erreurs:${NC}"
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" logs --since=5m 2>&1 | grep -i "error\|exception" | tail -5 || echo "Aucune erreur récente"
        echo ""
        
        echo "Appuyez sur Ctrl+C pour arrêter..."
        sleep 10
    done
}

# Fonction d'optimisation des performances
optimize_performance() {
    log "⚡ === Optimisation des Performances ==="
    
    # Optimisation Docker
    log "🐳 Optimisation Docker..."
    docker system prune -f
    docker image prune -f
    log_success "Nettoyage Docker terminé"
    
    # Optimisation PostgreSQL
    log "🗃️  Optimisation PostgreSQL..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d ecodeli -c "VACUUM ANALYZE;"
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d ecodeli -c "REINDEX DATABASE ecodeli;"
    log_success "Optimisation PostgreSQL terminée"
    
    # Optimisation Redis
    log "📦 Optimisation Redis..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli BGREWRITEAOF
    log_success "Optimisation Redis terminée"
    
    # Nettoyage des logs
    log "📝 Nettoyage des logs..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T nginx sh -c "truncate -s 0 /var/log/nginx/*.log"
    log_success "Logs nettoyés"
    
    log_success "🎉 Optimisation terminée"
}

# Fonction d'audit de sécurité
security_audit() {
    log "🔒 === Audit de Sécurité ==="
    
    local security_issues=0
    
    # Vérification des certificats SSL
    log "🔐 Vérification des certificats SSL..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T nginx openssl x509 -in /etc/nginx/ssl/cert.pem -noout -checkend 86400; then
        log_success "Certificats SSL valides"
    else
        log_warning "Certificats SSL expirent bientôt"
        ((security_issues++))
    fi
    
    # Vérification des ports ouverts
    log "🌐 Vérification des ports ouverts..."
    local open_ports=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps --format "table {{.Ports}}" | grep -v "PORTS" | grep -c "::")
    
    if [ "$open_ports" -gt 5 ]; then
        log_warning "Beaucoup de ports ouverts: $open_ports"
        ((security_issues++))
    else
        log_success "Ports ouverts: $open_ports"
    fi
    
    # Vérification des variables d'environnement sensibles
    log "🔑 Vérification des variables sensibles..."
    if [ -f "$PROJECT_ROOT/.env" ]; then
        if grep -q "changeme\|password123\|admin" "$PROJECT_ROOT/.env"; then
            log_warning "Mots de passe faibles détectés dans .env"
            ((security_issues++))
        else
            log_success "Variables d'environnement sécurisées"
        fi
    fi
    
    # Vérification des volumes Docker
    log "📁 Vérification des volumes..."
    local writable_volumes=$(docker volume ls -q | wc -l)
    log_success "Volumes Docker: $writable_volumes"
    
    # Résumé sécurité
    if [ $security_issues -eq 0 ]; then
        log_success "🛡️  Aucun problème de sécurité détecté"
    else
        log_warning "⚠️  $security_issues problèmes de sécurité détectés"
    fi
    
    return $security_issues
}

# Fonction de gestion des backups
manage_backups() {
    local action="${1:-list}"
    
    log "💾 === Gestion des Backups ==="
    
    case "$action" in
        "list")
            log "📋 Liste des backups disponibles:"
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backup find /backups -name "*.gz" -o -name "*.tar.gz" | sort -r | head -20
            ;;
        "create")
            log "📦 Création d'un backup manuel..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backup /app/scripts/backup-all.sh
            ;;
        "verify")
            log "🔍 Vérification des backups..."
            # Vérifier les 5 derniers backups
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backup sh -c "
                for backup in \$(find /backups -name '*.gz' | sort -r | head -5); do
                    echo \"Vérification: \$backup\"
                    if gzip -t \"\$backup\" 2>/dev/null; then
                        echo \"✅ OK\"
                    else
                        echo \"❌ Corrompu\"
                    fi
                done
            "
            ;;
        "cleanup")
            log "🧹 Nettoyage des anciens backups..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backup /app/scripts/backup-all.sh --cleanup
            ;;
        *)
            log_error "Action backup inconnue: $action"
            return 1
            ;;
    esac
}

# Fonction de diagnostic
troubleshoot() {
    log "🔧 === Diagnostic et Résolution de Problèmes ==="
    
    # Collecte d'informations système
    log "📊 Collecte d'informations système..."
    
    echo "=== Informations Système ===" > "/tmp/ecodeli-diagnostic-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Date: $(date)"
        echo "Hostname: $(hostname)"
        echo "OS: $(uname -a)"
        echo "Docker Version: $(docker --version)"
        echo "Docker Compose Version: $(docker-compose --version 2>/dev/null || docker compose version)"
        echo ""
        
        echo "=== État des Services ==="
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps
        echo ""
        
        echo "=== Utilisation des Ressources ==="
        docker stats --no-stream
        echo ""
        
        echo "=== Logs Récents (Erreurs) ==="
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" logs --since=1h 2>&1 | grep -i "error\|exception\|fatal" | tail -50
        echo ""
        
        echo "=== Espace Disque ==="
        df -h
        echo ""
        
        echo "=== Processus Docker ==="
        docker ps -a
        
    } >> "/tmp/ecodeli-diagnostic-$(date +%Y%m%d_%H%M%S).txt"
    
    log_success "Diagnostic sauvegardé: /tmp/ecodeli-diagnostic-*.txt"
    
    # Suggestions automatiques
    log "💡 Suggestions de résolution:"
    
    # Vérifier les services arrêtés
    local stopped_services=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps --format "table {{.Service}}\t{{.Status}}" | grep -c "Exited" || echo "0")
    if [ "$stopped_services" -gt 0 ]; then
        echo "  - Redémarrer les services arrêtés: ./scripts/deploy.sh restart"
    fi
    
    # Vérifier l'espace disque
    local disk_usage=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        echo "  - Nettoyer l'espace disque: ./scripts/maintenance.sh cleanup"
    fi
    
    # Vérifier la mémoire
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')
    if [ "$mem_usage" -gt 90 ]; then
        echo "  - Redémarrer les services pour libérer la mémoire"
    fi
}

# Fonction de mode maintenance
maintenance_mode() {
    local mode="${1:-status}"
    local maintenance_file="$PROJECT_ROOT/.maintenance"
    
    case "$mode" in
        "on")
            log "🚧 Activation du mode maintenance..."
            echo "$(date -Iseconds)" > "$maintenance_file"
            
            # Rediriger le trafic vers une page de maintenance
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T nginx sh -c "
                echo 'server { listen 80 default_server; return 503 \"Maintenance en cours\"; }' > /etc/nginx/conf.d/maintenance.conf
                nginx -s reload
            "
            log_success "Mode maintenance activé"
            ;;
        "off")
            log "✅ Désactivation du mode maintenance..."
            rm -f "$maintenance_file"
            
            # Restaurer la configuration normale
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T nginx sh -c "
                rm -f /etc/nginx/conf.d/maintenance.conf
                nginx -s reload
            "
            log_success "Mode maintenance désactivé"
            ;;
        "status")
            if [ -f "$maintenance_file" ]; then
                local maintenance_start=$(cat "$maintenance_file")
                log_warning "Mode maintenance actif depuis: $maintenance_start"
            else
                log_success "Mode maintenance inactif"
            fi
            ;;
        *)
            log_error "Mode maintenance invalide: $mode (on|off|status)"
            return 1
            ;;
    esac
}

# Fonction de maintenance de la base de données
database_maintenance() {
    local action="${1:-status}"
    
    log "🗃️  === Maintenance Base de Données ==="
    
    case "$action" in
        "status")
            log "📊 Statut de la base de données..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d ecodeli -c "
                SELECT 
                    schemaname,
                    tablename,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_vacuum,
                    last_analyze
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC 
                LIMIT 10;
            "
            ;;
        "optimize")
            log "⚡ Optimisation de la base de données..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d ecodeli -c "VACUUM ANALYZE;"
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d ecodeli -c "REINDEX DATABASE ecodeli;"
            log_success "Optimisation terminée"
            ;;
        "backup")
            log "💾 Backup de la base de données..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T backup /app/scripts/backup-postgresql.sh
            ;;
        "size")
            log "📏 Taille de la base de données..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d ecodeli -c "
                SELECT 
                    pg_size_pretty(pg_database_size('ecodeli')) as database_size,
                    pg_size_pretty(pg_total_relation_size('public')) as public_schema_size;
            "
            ;;
        *)
            log_error "Action base de données inconnue: $action"
            return 1
            ;;
    esac
}

# Parsing des arguments
VERBOSE=false
DRY_RUN=false
FORCE=false
COMMAND=""
SUBCOMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        health|monitor|optimize|security|backup|restore|update|troubleshoot|maintenance-mode|ssl|database|cleanup)
            COMMAND="$1"
            shift
            SUBCOMMAND="$1"
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

# Exécution des commandes
case "$COMMAND" in
    "health")
        check_system_health
        ;;
    "monitor")
        real_time_monitoring
        ;;
    "optimize")
        optimize_performance
        ;;
    "security")
        security_audit
        ;;
    "backup")
        manage_backups "${SUBCOMMAND:-list}"
        ;;
    "troubleshoot")
        troubleshoot
        ;;
    "maintenance-mode")
        maintenance_mode "${SUBCOMMAND:-status}"
        ;;
    "database")
        database_maintenance "${SUBCOMMAND:-status}"
        ;;
    "cleanup")
        optimize_performance
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

log_success "🎉 Maintenance terminée - Log: $LOG_FILE"