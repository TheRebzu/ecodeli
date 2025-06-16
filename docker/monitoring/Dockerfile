# =============================================================================
# DOCKERFILE POUR MONITORING ECODELI
# =============================================================================

FROM node:20-alpine

# Métadonnées
LABEL maintainer="EcoDeli Team"
LABEL description="Service de monitoring et health check pour EcoDeli"
LABEL version="2.0.0"

# Installation des outils nécessaires
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-client \
    jq

WORKDIR /app

# Copie des scripts de monitoring
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Installation des dépendances Node.js pour les notifications
COPY package.json ./
RUN npm install --production

# Création d'un utilisateur non-root
RUN addgroup -g 1001 -S monitoring && \
    adduser -S -D -H -u 1001 -s /sbin/nologin monitoring

# Configuration des permissions
RUN chown -R monitoring:monitoring /app

USER monitoring

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
    CMD ./scripts/self-check.sh || exit 1

# Commande de démarrage
CMD ["./scripts/monitor.sh"]