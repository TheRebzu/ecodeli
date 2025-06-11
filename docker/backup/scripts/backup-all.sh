#!/bin/bash

# =============================================================================
# SCRIPT DE BACKUP COMPLET ECODELI
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/app/logs/backup-all-$(date +%Y%m%d_%H%M%S).log"
LOCK_FILE="/app/backup.lock"
NOTIFICATION_WEBHOOK="${BACKUP_NOTIFICATION_WEBHOOK:-}"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Fonction de nettoyage
cleanup() {
    local exit_code=$?
    rm -f "$LOCK_FILE"
    
    if [ $exit_code -eq 0 ]; then
        log "✅ Backup complet terminé avec succès"
        send_notification "success" "Backup EcoDeli terminé avec succès"
    else
        log "❌ Backup complet échoué (code: $exit_code)"
        send_notification "error" "Backup EcoDeli échoué"
    fi
    
    exit $exit_code
}

# Fonction de notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\",\"service\":\"backup\"}" \
             --max-time 10 >/dev/null 2>&1 || true
    fi
}

# Vérification du lock pour éviter les exécutions multiples
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "❌ Un backup est déjà en cours (PID: $pid)"
            exit 1
        else
            log "⚠️  Fichier lock orphelin détecté, suppression"
            rm -f "$LOCK_FILE"
        fi
    fi
    
    echo $$ > "$LOCK_FILE"
    log "🔒 Lock acquis (PID: $$)"
}

# Fonction de test de connectivité
test_connectivity() {
    log "🔗 Test de connectivité aux services..."
    
    local services=(
        "postgres:5432"
        ""
        "web:3000"
    )
    
    for service in "${services[@]}"; do
        local host="${service%:*}"
        local port="${service#*:}"
        
        if timeout 10 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            log "✅ $service accessible"
        else
            log "⚠️  $service non accessible"
        fi
    done
}

# Fonction de backup PostgreSQL
backup_postgresql() {
    log "📦 === Backup PostgreSQL ==="
    
    if [ -x "$SCRIPT_DIR/backup-postgresql.sh" ]; then
        if "$SCRIPT_DIR/backup-postgresql.sh"; then
            log "✅ Backup PostgreSQL terminé"
            return 0
        else
            log "❌ Backup PostgreSQL échoué"
            return 1
        fi
    else
        log "❌ Script backup PostgreSQL introuvable"
        return 1
    fi
}


        if "$SCRIPT_DIR/backup-redis.sh"; then
            log "✅ Backup Redis terminé"
            return 0
        else
            log "❌ Backup Redis échoué"
            return 1
        fi
    else
        log "❌ Script backup Redis introuvable"
        return 1
    fi
}

# Fonction de backup des uploads
backup_uploads() {
    log "📦 === Backup Uploads ==="
    
    if [ -x "$SCRIPT_DIR/backup-uploads.sh" ]; then
        if "$SCRIPT_DIR/backup-uploads.sh"; then
            log "✅ Backup uploads terminé"
            return 0
        else
            log "❌ Backup uploads échoué"
            return 1
        fi
    else
        log "❌ Script backup uploads introuvable"
        return 1
    fi
}

# Fonction de backup des logs
backup_logs() {
    log "📦 === Backup Logs ==="
    
    local date=$(date +%Y%m%d_%H%M%S)
    local archive_file="/backups/logs/logs_$date.tar.gz"
    
    # Collecter les logs de tous les conteneurs
    local temp_dir="/tmp/logs_backup_$date"
    mkdir -p "$temp_dir"
    
    # Logs applicatifs (si montés)
    if [ -d "/var/log/nginx" ]; then
        cp -r /var/log/nginx "$temp_dir/" 2>/dev/null || true
    fi
    
    if [ -d "/var/log/postgresql" ]; then
        cp -r /var/log/postgresql "$temp_dir/" 2>/dev/null || true
    fi
    
    # Logs de l'application (si disponibles)
    if [ -d "/app/logs" ]; then
        cp -r /app/logs "$temp_dir/backup-logs" 2>/dev/null || true
    fi
    
    # Création de l'archive
    if [ "$(ls -A "$temp_dir" 2>/dev/null)" ]; then
        tar -czf "$archive_file" -C "$temp_dir" . 2>/dev/null
        log "✅ Archive logs créée: $(basename "$archive_file")"
        
        # Nettoyage
        rm -rf "$temp_dir"
        return 0
    else
        log "⚠️  Aucun log à sauvegarder"
        rm -rf "$temp_dir"
        return 0
    fi
}

# Fonction de génération du rapport de backup
generate_backup_report() {
    log "📊 === Génération du rapport de backup ==="
    
    local report_file="/backups/backup-report-$(date +%Y%m%d_%H%M%S).json"
    local total_size=0
    
    # Calcul de la taille totale des backups
    for dir in /backups/postgresql /backups/redis /backups/uploads /backups/logs; do
        if [ -d "$dir" ]; then
            local size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
            total_size=$((total_size + size))
        fi
    done
    
    # Génération du rapport JSON
    cat > "$report_file" << EOF
{
    "backup_date": "$(date -Iseconds)",
    "backup_duration_seconds": $(($(date +%s) - start_time)),
    "total_size_bytes": $total_size,
    "total_size_human": "$(echo $total_size | awk '{print $1/1024/1024/1024" GB"}')",
    "components": {
        "postgresql": {
            "enabled": true,
            "size_bytes": $(du -sb /backups/postgresql 2>/dev/null | cut -f1 || echo "0"),
            "latest_backup": "$(ls -t /backups/postgresql/*.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "none")"
        },
        "redis": {
            "enabled": true,
            "size_bytes": $(du -sb /backups/redis 2>/dev/null | cut -f1 || echo "0"),
            "latest_backup": "$(ls -t /backups/redis/*.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "none")"
        },
        "uploads": {
            "enabled": true,
            "size_bytes": $(du -sb /backups/uploads 2>/dev/null | cut -f1 || echo "0"),
            "latest_backup": "$(ls -t /backups/uploads/*.tar.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "none")"
        },
        "logs": {
            "enabled": true,
            "size_bytes": $(du -sb /backups/logs 2>/dev/null | cut -f1 || echo "0"),
            "latest_backup": "$(ls -t /backups/logs/*.tar.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "none")"
        }
    },
    "retention": {
        "daily_days": ${RETENTION_DAYS:-30},
        "monthly_months": ${RETENTION_MONTHLY:-12}
    },
    "system_info": {
        "hostname": "$(hostname)",
        "disk_usage": "$(df -h /backups | tail -1)",
        "memory_usage": "$(free -h | grep '^Mem:' || echo 'N/A')"
    }
}
EOF
    
    log "✅ Rapport généré: $(basename "$report_file")"
    log "📊 Taille totale des backups: $(echo $total_size | awk '{print $1/1024/1024/1024" GB"}')"
}

# Fonction de nettoyage des anciens backups
cleanup_old_backups() {
    log "🧹 === Nettoyage des anciens backups ==="
    
    local retention_days="${RETENTION_DAYS:-30}"
    local retention_monthly="${RETENTION_MONTHLY:-12}"
    
    # Nettoyage des backups quotidiens
    for backup_dir in /backups/postgresql /backups/redis /backups/uploads /backups/logs; do
        if [ -d "$backup_dir" ]; then
            local count_before=$(find "$backup_dir" -type f -name "*.gz" -o -name "*.tar.gz" | wc -l)
            find "$backup_dir" -type f \( -name "*.gz" -o -name "*.tar.gz" \) -mtime +$retention_days -delete 2>/dev/null || true
            local count_after=$(find "$backup_dir" -type f -name "*.gz" -o -name "*.tar.gz" | wc -l)
            
            if [ $count_before -gt $count_after ]; then
                log "🗑️  $(basename "$backup_dir"): $((count_before - count_after)) fichiers supprimés"
            fi
        fi
    done
    
    # Nettoyage des rapports anciens
    find /backups -name "backup-report-*.json" -mtime +$retention_days -delete 2>/dev/null || true
    
    log "✅ Nettoyage terminé"
}

# Fonction de vérification de l'espace disque
check_disk_space() {
    log "💾 Vérification de l'espace disque..."
    
    local usage=$(df /backups | tail -1 | awk '{print $5}' | sed 's/%//')
    local available=$(df -h /backups | tail -1 | awk '{print $4}')
    
    log "📊 Utilisation: ${usage}%, Disponible: ${available}"
    
    if [ "$usage" -gt 85 ]; then
        log "⚠️  Espace disque faible (${usage}%)"
        send_notification "warning" "Espace disque faible: ${usage}%"
    fi
    
    if [ "$usage" -gt 95 ]; then
        log "❌ Espace disque critique (${usage}%)"
        send_notification "error" "Espace disque critique: ${usage}%"
        return 1
    fi
    
    return 0
}

# Fonction principale
main() {
    local start_time=$(date +%s)
    
    # Configuration du gestionnaire de signal
    trap cleanup EXIT
    
    log "🚀 === Début du backup complet EcoDeli ==="
    log "📅 Date: $(date)"
    log "🗂️  Répertoire: /backups"
    
    # Vérifications initiales
    check_lock
    check_disk_space
    test_connectivity
    
    # Exécution des backups
    local backup_success=true
    
    # PostgreSQL (critique)
    if ! backup_postgresql; then
        backup_success=false
        log "❌ Backup PostgreSQL critique échoué"
    fi
    
    # Redis (important mais non critique)
    if ! backup_redis; then
        log "⚠️  Backup Redis échoué mais continuation"
    fi
    
    # Uploads (important)
    if ! backup_uploads; then
        log "⚠️  Backup uploads échoué mais continuation"
    fi
    
    # Logs (optionnel)
    if ! backup_logs; then
        log "⚠️  Backup logs échoué mais continuation"
    fi
    
    # Post-traitement
    generate_backup_report
    cleanup_old_backups
    
    # Résultat final
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$backup_success" = true ]; then
        log "🎉 Backup complet terminé avec succès en ${duration}s"
        exit 0
    else
        log "❌ Backup complet terminé avec des erreurs en ${duration}s"
        exit 1
    fi
}

# Gestion des arguments
case "${1:-}" in
    "--dry-run")
        log "🧪 Mode test - Simulation du backup"
        # Désactiver les vraies opérations
        ;;
    "--force")
        log "💪 Mode forcé - Ignorer le lock"
        rm -f "$LOCK_FILE"
        ;;
    "--help")
        echo "Usage: $0 [--dry-run|--force|--help]"
        echo ""
        echo "Options:"
        echo "  --dry-run    Simulation sans exécuter les backups"
        echo "  --force      Forcer l'exécution même si un lock existe"
        echo "  --help       Afficher cette aide"
        exit 0
        ;;
esac

# Lancement
main "$@"