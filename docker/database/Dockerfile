# =============================================================================
# DOCKERFILE POUR POSTGRESQL AVEC OPTIMISATIONS ECODELI
# =============================================================================

FROM postgres:15-alpine

# Métadonnées
LABEL maintainer="EcoDeli Team"
LABEL description="Base de données PostgreSQL optimisée pour EcoDeli"
LABEL version="2.0.0"

# Installation des extensions et outils
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-contrib

# Variables d'environnement par défaut
ENV POSTGRES_DB=ecodeli
ENV POSTGRES_USER=ecodeli
ENV POSTGRES_PASSWORD=ecodeli_secure_password
ENV PGDATA=/var/lib/postgresql/data/pgdata

# Copie des scripts d'initialisation
COPY init/ /docker-entrypoint-initdb.d/

# Copie de la configuration PostgreSQL optimisée
COPY postgresql.conf /usr/local/share/postgresql/postgresql.conf.sample
COPY pg_hba.conf /usr/local/share/postgresql/pg_hba.conf.sample

# Création des répertoires pour les backups
RUN mkdir -p /var/lib/postgresql/backups && \
    chown -R postgres:postgres /var/lib/postgresql/backups

# Script de backup
COPY backup/ /opt/backup/
RUN chmod +x /opt/backup/*.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Exposition du port
EXPOSE 5432

# Point d'entrée personnalisé
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]