#!/bin/bash
set -e

# Script d'entrypoint personnalisé pour PostgreSQL EcoDeli

# Si c'est la première fois, copier les configurations
if [ ! -f /var/lib/postgresql/data/postgresql.conf ]; then
    echo "Configuration initiale de PostgreSQL..."
fi

# Exécuter l'entrypoint original de PostgreSQL
exec docker-entrypoint.sh "$@"