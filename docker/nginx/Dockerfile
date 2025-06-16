# =============================================================================
# DOCKERFILE POUR NGINX REVERSE PROXY ECODELI
# =============================================================================

FROM nginx:alpine

# Métadonnées
LABEL maintainer="EcoDeli Team"
LABEL description="Nginx reverse proxy avec SSL pour EcoDeli"
LABEL version="2.0.0"

# Installation des outils nécessaires
RUN apk add --no-cache \
    curl \
    openssl \
    certbot \
    certbot-nginx \
    bash

# Création des répertoires
RUN mkdir -p /var/www/certbot \
    /etc/nginx/ssl \
    /var/log/nginx \
    /etc/nginx/sites-available \
    /etc/nginx/sites-enabled

# Copie des configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY sites/ /etc/nginx/sites-available/
COPY ssl/ /etc/nginx/ssl/

# Activation des sites
RUN ln -sf /etc/nginx/sites-available/ecodeli.conf /etc/nginx/sites-enabled/

# Script de génération de certificats SSL auto-signés pour le développement
COPY generate-ssl.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/generate-ssl.sh

# Script d'entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Exposition des ports
EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]