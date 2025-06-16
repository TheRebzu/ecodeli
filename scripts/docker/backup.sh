#!/bin/bash

# =============================================================================
# SCRIPT DE BACKUP POUR ECODELI
# =============================================================================

set -e

# Configuration
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Créer le répertoire de backup
create_backup_dir() {
    CURRENT_BACKUP_DIR="$BACKUP_DIR/$DATE"
    mkdir -p "$CURRENT_BACKUP_DIR"
    log "Répertoire de backup créé: $CURRENT_BACKUP_DIR"
}

# Backup de la base de données
backup_database() {
    log "Backup de la base de données..."
    
    if docker-compose ps | grep -q "ecodeli-db.*Up"; then
        # Mode développement
        docker-compose exec -T ecodeli-db pg_dump -U ecodeli -d ecodeli --clean --if-exists > "$CURRENT_BACKUP_DIR/database.sql"
    elif docker-compose -f docker-compose.prod.yml ps | grep -q "ecodeli-db-prod.*Up"; then
        # Mode production
        docker-compose -f docker-compose.prod.yml exec -T ecodeli-db pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists > "$CURRENT_BACKUP_DIR/database.sql"
    else
        error "Aucune base de données EcoDeli en cours d'exécution"
    fi
    
    # Compression du dump
    gzip "$CURRENT_BACKUP_DIR/database.sql"
    
    log "Backup de la base de données terminé: database.sql.gz"
}

# Backup des fichiers uploadés
backup_uploads() {
    log "Backup des fichiers uploadés..."
    
    # Vérifier quel conteneur est en cours d'exécution
    if docker-compose ps | grep -q "ecodeli-web.*Up"; then
        # Mode développement
        CONTAINER_NAME="ecodeli-web"
    elif docker-compose -f docker-compose.prod.yml ps | grep -q "ecodeli-web-prod.*Up"; then
        # Mode production
        CONTAINER_NAME="ecodeli-web-prod"
    else
        warn "Aucun conteneur web en cours d'exécution, skip du backup des uploads"
        return
    fi
    
    # Copier les uploads depuis le conteneur
    if docker exec $CONTAINER_NAME test -d /app/uploads 2>/dev/null; then
        docker cp $CONTAINER_NAME:/app/uploads "$CURRENT_BACKUP_DIR/"
        
        # Compression des uploads
        tar -czf "$CURRENT_BACKUP_DIR/uploads.tar.gz" -C "$CURRENT_BACKUP_DIR" uploads
        rm -rf "$CURRENT_BACKUP_DIR/uploads"
        
        log "Backup des uploads terminé: uploads.tar.gz"
    else
        warn "Répertoire uploads non trouvé dans le conteneur"
    fi
}

# Backup des configurations
backup_configs() {
    log "Backup des configurations..."
    
    # Copier les fichiers de configuration importants
    mkdir -p "$CURRENT_BACKUP_DIR/configs"
    
    # Docker configs
    cp docker-compose.yml "$CURRENT_BACKUP_DIR/configs/" 2>/dev/null || true
    cp docker-compose.prod.yml "$CURRENT_BACKUP_DIR/configs/" 2>/dev/null || true
    cp .env.docker "$CURRENT_BACKUP_DIR/configs/env.docker.backup" 2>/dev/null || true
    
    # Nginx configs
    if [ -d "docker/nginx" ]; then
        cp -r docker/nginx "$CURRENT_BACKUP_DIR/configs/" 2>/dev/null || true
    fi
    
    # Prisma schema
    if [ -f "prisma/schema.prisma" ]; then
        mkdir -p "$CURRENT_BACKUP_DIR/configs/prisma"
        cp prisma/schema.prisma "$CURRENT_BACKUP_DIR/configs/prisma/" 2>/dev/null || true
    fi
    
    log "Backup des configurations terminé"
}

# Backup des logs
backup_logs() {
    log "Backup des logs..."
    
    mkdir -p "$CURRENT_BACKUP_DIR/logs"
    
    # Logs Docker
    docker-compose logs --no-color > "$CURRENT_BACKUP_DIR/logs/docker-compose.log" 2>/dev/null || true
    
    # Logs Nginx si disponibles
    if docker volume ls | grep -q nginx_logs; then
        docker run --rm -v nginx_logs:/logs -v "$(pwd)/$CURRENT_BACKUP_DIR/logs":/backup alpine cp -r /logs /backup/nginx 2>/dev/null || true
    fi
    
    # Compression des logs
    if [ "$(ls -A $CURRENT_BACKUP_DIR/logs)" ]; then
        tar -czf "$CURRENT_BACKUP_DIR/logs.tar.gz" -C "$CURRENT_BACKUP_DIR" logs
        rm -rf "$CURRENT_BACKUP_DIR/logs"
        log "Backup des logs terminé: logs.tar.gz"
    else
        rmdir "$CURRENT_BACKUP_DIR/logs"
        warn "Aucun log à sauvegarder"
    fi
}

# Créer un manifeste du backup
create_manifest() {
    log "Création du manifeste de backup..."
    
    cat > "$CURRENT_BACKUP_DIR/manifest.txt" << EOF
EcoDeli Backup Manifest
======================

Date de création: $(date)
Version: 2.0.0
Type: ${BACKUP_TYPE:-manual}

Contenu du backup:
EOF

    if [ -f "$CURRENT_BACKUP_DIR/database.sql.gz" ]; then
        echo "- Base de données PostgreSQL (compressée)" >> "$CURRENT_BACKUP_DIR/manifest.txt"
        echo "  Taille: $(ls -lh $CURRENT_BACKUP_DIR/database.sql.gz | awk '{print $5}')" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    fi
    
    if [ -f "$CURRENT_BACKUP_DIR/uploads.tar.gz" ]; then
        echo "- Fichiers uploadés (compressés)" >> "$CURRENT_BACKUP_DIR/manifest.txt"
        echo "  Taille: $(ls -lh $CURRENT_BACKUP_DIR/uploads.tar.gz | awk '{print $5}')" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    fi
    
    if [ -d "$CURRENT_BACKUP_DIR/configs" ]; then
        echo "- Configurations Docker et application" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    fi
    
    if [ -f "$CURRENT_BACKUP_DIR/logs.tar.gz" ]; then
        echo "- Logs applicatifs (compressés)" >> "$CURRENT_BACKUP_DIR/manifest.txt"
        echo "  Taille: $(ls -lh $CURRENT_BACKUP_DIR/logs.tar.gz | awk '{print $5}')" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    fi
    
    echo "" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    echo "Commandes de restauration:" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    echo "- Base de données: gunzip -c database.sql.gz | docker-compose exec -T ecodeli-db psql -U ecodeli -d ecodeli" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    echo "- Uploads: tar -xzf uploads.tar.gz && docker cp uploads CONTAINER:/app/" >> "$CURRENT_BACKUP_DIR/manifest.txt"
    
    log "Manifeste créé: manifest.txt"
}

# Nettoyage des anciens backups
cleanup_old_backups() {
    log "Nettoyage des anciens backups (> $RETENTION_DAYS jours)..."
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
        
        REMAINING=$(find "$BACKUP_DIR" -type d -name "20*" | wc -l)
        log "Backups restants: $REMAINING"
    fi
}

# Afficher la taille du backup
show_backup_size() {
    BACKUP_SIZE=$(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)
    log "Taille du backup: $BACKUP_SIZE"
    log "Emplacement: $CURRENT_BACKUP_DIR"
}

# Backup complet
full_backup() {
    log "Démarrage du backup complet EcoDeli..."
    
    create_backup_dir
    backup_database
    backup_uploads
    backup_configs
    backup_logs
    create_manifest
    show_backup_size
    cleanup_old_backups
    
    log "Backup complet terminé avec succès!"
}

# Backup rapide (seulement DB)
quick_backup() {
    log "Démarrage du backup rapide (base de données uniquement)..."
    
    BACKUP_TYPE="quick"
    create_backup_dir
    backup_database
    create_manifest
    show_backup_size
    
    log "Backup rapide terminé avec succès!"
}

# Lister les backups disponibles
list_backups() {
    log "Backups disponibles:"
    
    if [ -d "$BACKUP_DIR" ]; then
        for backup in $(find "$BACKUP_DIR" -type d -name "20*" | sort -r); do
            backup_name=$(basename "$backup")
            backup_size=$(du -sh "$backup" | cut -f1)
            echo "  $backup_name ($backup_size)"
            
            if [ -f "$backup/manifest.txt" ]; then
                backup_type=$(grep "Type:" "$backup/manifest.txt" | cut -d: -f2 | xargs)
                echo "    Type: $backup_type"
            fi
        done
    else
        warn "Aucun backup trouvé"
    fi
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  full               Backup complet (DB + uploads + configs + logs)"
    echo "  quick              Backup rapide (base de données uniquement)"
    echo "  list               Lister les backups disponibles"
    echo "  cleanup            Nettoyer les anciens backups"
    echo "  help               Afficher cette aide"
    echo ""
    echo "Variables d'environnement:"
    echo "  RETENTION_DAYS     Nombre de jours de rétention (défaut: 30)"
    echo "  BACKUP_DIR         Répertoire de backup (défaut: backups)"
    echo ""
}

# Script principal
main() {
    case "${1:-full}" in
        "full")
            full_backup
            ;;
        "quick")
            quick_backup
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
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