#!/bin/bash

# Script de sauvegarde automatique PostgreSQL pour EcoDeli
# Exécuté automatiquement par le service backup du docker-compose

set -e

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ecodeli}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    exit 1
}

# Création du répertoire de sauvegarde
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "Répertoire de sauvegarde créé: $BACKUP_DIR"
    fi
}

# Vérification de la connexion à la base de données
check_database_connection() {
    log "Vérification de la connexion à la base de données..."
    
    if ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        error "Impossible de se connecter à la base de données"
    fi
    
    log "Connexion à la base de données OK"
}

# Sauvegarde de la base de données
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/ecodeli_backup_$timestamp.sql"
    local compressed_file="$backup_file.gz"
    
    log "Démarrage de la sauvegarde: $backup_file"
    
    # Sauvegarde avec pg_dump
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       --verbose --clean --no-owner --no-privileges --create > "$backup_file" 2>/dev/null; then
        
        # Compression de la sauvegarde
        gzip "$backup_file"
        
        # Vérification de la taille du fichier
        local file_size=$(stat -c%s "$compressed_file")
        local file_size_mb=$((file_size / 1024 / 1024))
        
        log "Sauvegarde terminée avec succès: $compressed_file ($file_size_mb MB)"
        
        # Vérification de l'intégrité
        if gunzip -t "$compressed_file" > /dev/null 2>&1; then
            log "Vérification de l'intégrité OK"
        else
            error "Erreur d'intégrité du fichier de sauvegarde"
        fi
        
    else
        error "Échec de la sauvegarde de la base de données"
    fi
}

# Sauvegarde des fichiers uploadés
backup_uploads() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local uploads_backup="$BACKUP_DIR/uploads_backup_$timestamp.tar.gz"
    local uploads_dir="/app/uploads"
    
    if [ -d "$uploads_dir" ] && [ "$(ls -A $uploads_dir)" ]; then
        log "Sauvegarde des fichiers uploadés..."
        
        if tar -czf "$uploads_backup" -C "$uploads_dir" . > /dev/null 2>&1; then
            local file_size=$(stat -c%s "$uploads_backup")
            local file_size_mb=$((file_size / 1024 / 1024))
            log "Sauvegarde des uploads terminée: $uploads_backup ($file_size_mb MB)"
        else
            warn "Échec de la sauvegarde des fichiers uploadés"
        fi
    else
        log "Aucun fichier à sauvegarder dans $uploads_dir"
    fi
}

# Nettoyage des anciennes sauvegardes
cleanup_old_backups() {
    log "Nettoyage des sauvegardes anciennes (> $RETENTION_DAYS jours)..."
    
    # Suppression des anciennes sauvegardes de base de données
    find "$BACKUP_DIR" -name "ecodeli_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Suppression des anciennes sauvegardes d'uploads
    find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Comptage des fichiers restants
    local db_count=$(find "$BACKUP_DIR" -name "ecodeli_backup_*.sql.gz" | wc -l)
    local uploads_count=$(find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" | wc -l)
    
    log "Nettoyage terminé ($db_count sauvegardes DB, $uploads_count sauvegardes uploads)"
}

# Génération d'un rapport de sauvegarde
generate_backup_report() {
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d).log"
    
    {
        echo "=== RAPPORT DE SAUVEGARDE ECODELI ==="
        echo "Date: $(date)"
        echo "Serveur: $(hostname)"
        echo "Base de données: $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
        echo ""
        echo "=== FICHIERS DE SAUVEGARDE ==="
        ls -lh "$BACKUP_DIR"/ecodeli_backup_*.sql.gz 2>/dev/null || echo "Aucune sauvegarde DB"
        echo ""
        ls -lh "$BACKUP_DIR"/uploads_backup_*.tar.gz 2>/dev/null || echo "Aucune sauvegarde uploads"
        echo ""
        echo "=== ESPACE DISQUE ==="
        df -h "$BACKUP_DIR"
        echo ""
        echo "=== STATISTIQUES ==="
        echo "Nombre total de sauvegardes DB: $(find "$BACKUP_DIR" -name "ecodeli_backup_*.sql.gz" | wc -l)"
        echo "Nombre total de sauvegardes uploads: $(find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" | wc -l)"
        echo "Espace utilisé: $(du -sh "$BACKUP_DIR" | cut -f1)"
    } > "$report_file"
    
    log "Rapport de sauvegarde généré: $report_file"
}

# Fonction principale
main() {
    log "🔄 Démarrage de la sauvegarde automatique EcoDeli"
    
    create_backup_dir
    check_database_connection
    backup_database
    backup_uploads
    cleanup_old_backups
    generate_backup_report
    
    log "✅ Sauvegarde automatique terminée avec succès"
}

# Exécution
main "$@"