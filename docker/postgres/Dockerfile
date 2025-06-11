# =============================================================================
# POSTGRESQL DATABASE - DOCKERFILE PRODUCTION
# =============================================================================

FROM postgres:16-alpine

# Installation des outils nécessaires
RUN apk add --no-cache \
    postgresql-contrib \
    curl \
    tzdata \
    pg_cron

# Configuration du timezone
ENV TZ=Europe/Paris
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Configuration PostgreSQL optimisée
COPY postgresql.conf /etc/postgresql/postgresql.conf
COPY pg_hba.conf /etc/postgresql/pg_hba.conf

# Scripts d'initialisation
COPY init-scripts/ /docker-entrypoint-initdb.d/

# Scripts de backup et maintenance
COPY backup-scripts/ /usr/local/bin/backup/
RUN chmod +x /usr/local/bin/backup/*.sh

# Configuration des répertoires
RUN mkdir -p /var/lib/postgresql/backups \
    && mkdir -p /var/lib/postgresql/archives \
    && mkdir -p /var/log/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql/backups \
    && chown -R postgres:postgres /var/lib/postgresql/archives \
    && chown -R postgres:postgres /var/log/postgresql

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-ecodeli} || exit 1

EXPOSE 5432

# Utilisation du script d'entrypoint par défaut de PostgreSQL
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]