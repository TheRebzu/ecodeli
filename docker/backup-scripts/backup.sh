#!/bin/sh
set -e

# Variables d'environnement avec valeurs par défaut
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_DB=${POSTGRES_DB:-ecodeli}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-0 0 * * *}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p $BACKUP_DIR

# Configuration du cron
echo "$BACKUP_SCHEDULE /bin/sh /scripts/run-backup.sh >> /scripts/backup.log 2>&1" > /etc/crontabs/root

# Créer le script de sauvegarde
cat > /scripts/run-backup.sh << EOL
#!/bin/sh
set -e

BACKUP_DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/ecodeli_\$BACKUP_DATE.sql.gz"

echo "[\$(date)] Démarrage de la sauvegarde \$BACKUP_FILE"

# Exécuter la sauvegarde 
export PGPASSWORD="\$POSTGRES_PASSWORD"
pg_dump -h \$POSTGRES_HOST -U \$POSTGRES_USER -d \$POSTGRES_DB | gzip > \$BACKUP_FILE

echo "[\$(date)] Sauvegarde \$BACKUP_FILE terminée avec succès"

# Nettoyer les anciennes sauvegardes
find \$BACKUP_DIR -name "ecodeli_*.sql.gz" -type f -mtime +\$BACKUP_RETENTION_DAYS -delete

echo "[\$(date)] Nettoyage des sauvegardes de plus de \$BACKUP_RETENTION_DAYS jours terminé"
EOL

# Rendre le script exécutable
chmod +x /scripts/run-backup.sh

# Exécuter une première sauvegarde immédiatement
echo "[$(date)] Exécution de la sauvegarde initiale..."
/bin/sh /scripts/run-backup.sh

# Démarrer cron en premier plan
echo "[$(date)] Démarrage du service cron..."
crond -f -l 8 