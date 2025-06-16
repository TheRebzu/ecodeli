#!/bin/bash
set -e

# Générer les certificats SSL auto-signés pour le développement
if [ ! -f /etc/nginx/ssl/ecodeli.crt ]; then
    echo "Génération des certificats SSL pour le développement..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/ecodeli.key \
        -out /etc/nginx/ssl/ecodeli.crt \
        -subj "/C=FR/ST=Paris/L=Paris/O=EcoDeli/CN=ecodeli.local"
fi

# Test de la configuration Nginx
nginx -t

# Démarrer Nginx
exec "$@"