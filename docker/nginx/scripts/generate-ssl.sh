#!/bin/bash

# =============================================================================
# SCRIPT DE GÉNÉRATION SSL AUTO-SIGNÉ
# Pour développement et test uniquement
# =============================================================================

set -e

SSL_DIR="/etc/nginx/ssl"
DOMAIN="${DOMAIN_NAME:-localhost}"

# Créer le répertoire SSL s'il n'existe pas
mkdir -p "$SSL_DIR"

# Fonction pour générer les paramètres DH
generate_dhparam() {
    echo "🔐 Génération des paramètres Diffie-Hellman..."
    if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
        echo "✅ Paramètres DH générés"
    else
        echo "✅ Paramètres DH déjà présents"
    fi
}

# Fonction pour générer le certificat auto-signé
generate_self_signed() {
    echo "🔐 Génération du certificat SSL auto-signé pour $DOMAIN..."
    
    # Configuration OpenSSL
    cat > "$SSL_DIR/openssl.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=FR
ST=Rhone-Alpes
L=Lyon
O=EcoDeli
OU=IT Department
CN=$DOMAIN

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = localhost
DNS.4 = *.ecodeli.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    # Générer la clé privée
    openssl genrsa -out "$SSL_DIR/key.pem" 2048
    
    # Générer le certificat
    openssl req -new -x509 -key "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -days 365 \
        -config "$SSL_DIR/openssl.conf" \
        -extensions v3_req
    
    # Nettoyer
    rm "$SSL_DIR/openssl.conf"
    
    echo "✅ Certificat SSL généré pour $DOMAIN"
}

# Fonction pour vérifier les certificats existants
check_existing_certs() {
    if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
        echo "🔍 Vérification des certificats existants..."
        
        # Vérifier la validité
        if openssl x509 -in "$SSL_DIR/cert.pem" -noout -checkend 86400; then
            echo "✅ Certificats existants valides"
            return 0
        else
            echo "⚠️  Certificats expirés, régénération nécessaire"
            return 1
        fi
    else
        echo "ℹ️  Aucun certificat trouvé"
        return 1
    fi
}

# Fonction pour afficher les informations du certificat
show_cert_info() {
    if [ -f "$SSL_DIR/cert.pem" ]; then
        echo "📋 Informations du certificat:"
        openssl x509 -in "$SSL_DIR/cert.pem" -noout -subject -dates
        echo ""
        echo "🔍 Alternative Names:"
        openssl x509 -in "$SSL_DIR/cert.pem" -noout -text | grep -A 1 "Subject Alternative Name" || echo "Aucun"
        echo ""
    fi
}

# Fonction pour définir les permissions correctes
set_permissions() {
    echo "🔒 Configuration des permissions..."
    chmod 600 "$SSL_DIR/key.pem" 2>/dev/null || true
    chmod 644 "$SSL_DIR/cert.pem" 2>/dev/null || true
    chmod 644 "$SSL_DIR/dhparam.pem" 2>/dev/null || true
    chown -R nginx:nginx "$SSL_DIR" 2>/dev/null || true
    echo "✅ Permissions configurées"
}

# Fonction principale
main() {
    echo "🚀 === Générateur SSL EcoDeli ==="
    echo "Domain: $DOMAIN"
    echo "SSL Directory: $SSL_DIR"
    echo ""
    
    # Vérifier si on doit générer/régénérer
    if ! check_existing_certs; then
        generate_self_signed
    fi
    
    # Toujours générer les paramètres DH
    generate_dhparam
    
    # Configurer les permissions
    set_permissions
    
    # Afficher les informations
    show_cert_info
    
    echo "🎉 Configuration SSL terminée!"
    echo ""
    echo "⚠️  ATTENTION: Certificat auto-signé pour développement uniquement!"
    echo "   Pour la production, utilisez un certificat valide (Let's Encrypt, etc.)"
    echo ""
}

# Gestion des arguments
case "${1:-}" in
    "--force")
        echo "🔄 Régénération forcée des certificats..."
        rm -f "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem"
        main
        ;;
    "--info")
        show_cert_info
        ;;
    "--help")
        echo "Usage: $0 [--force|--info|--help]"
        echo ""
        echo "Options:"
        echo "  --force    Régénère les certificats même s'ils existent"
        echo "  --info     Affiche les informations du certificat existant"
        echo "  --help     Affiche cette aide"
        echo ""
        echo "Variables d'environnement:"
        echo "  DOMAIN_NAME    Nom de domaine (défaut: localhost)"
        ;;
    *)
        main
        ;;
esac