#!/bin/bash

# =============================================================================
# SCRIPT D'ENTRYPOINT NGINX
# =============================================================================

set -e

echo "🚀 === Démarrage Nginx EcoDeli ==="

# Variables d'environnement
SSL_ENABLED="${SSL_ENABLED:-true}"
DOMAIN_NAME="${DOMAIN_NAME:-localhost}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log "📋 Vérification des prérequis..."
    
    # Vérifier les répertoires
    for dir in /etc/nginx/ssl /var/log/nginx /var/cache/nginx /var/www/uploads; do
        if [ ! -d "$dir" ]; then
            log "📁 Création du répertoire: $dir"
            mkdir -p "$dir"
        fi
    done
    
    # Vérifier les permissions
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx
    
    log "✅ Prérequis vérifiés"
}

# Fonction de configuration SSL
setup_ssl() {
    if [ "$SSL_ENABLED" = "true" ]; then
        log "🔐 Configuration SSL activée"
        
        # Générer les certificats si nécessaire
        if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ]; then
            log "🔑 Génération des certificats SSL..."
            /usr/local/bin/generate-ssl.sh
        else
            log "✅ Certificats SSL déjà présents"
        fi
        
        # Vérifier la validité
        if ! openssl x509 -in /etc/nginx/ssl/cert.pem -noout -checkend 86400; then
            log "⚠️  Certificat expiré, régénération..."
            /usr/local/bin/generate-ssl.sh --force
        fi
    else
        log "ℹ️  SSL désactivé"
    fi
}

# Fonction de test de configuration
test_nginx_config() {
    log "🧪 Test de la configuration Nginx..."
    
    if nginx -t; then
        log "✅ Configuration Nginx valide"
    else
        log "❌ Erreur dans la configuration Nginx"
        exit 1
    fi
}

# Fonction de configuration des logs
setup_logging() {
    log "📝 Configuration des logs..."
    
    # Créer les fichiers de log s'ils n'existent pas
    touch /var/log/nginx/access.log
    touch /var/log/nginx/error.log
    touch /var/log/nginx/ecodeli_access.log
    touch /var/log/nginx/ecodeli_error.log
    
    # Permissions
    chown nginx:nginx /var/log/nginx/*.log
    
    # Configuration logrotate
    cat > /etc/logrotate.d/nginx << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF
    
    log "✅ Logs configurés"
}

# Fonction de configuration pour l'environnement
setup_environment() {
    log "⚙️  Configuration pour l'environnement: $ENVIRONMENT"
    
    case "$ENVIRONMENT" in
        "development")
            log "🔧 Mode développement activé"
            # Désactiver le cache pour le développement
            sed -i 's/proxy_cache_valid/#proxy_cache_valid/g' /etc/nginx/conf.d/*.conf
            ;;
        "staging")
            log "🔬 Mode staging activé"
            ;;
        "production")
            log "🏭 Mode production activé"
            # Configuration optimisée pour la production
            ;;
        *)
            log "⚠️  Environnement non reconnu: $ENVIRONMENT"
            ;;
    esac
}

# Fonction de monitoring
setup_monitoring() {
    log "📊 Configuration du monitoring..."
    
    # Créer un endpoint de health check personnalisé
    cat > /usr/share/nginx/html/health.json << EOF
{
    "status": "healthy",
    "timestamp": "$(date -Iseconds)",
    "version": "nginx/$(nginx -v 2>&1 | cut -d' ' -f3 | cut -d'/' -f2)",
    "environment": "$ENVIRONMENT",
    "ssl_enabled": $SSL_ENABLED
}
EOF
    
    log "✅ Monitoring configuré"
}

# Fonction de nettoyage au signal TERM
cleanup() {
    log "🛑 Arrêt en cours..."
    nginx -s quit
    log "✅ Nginx arrêté proprement"
}

# Fonction d'affichage des informations de démarrage
show_startup_info() {
    log "📋 === Informations de démarrage ==="
    log "🌐 Domaine: $DOMAIN_NAME"
    log "🔒 SSL: $SSL_ENABLED"
    log "🏷️  Environnement: $ENVIRONMENT"
    log "📁 Configuration: /etc/nginx/nginx.conf"
    log "📄 Logs: /var/log/nginx/"
    log "================================="
}

# Fonction principale
main() {
    # Configuration du gestionnaire de signal
    trap cleanup TERM INT
    
    # Démarrage
    check_prerequisites
    setup_ssl
    setup_logging
    setup_environment
    setup_monitoring
    test_nginx_config
    show_startup_info
    
    log "🎉 Nginx démarré avec succès!"
    
    # Lancement de nginx avec les arguments fournis
    exec "$@"
}

# Vérification si on est appelé directement
if [ "${1#-}" != "$1" ] || [ "${1%.conf}" != "$1" ] || [ "$1" = "nginx" ]; then
    main "$@"
else
    # Exécuter la commande directement si ce n'est pas nginx
    exec "$@"
fi