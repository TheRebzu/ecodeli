# =============================================================================
# DOCKERFILE POUR BACKUP AUTOMATIQUE ECODELI
# =============================================================================

FROM alpine:latest

# Métadonnées
LABEL maintainer="EcoDeli Team"
LABEL description="Service de backup automatique pour EcoDeli"
LABEL version="2.0.0"

# Installation des outils nécessaires
RUN apk add --no-cache \
    postgresql-client \
    bash \
    curl \
    tar \
    gzip \
    cronie \
    tzdata

# Configuration du timezone
ENV TZ=Europe/Paris
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copie des scripts de backup
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Configuration de cron
COPY crontab /etc/crontabs/root
RUN chmod 0644 /etc/crontabs/root

# Création des répertoires de backup
RUN mkdir -p /backups/{database,uploads,archives} && \
    chmod 755 /backups/*

# Health check
HEALTHCHECK --interval=300s --timeout=30s --start-period=60s --retries=3 \
    CMD ./scripts/backup-health-check.sh || exit 1

# Point d'entrée
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["crond", "-f", "-l", "2"]