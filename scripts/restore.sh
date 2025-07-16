#!/bin/bash

# Script de restauration de sauvegarde PostgreSQL pour EcoDeli
# Usage: ./scripts/restore.sh [BACKUP_FILE]

set -e

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ecodeli}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

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

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [BACKUP_FILE]"
    echo ""
    echo "Options:"
    echo "  BACKUP_FILE    Fichier de sauvegarde à restaurer"
    echo "                 Si non spécifié, utilise la sauvegarde la plus récente"
    echo ""
    echo "Variables d'environnement:"
    echo "  POSTGRES_HOST     Hôte PostgreSQL (défaut: postgres)"
    echo "  POSTGRES_PORT     Port PostgreSQL (défaut: 5432)"
    echo "  POSTGRES_DB       Base de données (défaut: ecodeli)"
    echo "  POSTGRES_USER     Utilisateur PostgreSQL (défaut: postgres)"
    echo "  BACKUP_DIR        Répertoire des sauvegardes (défaut: ./backups)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Restaure la sauvegarde la plus récente"
    echo "  $0 backups/ecodeli_backup_20240101_120000.sql.gz"
    echo "  POSTGRES_HOST=localhost $0           # Restaure sur localhost"
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    if ! command -v psql &> /dev/null; then
        error "psql n'est pas installé"
    fi
    
    if ! command -v pg_restore &> /dev/null; then
        error "pg_restore n'est pas installé"
    fi
    
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Répertoire de sauvegarde non trouvé: $BACKUP_DIR"
    fi
    
    log "Prérequis OK"
}

# Sélection du fichier de sauvegarde
select_backup_file() {
    if [ -n "$1" ]; then
        BACKUP_FILE="$1"
        if [ ! -f "$BACKUP_FILE" ]; then
            error "Fichier de sauvegarde non trouvé: $BACKUP_FILE"
        fi
    else
        # Sélection automatique du fichier le plus récent
        BACKUP_FILE=$(find "$BACKUP_DIR" -name "ecodeli_backup_*.sql.gz" -type f | sort -r | head -n 1)
        if [ -z "$BACKUP_FILE" ]; then
            error "Aucun fichier de sauvegarde trouvé dans $BACKUP_DIR"
        fi
        log "Fichier de sauvegarde sélectionné automatiquement: $BACKUP_FILE"
    fi
}

# Vérification de la connexion à la base de données
check_database_connection() {
    log "Vérification de la connexion à la base de données..."
    
    if ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; then
        error "Impossible de se connecter à la base de données"
    fi
    
    log "Connexion à la base de données OK"
}

# Vérification de l'intégrité du fichier de sauvegarde
verify_backup_integrity() {
    log "Vérification de l'intégrité du fichier de sauvegarde..."
    
    if ! gunzip -t "$BACKUP_FILE" > /dev/null 2>&1; then
        error "Fichier de sauvegarde corrompu: $BACKUP_FILE"
    fi
    
    local file_size=$(stat -c%s "$BACKUP_FILE")
    local file_size_mb=$((file_size / 1024 / 1024))
    
    log "Intégrité du fichier OK ($file_size_mb MB)"
}

# Création d'une sauvegarde de sécurité
create_safety_backup() {
    log "Création d'une sauvegarde de sécurité avant restauration..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local safety_backup="$BACKUP_DIR/safety_backup_$timestamp.sql.gz"
    
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       --verbose --clean --no-owner --no-privileges --create 2>/dev/null | gzip > "$safety_backup"; then
        log "Sauvegarde de sécurité créée: $safety_backup"
    else
        warn "Impossible de créer la sauvegarde de sécurité"
    fi
}

# Arrêt des connexions actives
terminate_connections() {
    log "Arrêt des connexions actives à la base de données..."
    
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '$POSTGRES_DB'
        AND pid <> pg_backend_pid();
    " > /dev/null 2>&1 || true
    
    log "Connexions terminées"
}

# Restauration de la base de données
restore_database() {
    log "Démarrage de la restauration de la base de données..."
    
    # Décompression et restauration
    if gunzip -c "$BACKUP_FILE" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres > /dev/null 2>&1; then
        log "Restauration de la base de données terminée avec succès"
    else
        error "Échec de la restauration de la base de données"
    fi
}

# Restauration des fichiers uploadés
restore_uploads() {
    local uploads_backup_file="${BACKUP_FILE%.sql.gz}"
    uploads_backup_file="${uploads_backup_file/ecodeli_backup_/uploads_backup_}.tar.gz"
    
    if [ -f "$uploads_backup_file" ]; then
        log "Restauration des fichiers uploadés..."
        
        local uploads_dir="/app/uploads"
        mkdir -p "$uploads_dir"
        
        if tar -xzf "$uploads_backup_file" -C "$uploads_dir" > /dev/null 2>&1; then
            log "Restauration des uploads terminée: $uploads_backup_file"
        else
            warn "Échec de la restauration des fichiers uploadés"
        fi
    else
        log "Aucun fichier d'uploads à restaurer"
    fi
}

# Vérification de la restauration
verify_restoration() {
    log "Vérification de la restauration..."
    
    # Vérification de la connexion
    if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Impossible de se connecter à la base de données restaurée"
    fi
    
    # Vérification des tables principales
    local table_count=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | xargs)
    
    if [ "$table_count" -gt 0 ]; then
        log "Restauration vérifiée avec succès ($table_count tables trouvées)"
    else
        error "Aucune table trouvée après restauration"
    fi
}

# Confirmation de l'utilisateur
confirm_restoration() {
    echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va écraser la base de données existante!${NC}"
    echo "Base de données cible: $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
    echo "Fichier de sauvegarde: $BACKUP_FILE"
    echo ""
    read -p "Êtes-vous sûr de vouloir continuer? (yes/no): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restauration annulée par l'utilisateur"
        exit 0
    fi
}

# Fonction principale
main() {
    if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        exit 0
    fi
    
    log "🔄 Démarrage de la restauration EcoDeli"
    
    check_prerequisites
    select_backup_file "$1"
    verify_backup_integrity
    check_database_connection
    
    # Demande de confirmation en mode interactif
    if [ -t 0 ]; then
        confirm_restoration
    fi
    
    create_safety_backup
    terminate_connections
    restore_database
    restore_uploads
    verify_restoration
    
    log "✅ Restauration terminée avec succès"
    log "📊 Base de données restaurée depuis: $BACKUP_FILE"
}

# Exécution
main "$@"