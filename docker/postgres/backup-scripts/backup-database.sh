#!/bin/bash

# =============================================================================
# SCRIPT DE BACKUP AUTOMATISÉ POSTGRESQL
# =============================================================================

set -e

# Configuration
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-ecodeli}"
DB_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backups}"
ARCHIVE_DIR="${ARCHIVE_DIR:-/var/lib/postgresql/archives}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-12}"

# Variables de date
DATE=$(date +%Y%m%d_%H%M%S)
MONTH=$(date +%Y%m)
DAY=$(date +%d)

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/backup.log"
}

# Fonction de nettoyage en cas d'erreur
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log "❌ Erreur lors du backup (code: $exit_code)"
        # Nettoyer les fichiers temporaires
        rm -f "$BACKUP_DIR/tmp_*" 2>/dev/null || true
    fi
    exit $exit_code
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier les répertoires
    mkdir -p "$BACKUP_DIR" "$ARCHIVE_DIR"
    
    # Vérifier la connexion à la base
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        log "❌ Impossible de se connecter à la base de données"
        exit 1
    fi
    
    # Vérifier l'espace disque (minimum 1GB)
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then
        log "⚠️  Espace disque faible: $(echo "$available_space" | awk '{print $1/1024 " MB"}')"
    fi
    
    log "✅ Prérequis vérifiés"
}

# Fonction de backup complet
perform_full_backup() {
    local backup_file="$BACKUP_DIR/ecodeli_full_$DATE.sql"
    local compressed_file="$BACKUP_DIR/ecodeli_full_$DATE.sql.gz"
    
    log "📦 Début du backup complet..."
    
    # Dump de la base avec options optimisées
    if pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --exclude-table-data='audit_logs' \
        --exclude-table-data='system_logs' \
        -f "$backup_file.custom"; then
        
        # Également créer un dump SQL pour la lisibilité
        pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --no-password \
            --no-owner \
            --no-privileges \
            --exclude-table-data='audit_logs' \
            --exclude-table-data='system_logs' > "$backup_file"
        
        # Compression du fichier SQL
        gzip "$backup_file"
        
        log "✅ Backup complet terminé: $(basename "$compressed_file")"
        
        # Calcul et affichage de la taille
        local size=$(ls -lh "$compressed_file" | awk '{print $5}')
        log "📊 Taille du backup: $size"
        
        return 0
    else
        log "❌ Échec du backup complet"
        return 1
    fi
}

# Fonction de backup incrémental (WAL)
perform_incremental_backup() {
    log "📈 Archivage des WAL files..."
    
    # Forcer un checkpoint pour s'assurer que les WAL sont créés
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CHECKPOINT;" >/dev/null 2>&1
    
    # Copier les fichiers WAL archivés
    if [ -d "$ARCHIVE_DIR" ] && [ "$(ls -A "$ARCHIVE_DIR" 2>/dev/null)" ]; then
        local wal_backup_dir="$BACKUP_DIR/wal_$DATE"
        mkdir -p "$wal_backup_dir"
        
        # Copier et compresser les WAL
        find "$ARCHIVE_DIR" -name "*.backup" -o -name "[0-9A-F]*" | while read -r wal_file; do
            if [ -f "$wal_file" ]; then
                gzip -c "$wal_file" > "$wal_backup_dir/$(basename "$wal_file").gz"
            fi
        done
        
        log "✅ Archivage WAL terminé"
    else
        log "ℹ️  Aucun fichier WAL à archiver"
    fi
}

# Fonction de backup des métadonnées
backup_metadata() {
    local metadata_file="$BACKUP_DIR/metadata_$DATE.json"
    
    log "📋 Sauvegarde des métadonnées..."
    
    cat > "$metadata_file" << EOF
{
    "backup_date": "$(date -Iseconds)",
    "database_name": "$DB_NAME",
    "database_host": "$DB_HOST",
    "database_port": "$DB_PORT",
    "backup_type": "full",
    "retention_days": $RETENTION_DAYS,
    "database_size": "$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)",
    "table_count": $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs),
    "postgresql_version": "$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | xargs)"
}
EOF
    
    log "✅ Métadonnées sauvegardées: $(basename "$metadata_file")"
}

# Fonction de nettoyage des anciens backups
cleanup_old_backups() {
    log "🧹 Nettoyage des anciens backups..."
    
    # Nettoyage des backups quotidiens (plus de X jours)
    find "$BACKUP_DIR" -name "ecodeli_full_*.sql.gz" -mtime +$RETENTION_DAYS -type f -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "ecodeli_full_*.sql.custom" -mtime +$RETENTION_DAYS -type f -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "metadata_*.json" -mtime +$RETENTION_DAYS -type f -delete 2>/dev/null || true
    
    # Nettoyage des WAL (plus de 7 jours)
    find "$BACKUP_DIR" -name "wal_*" -mtime +7 -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Nettoyage des backups mensuels (garder X mois)
    find "$BACKUP_DIR" -name "ecodeli_monthly_*.sql.gz" -mtime +$((RETENTION_MONTHLY * 30)) -type f -delete 2>/dev/null || true
    
    log "✅ Nettoyage terminé"
}

# Fonction de backup mensuel (le 30 de chaque mois)
monthly_backup() {
    if [ "$DAY" = "30" ]; then
        log "📅 Backup mensuel détecté"
        
        local monthly_file="$BACKUP_DIR/ecodeli_monthly_$MONTH.sql.gz"
        local daily_file="$BACKUP_DIR/ecodeli_full_$DATE.sql.gz"
        
        if [ -f "$daily_file" ]; then
            cp "$daily_file" "$monthly_file"
            log "✅ Backup mensuel créé: $(basename "$monthly_file")"
        fi
    fi
}

# Fonction de vérification de l'intégrité
verify_backup() {
    local backup_file="$1"
    
    if [ -f "$backup_file" ]; then
        log "🔍 Vérification de l'intégrité: $(basename "$backup_file")"
        
        if file "$backup_file" | grep -q "gzip compressed"; then
            if gzip -t "$backup_file" 2>/dev/null; then
                log "✅ Intégrité vérifiée"
                return 0
            else
                log "❌ Fichier corrompu"
                return 1
            fi
        else
            log "✅ Fichier valide"
            return 0
        fi
    else
        log "❌ Fichier de backup introuvable"
        return 1
    fi
}

# Fonction d'envoi de notification (si configuré)
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}" \
             >/dev/null 2>&1 || true
    fi
}

# Fonction principale
main() {
    trap cleanup EXIT
    
    log "🚀 === Début du backup EcoDeli PostgreSQL ==="
    log "📅 Date: $(date)"
    log "🗃️  Base: $DB_NAME@$DB_HOST:$DB_PORT"
    log "📁 Répertoire: $BACKUP_DIR"
    
    # Démarrage
    local start_time=$(date +%s)
    
    check_prerequisites
    
    # Backup principal
    if perform_full_backup; then
        backup_metadata
        perform_incremental_backup
        
        # Vérification
        local backup_file="$BACKUP_DIR/ecodeli_full_$DATE.sql.gz"
        if verify_backup "$backup_file"; then
            monthly_backup
            cleanup_old_backups
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log "🎉 Backup terminé avec succès en ${duration}s"
            send_notification "success" "Backup PostgreSQL terminé avec succès"
        else
            log "❌ Échec de la vérification du backup"
            send_notification "error" "Échec de la vérification du backup"
            exit 1
        fi
    else
        log "❌ Échec du backup"
        send_notification "error" "Échec du backup PostgreSQL"
        exit 1
    fi
    
    log "=== Fin du backup ==="
}

# Gestion des arguments
case "${1:-}" in
    "--verify")
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            echo "Usage: $0 --verify <fichier_backup>"
            exit 1
        fi
        ;;
    "--cleanup")
        cleanup_old_backups
        ;;
    "--help")
        echo "Usage: $0 [--verify fichier|--cleanup|--help]"
        echo ""
        echo "Variables d'environnement:"
        echo "  POSTGRES_HOST              Hôte PostgreSQL (défaut: localhost)"
        echo "  POSTGRES_PORT              Port PostgreSQL (défaut: 5432)"
        echo "  POSTGRES_DB                Base de données (défaut: ecodeli)"
        echo "  POSTGRES_USER              Utilisateur (défaut: postgres)"
        echo "  BACKUP_DIR                 Répertoire des backups"
        echo "  BACKUP_RETENTION_DAYS      Rétention en jours (défaut: 30)"
        echo "  BACKUP_RETENTION_MONTHLY   Rétention mensuelle (défaut: 12)"
        echo "  NOTIFICATION_WEBHOOK       URL webhook pour notifications"
        ;;
    *)
        main
        ;;
esac