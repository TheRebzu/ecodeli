#!/bin/bash

# Script de notification pour EcoDeli CI/CD
# Usage: ./scripts/notify.sh [TYPE] [STATUS] [MESSAGE]

set -e

# Configuration
NOTIFICATION_TYPE=${1:-deployment}
STATUS=${2:-success}
MESSAGE=${3:-"EcoDeli notification"}
ENVIRONMENT=${ENVIRONMENT:-dev}
VERSION=${VERSION:-latest}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Notification Slack
send_slack_notification() {
    local webhook_url="$1"
    local payload="$2"
    
    if [ -z "$webhook_url" ]; then
        warn "SLACK_WEBHOOK_URL non configuré"
        return 1
    fi
    
    local response=$(curl -X POST "$webhook_url" \
         -H "Content-Type: application/json" \
         -d "$payload" \
         -w "%{http_code}" \
         -s -o /dev/null)
    
    if [ "$response" = "200" ]; then
        log "✅ Notification Slack envoyée"
    else
        error "❌ Échec envoi Slack (HTTP $response)"
    fi
}

# Notification Discord
send_discord_notification() {
    local webhook_url="$1"
    local payload="$2"
    
    if [ -z "$webhook_url" ]; then
        warn "DISCORD_WEBHOOK_URL non configuré"
        return 1
    fi
    
    local response=$(curl -X POST "$webhook_url" \
         -H "Content-Type: application/json" \
         -d "$payload" \
         -w "%{http_code}" \
         -s -o /dev/null)
    
    if [ "$response" = "204" ]; then
        log "✅ Notification Discord envoyée"
    else
        error "❌ Échec envoi Discord (HTTP $response)"
    fi
}

# Notification email
send_email_notification() {
    local to="$1"
    local subject="$2"
    local body="$3"
    
    if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASSWORD" ]; then
        warn "Configuration SMTP incomplète"
        return 1
    fi
    
    # Utiliser sendmail ou curl pour envoyer l'email
    if command -v sendmail &> /dev/null; then
        {
            echo "To: $to"
            echo "Subject: $subject"
            echo "Content-Type: text/html"
            echo ""
            echo "$body"
        } | sendmail "$to"
        log "✅ Email envoyé via sendmail"
    else
        # Utiliser curl avec SMTP
        local temp_file=$(mktemp)
        cat > "$temp_file" << EOF
To: $to
Subject: $subject
Content-Type: text/html

$body
EOF
        
        curl --url "smtp://${SMTP_HOST}:${SMTP_PORT:-587}" \
             --ssl-reqd \
             --mail-from "$SMTP_USER" \
             --mail-rcpt "$to" \
             --upload-file "$temp_file" \
             --user "${SMTP_USER}:${SMTP_PASSWORD}" \
             -s > /dev/null
        
        rm -f "$temp_file"
        log "✅ Email envoyé via SMTP"
    fi
}

# Notification Microsoft Teams
send_teams_notification() {
    local webhook_url="$1"
    local payload="$2"
    
    if [ -z "$webhook_url" ]; then
        warn "TEAMS_WEBHOOK_URL non configuré"
        return 1
    fi
    
    local response=$(curl -X POST "$webhook_url" \
         -H "Content-Type: application/json" \
         -d "$payload" \
         -w "%{http_code}" \
         -s -o /dev/null)
    
    if [ "$response" = "200" ]; then
        log "✅ Notification Teams envoyée"
    else
        error "❌ Échec envoi Teams (HTTP $response)"
    fi
}

# Notification de déploiement
notify_deployment() {
    local status="$1"
    local message="$2"
    
    # Couleur et emoji selon le statut
    local color=""
    local emoji=""
    case "$status" in
        success)
            color="good"
            emoji="🚀"
            ;;
        failure)
            color="danger"
            emoji="💥"
            ;;
        warning)
            color="warning"
            emoji="⚠️"
            ;;
        *)
            color="good"
            emoji="ℹ️"
            ;;
    esac
    
    # Payload Slack
    local slack_payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "pretext": "$emoji *EcoDeli Deployment*",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Version",
                    "value": "$VERSION",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
                    "short": true
                }
            ],
            "text": "$message",
            "footer": "EcoDeli CI/CD",
            "footer_icon": "https://ecodeli.me/favicon.ico"
        }
    ]
}
EOF
)
    
    # Payload Discord
    local discord_payload=$(cat << EOF
{
    "embeds": [
        {
            "title": "$emoji EcoDeli Deployment",
            "description": "$message",
            "color": $([ "$status" = "success" ] && echo "3066993" || echo "15158332"),
            "fields": [
                {
                    "name": "Environment",
                    "value": "$ENVIRONMENT",
                    "inline": true
                },
                {
                    "name": "Version",
                    "value": "$VERSION",
                    "inline": true
                },
                {
                    "name": "Status",
                    "value": "$status",
                    "inline": true
                }
            ],
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "footer": {
                "text": "EcoDeli CI/CD"
            }
        }
    ]
}
EOF
)
    
    # Payload Teams
    local teams_payload=$(cat << EOF
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "summary": "EcoDeli Deployment",
    "themeColor": "$([ "$status" = "success" ] && echo "2eb886" || echo "d63333")",
    "sections": [
        {
            "activityTitle": "$emoji EcoDeli Deployment",
            "activitySubtitle": "$message",
            "facts": [
                {
                    "name": "Environment",
                    "value": "$ENVIRONMENT"
                },
                {
                    "name": "Version",
                    "value": "$VERSION"
                },
                {
                    "name": "Status",
                    "value": "$status"
                },
                {
                    "name": "Timestamp",
                    "value": "$(date)"
                }
            ]
        }
    ]
}
EOF
)
    
    # Email HTML
    local email_body=$(cat << EOF
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background-color: $([ "$status" = "success" ] && echo "#2eb886" || echo "#d63333"); color: white; padding: 20px; }
        .content { padding: 20px; }
        .info { background-color: #f5f5f5; padding: 15px; margin: 10px 0; }
        .footer { background-color: #f8f9fa; padding: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2>$emoji EcoDeli Deployment</h2>
    </div>
    <div class="content">
        <p>$message</p>
        <div class="info">
            <strong>Environment:</strong> $ENVIRONMENT<br>
            <strong>Version:</strong> $VERSION<br>
            <strong>Status:</strong> $status<br>
            <strong>Timestamp:</strong> $(date)
        </div>
    </div>
    <div class="footer">
        <p>EcoDeli CI/CD System</p>
    </div>
</body>
</html>
EOF
)
    
    # Envoi des notifications
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        send_slack_notification "$SLACK_WEBHOOK_URL" "$slack_payload"
    fi
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        send_discord_notification "$DISCORD_WEBHOOK_URL" "$discord_payload"
    fi
    
    if [ -n "$TEAMS_WEBHOOK_URL" ]; then
        send_teams_notification "$TEAMS_WEBHOOK_URL" "$teams_payload"
    fi
    
    if [ -n "$EMAIL_RECIPIENTS" ]; then
        local subject="EcoDeli Deployment - $ENVIRONMENT ($status)"
        for recipient in $(echo $EMAIL_RECIPIENTS | tr "," " "); do
            send_email_notification "$recipient" "$subject" "$email_body"
        done
    fi
}

# Notification de build
notify_build() {
    local status="$1"
    local message="$2"
    local build_number="${BUILD_NUMBER:-unknown}"
    local branch="${GIT_BRANCH:-unknown}"
    
    # Couleur et emoji selon le statut
    local color=""
    local emoji=""
    case "$status" in
        success)
            color="good"
            emoji="✅"
            ;;
        failure)
            color="danger"
            emoji="❌"
            ;;
        warning)
            color="warning"
            emoji="⚠️"
            ;;
        *)
            color="good"
            emoji="🔧"
            ;;
    esac
    
    # Payload Slack simplifié pour les builds
    local slack_payload=$(cat << EOF
{
    "text": "$emoji *EcoDeli Build #$build_number* ($branch) - $status",
    "attachments": [
        {
            "color": "$color",
            "text": "$message",
            "footer": "EcoDeli CI/CD"
        }
    ]
}
EOF
)
    
    # Envoi uniquement à Slack pour les builds (éviter le spam)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        send_slack_notification "$SLACK_WEBHOOK_URL" "$slack_payload"
    fi
}

# Notification de test
notify_test() {
    local status="$1"
    local message="$2"
    local test_type="${TEST_TYPE:-unit}"
    
    # Couleur selon le statut
    local color=""
    local emoji=""
    case "$status" in
        success)
            color="good"
            emoji="✅"
            ;;
        failure)
            color="danger"
            emoji="❌"
            ;;
        *)
            color="warning"
            emoji="⚠️"
            ;;
    esac
    
    # Payload Slack
    local slack_payload=$(cat << EOF
{
    "text": "$emoji *EcoDeli $test_type Tests* - $status",
    "attachments": [
        {
            "color": "$color",
            "text": "$message",
            "footer": "EcoDeli CI/CD"
        }
    ]
}
EOF
)
    
    # Envoi uniquement à Slack pour les tests
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        send_slack_notification "$SLACK_WEBHOOK_URL" "$slack_payload"
    fi
}

# Notification personnalisée
notify_custom() {
    local status="$1"
    local message="$2"
    local title="${NOTIFICATION_TITLE:-EcoDeli Notification}"
    
    # Payload Slack simple
    local slack_payload=$(cat << EOF
{
    "text": "*$title*",
    "attachments": [
        {
            "color": "$([ "$status" = "success" ] && echo "good" || echo "warning")",
            "text": "$message"
        }
    ]
}
EOF
)
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        send_slack_notification "$SLACK_WEBHOOK_URL" "$slack_payload"
    fi
}

# Fonction principale
main() {
    log "📢 Envoi de notification EcoDeli"
    log "Type: $NOTIFICATION_TYPE"
    log "Status: $STATUS"
    log "Message: $MESSAGE"
    
    # Chargement des variables d'environnement
    if [ -f .env ]; then
        source .env
    fi
    
    if [ -f .env.secrets ]; then
        source .env.secrets
    fi
    
    # Routage selon le type de notification
    case "$NOTIFICATION_TYPE" in
        deployment)
            notify_deployment "$STATUS" "$MESSAGE"
            ;;
        build)
            notify_build "$STATUS" "$MESSAGE"
            ;;
        test)
            notify_test "$STATUS" "$MESSAGE"
            ;;
        custom)
            notify_custom "$STATUS" "$MESSAGE"
            ;;
        *)
            error "Type de notification non supporté: $NOTIFICATION_TYPE"
            exit 1
            ;;
    esac
    
    log "✅ Notifications envoyées"
}

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [TYPE] [STATUS] [MESSAGE]"
    echo ""
    echo "Types de notification:"
    echo "  deployment    Notification de déploiement"
    echo "  build         Notification de build"
    echo "  test          Notification de test"
    echo "  custom        Notification personnalisée"
    echo ""
    echo "Status:"
    echo "  success       Succès"
    echo "  failure       Échec"
    echo "  warning       Avertissement"
    echo ""
    echo "Variables d'environnement:"
    echo "  SLACK_WEBHOOK_URL     URL webhook Slack"
    echo "  DISCORD_WEBHOOK_URL   URL webhook Discord"
    echo "  TEAMS_WEBHOOK_URL     URL webhook Teams"
    echo "  EMAIL_RECIPIENTS      Liste emails (séparés par virgule)"
    echo "  SMTP_HOST             Serveur SMTP"
    echo "  SMTP_USER             Utilisateur SMTP"
    echo "  SMTP_PASSWORD         Mot de passe SMTP"
    echo "  ENVIRONMENT           Environnement"
    echo "  VERSION               Version"
    echo ""
    echo "Examples:"
    echo "  $0 deployment success 'Déploiement réussi'"
    echo "  $0 build failure 'Échec de compilation'"
    echo "  $0 test success 'Tous les tests passent'"
    echo "  $0 custom warning 'Maintenance programmée'"
}

# Gestion des arguments
if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Exécution
main "$@"