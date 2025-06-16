#!/bin/bash
# Script de backup basique pour PostgreSQL
echo "Backup de la base de données EcoDeli..."
pg_dump -h localhost -U $POSTGRES_USER $POSTGRES_DB > /backups/ecodeli-$(date +%Y%m%d_%H%M%S).sql
echo "Backup terminé"