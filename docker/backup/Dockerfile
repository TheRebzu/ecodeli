# =============================================================================
# DOCKERFILE POUR LE SERVICE DE BACKUP AUTOMATISÉ
# =============================================================================

FROM alpine:3.18

# Installation des outils nécessaires
RUN apk add --no-cache \
    # Outils de base
    bash \
    curl \
    wget \
    rsync \
    # Base de données
    postgresql-client \
    redis \
    # Compression
    gzip \
    tar \
    xz \
    # Monitoring
    prometheus-node-exporter \
    # Réseau
    openssh-client \
    # Timezone
    tzdata \
    # Cron
    dcron \
    # Outils système
    procps \
    htop

# Configuration du timezone
ENV TZ=Europe/Paris
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Création de l'utilisateur backup
RUN addgroup -g 1001 backup && \
    adduser -u 1001 -G backup -s /bin/bash -D backup

# Création des répertoires
RUN mkdir -p /app/scripts \
    /app/config \
    /app/logs \
    /backups/postgresql \
    /backups/redis \
    /backups/uploads \
    /backups/logs \
    /archives

# Copie des scripts de backup
COPY scripts/ /app/scripts/
COPY config/ /app/config/
COPY crontab /etc/crontabs/backup

# Configuration des permissions
RUN chmod +x /app/scripts/*.sh && \
    chown -R backup:backup /app /backups /archives && \
    chmod 600 /etc/crontabs/backup

# Configuration du script d'entrypoint
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Variables d'environnement
ENV BACKUP_SCHEDULE_DAILY="0 23 * * *"
ENV BACKUP_SCHEDULE_MONTHLY="0 2 30 * *"
ENV RETENTION_DAYS=30
ENV RETENTION_MONTHLY=12
ENV COMPRESSION_LEVEL=9

# Exposition du port pour monitoring
EXPOSE 9100

# Health check
HEALTHCHECK --interval=300s --timeout=30s --start-period=60s --retries=3 \
    CMD /app/scripts/health-check.sh

# Changement vers l'utilisateur backup
USER backup

WORKDIR /app

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["crond", "-f", "-l", "2"]