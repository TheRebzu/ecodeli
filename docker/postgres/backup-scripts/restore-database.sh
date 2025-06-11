#!/bin/bash

# =============================================================================
# SCRIPT DE RESTAURATION POSTGRESQL
# =============================================================================

set -e

# Configuration
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-ecodeli}"
DB_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backups}"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Fonction d'affichage de l'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS] BACKUP_FILE

Restaure une base de données PostgreSQL depuis un backup.

OPTIONS:
    -h, --help              Afficher cette aide
    -f, --force             Forcer la restauration (supprimer la base existante)
    -d, --database NAME     Nom de la base de données cible (défaut: $DB_NAME)
    -u, --user USER         Utilisateur PostgreSQL (défaut: $DB_USER)
    -H, --host HOST         Hôte PostgreSQL (défaut: $DB_HOST)
    -p, --port PORT         Port PostgreSQL (défaut: $DB_PORT)
    -t, --test              Mode test (restauration dans une base temporaire)
    -v, --verbose           Mode verbeux

EXAMPLES:
    $0 /backups/ecodeli_full_20240101_120000.sql.gz
    $0 --force --database ecodeli_test backup.sql.custom
    $0 --test latest.sql.gz

Variables d'environnement:
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER

EOF
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier la connexion à PostgreSQL
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
        log "❌ Impossible de se connecter à PostgreSQL"
        exit 1
    fi
    
    # Vérifier l'existence du fichier de backup
    if [ ! -f "$BACKUP_FILE" ]; then
        log "❌ Fichier de backup introuvable: $BACKUP_FILE"
        exit 1
    fi
    
    # Vérifier le type de fichier
    detect_backup_type
    
    log "✅ Prérequis vérifiés"
}

# Fonction de détection du type de backup
detect_backup_type() {
    log "🔍 Détection du type de backup..."
    
    if file "$BACKUP_FILE" | grep -q "gzip compressed"; then
        BACKUP_TYPE="gzip"
        log "📦 Type détecté: SQL compressé (gzip)"
    elif file "$BACKUP_FILE" | grep -q "PostgreSQL custom database dump"; then
        BACKUP_TYPE="custom"
        log "📦 Type détecté: Format custom PostgreSQL"
    elif file "$BACKUP_FILE" | grep -q "ASCII text"; then
        BACKUP_TYPE="sql"
        log "📦 Type détecté: SQL plain text"
    else
        log "❌ Type de fichier non reconnu"
        exit 1
    fi
}

# Fonction de sauvegarde de la base existante
backup_existing_database() {
    if [ "$FORCE_RESTORE" = "true" ]; then
        return 0
    fi
    
    # Vérifier si la base existe
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log "⚠️  Base de données existante détectée: $DB_NAME"
        
        if [ "$INTERACTIVE" = "true" ]; then
            read -p "Voulez-vous sauvegarder la base existante avant restauration? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                local backup_existing="/tmp/backup_before_restore_$(date +%Y%m%d_%H%M%S).sql"
                log "💾 Sauvegarde de la base existante..."
                
                pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_existing"
                log "✅ Base sauvegardée: $backup_existing"
            fi
        fi
    fi
}

# Fonction de création/recréation de la base
prepare_database() {
    log "🗃️  Préparation de la base de données..."
    
    if [ "$TEST_MODE" = "true" ]; then
        DB_NAME="${DB_NAME}_restore_test_$(date +%s)"
        log "🧪 Mode test: utilisation de la base $DB_NAME"
    fi
    
    # Supprimer la base si elle existe et si forcé
    if [ "$FORCE_RESTORE" = "true" ]; then
        log "🗑️  Suppression de la base existante..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
             -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" >/dev/null 2>&1 || true
    fi
    
    # Créer la base si elle n'existe pas
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log "🆕 Création de la base de données: $DB_NAME"
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
                 -E UTF8 -l fr_FR.utf8 -T template0 "$DB_NAME"
    fi
    
    log "✅ Base de données prête"
}

# Fonction de restauration
perform_restore() {
    log "📥 Début de la restauration..."
    local start_time=$(date +%s)
    
    case "$BACKUP_TYPE" in
        "gzip")
            log "📦 Restauration depuis fichier gzip..."
            if [ "$VERBOSE" = "true" ]; then
                gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
            else
                gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 >/dev/null
            fi
            ;;
        "custom")
            log "📦 Restauration depuis format custom..."
            local pg_restore_opts="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --no-owner --no-privileges"
            if [ "$VERBOSE" = "true" ]; then
                pg_restore_opts="$pg_restore_opts --verbose"
            fi
            pg_restore $pg_restore_opts "$BACKUP_FILE"
            ;;
        "sql")
            log "📦 Restauration depuis fichier SQL..."
            if [ "$VERBOSE" = "true" ]; then
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
            else
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE" >/dev/null
            fi
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "✅ Restauration terminée en ${duration}s"
}

# Fonction de vérification post-restauration
verify_restore() {
    log "🔍 Vérification de la restauration..."
    
    # Vérifier la connexion à la base
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\q" >/dev/null 2>&1; then
        log "❌ Impossible de se connecter à la base restaurée"
        return 1
    fi
    
    # Compter les tables
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t \
                       -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    
    log "📊 Tables restaurées: $table_count"
    
    # Vérifier quelques tables critiques (si elles existent)
    local critical_tables=("User" "Role" "Permission")
    for table in "${critical_tables[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t \
           -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q "t"; then
            local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t \
                         -c "SELECT count(*) FROM \"$table\";" | xargs)
            log "✅ Table $table: $count enregistrements"
        fi
    done
    
    log "✅ Vérification terminée"
}

# Fonction de nettoyage
cleanup() {
    if [ "$TEST_MODE" = "true" ] && [ -n "$DB_NAME" ]; then
        log "🧹 Nettoyage de la base de test..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
             -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" >/dev/null 2>&1 || true
    fi
}

# Fonction principale
main() {
    log "🚀 === Restauration EcoDeli PostgreSQL ==="
    log "📅 Date: $(date)"
    log "📁 Fichier: $BACKUP_FILE"
    log "🗃️  Base cible: $DB_NAME@$DB_HOST:$DB_PORT"
    
    check_prerequisites
    backup_existing_database
    prepare_database
    perform_restore
    verify_restore
    
    if [ "$TEST_MODE" = "true" ]; then
        log "🧪 Mode test - Base temporaire: $DB_NAME"
        log "⚠️  N'oubliez pas de nettoyer: DROP DATABASE \"$DB_NAME\";"
    else
        log "🎉 Restauration terminée avec succès!"
    fi
}

# Parsing des arguments
FORCE_RESTORE="false"
TEST_MODE="false"
VERBOSE="false"
INTERACTIVE="true"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE_RESTORE="true"
            INTERACTIVE="false"
            shift
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -H|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -t|--test)
            TEST_MODE="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -*)
            log "❌ Option inconnue: $1"
            show_help
            exit 1
            ;;
        *)
            if [ -z "$BACKUP_FILE" ]; then
                BACKUP_FILE="$1"
            else
                log "❌ Trop d'arguments"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Vérifier qu'un fichier de backup a été spécifié
if [ -z "$BACKUP_FILE" ]; then
    log "❌ Fichier de backup requis"
    show_help
    exit 1
fi

# Configuration du nettoyage en cas d'interruption
trap cleanup EXIT

# Lancement
main