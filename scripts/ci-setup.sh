#!/bin/bash

# Script de configuration CI/CD pour EcoDeli
# Usage: ./scripts/ci-setup.sh [jenkins|github|all]

set -e

# Configuration
CI_TYPE=${1:-all}
PROJECT_NAME="ecodeli"
JENKINS_URL="http://localhost:8081"
GITHUB_REPO="ecodeli/platform"

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
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl n'est pas installé"
    fi
    
    if ! command -v jq &> /dev/null; then
        warn "jq n'est pas installé, certaines fonctionnalités peuvent être limitées"
    fi
    
    log "Prérequis OK"
}

# Configuration Jenkins
setup_jenkins() {
    log "Configuration de Jenkins..."
    
    # Démarrage des services Jenkins
    if [ "$CI_TYPE" = "jenkins" ] || [ "$CI_TYPE" = "all" ]; then
        log "Démarrage des services Jenkins..."
        docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile jenkins up -d
        
        # Attendre que Jenkins soit prêt
        log "Attente du démarrage de Jenkins..."
        timeout 300 bash -c "while ! curl -s $JENKINS_URL/login > /dev/null; do sleep 5; done"
        
        # Récupération du mot de passe initial
        if docker-compose exec jenkins test -f /var/jenkins_home/secrets/initialAdminPassword; then
            INITIAL_PASSWORD=$(docker-compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword)
            log "Mot de passe initial Jenkins: $INITIAL_PASSWORD"
        fi
        
        # Configuration des plugins
        log "Installation des plugins Jenkins..."
        docker-compose exec jenkins jenkins-plugin-cli --plugins "$(cat ci/jenkins/plugins.txt | tr '\n' ' ')"
        
        # Redémarrage de Jenkins
        log "Redémarrage de Jenkins..."
        docker-compose restart jenkins
        
        # Attendre que Jenkins soit à nouveau prêt
        timeout 300 bash -c "while ! curl -s $JENKINS_URL/login > /dev/null; do sleep 5; done"
        
        log "Jenkins configuré avec succès"
        info "URL Jenkins: $JENKINS_URL"
        info "Utilisateur: admin"
        info "Mot de passe: ${INITIAL_PASSWORD:-voir docker logs ecodeli_jenkins}"
    fi
}

# Configuration SonarQube
setup_sonarqube() {
    log "Configuration de SonarQube..."
    
    # Démarrage de SonarQube
    docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile quality up -d sonarqube
    
    # Attendre que SonarQube soit prêt
    log "Attente du démarrage de SonarQube..."
    timeout 300 bash -c "while ! curl -s http://localhost:9000 > /dev/null; do sleep 10; done"
    
    # Configuration initiale
    sleep 30  # Attendre que SonarQube soit complètement initialisé
    
    # Changer le mot de passe par défaut
    curl -u admin:admin -X POST "http://localhost:9000/api/users/change_password" \
         -d "login=admin&password=admin123&previousPassword=admin" || true
    
    # Créer un token pour l'API
    TOKEN_RESPONSE=$(curl -u admin:admin123 -X POST "http://localhost:9000/api/user_tokens/generate" \
                     -d "name=ecodeli-token" 2>/dev/null || echo "")
    
    if [ -n "$TOKEN_RESPONSE" ]; then
        SONAR_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token' 2>/dev/null || echo "")
        if [ -n "$SONAR_TOKEN" ] && [ "$SONAR_TOKEN" != "null" ]; then
            log "Token SonarQube généré: $SONAR_TOKEN"
            echo "SONAR_TOKEN=$SONAR_TOKEN" >> .env
        fi
    fi
    
    # Créer le projet
    curl -u admin:admin123 -X POST "http://localhost:9000/api/projects/create" \
         -d "name=EcoDeli&project=ecodeli-platform" || true
    
    log "SonarQube configuré avec succès"
    info "URL SonarQube: http://localhost:9000"
    info "Utilisateur: admin"
    info "Mot de passe: admin123"
}

# Configuration du registry Docker
setup_registry() {
    log "Configuration du registry Docker..."
    
    # Créer le répertoire de configuration
    mkdir -p ci/registry
    
    # Configuration du registry
    cat > ci/registry/config.yml << EOF
version: 0.1
log:
  fields:
    service: registry
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /data
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
EOF
    
    # Démarrage du registry
    docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile registry up -d
    
    log "Registry Docker configuré avec succès"
    info "URL Registry: http://localhost:5000"
}

# Configuration des webhooks
setup_webhooks() {
    log "Configuration des webhooks..."
    
    # Créer le répertoire des webhooks
    mkdir -p ci/webhooks/scripts
    
    # Configuration des hooks
    cat > ci/webhooks/hooks.json << EOF
[
  {
    "id": "github-push",
    "execute-command": "/scripts/github-push.sh",
    "command-working-directory": "/scripts",
    "response-message": "Webhook received successfully",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha1",
            "secret": "github-webhook-secret",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  },
  {
    "id": "deployment-success",
    "execute-command": "/scripts/deployment-success.sh",
    "command-working-directory": "/scripts",
    "response-message": "Deployment notification received"
  }
]
EOF
    
    # Script de traitement des push GitHub
    cat > ci/webhooks/scripts/github-push.sh << 'EOF'
#!/bin/bash
echo "GitHub push webhook received"
echo "Repository: $1"
echo "Branch: $2"
echo "Commit: $3"

# Déclencher le build Jenkins
curl -X POST "${JENKINS_URL}/job/ecodeli-ci-pipeline/build" \
     --user "${JENKINS_USER}:${JENKINS_TOKEN}" \
     --data-urlencode "cause=GitHub push webhook"
EOF
    
    # Script de notification de déploiement
    cat > ci/webhooks/scripts/deployment-success.sh << 'EOF'
#!/bin/bash
echo "Deployment success notification received"
echo "Environment: $1"
echo "Version: $2"

# Envoyer une notification Slack
curl -X POST "${SLACK_WEBHOOK_URL}" \
     -H "Content-Type: application/json" \
     -d '{
         "text": "✅ EcoDeli deployed successfully to '"$1"'",
         "attachments": [
             {
                 "color": "good",
                 "fields": [
                     {
                         "title": "Environment",
                         "value": "'"$1"'",
                         "short": true
                     },
                     {
                         "title": "Version",
                         "value": "'"$2"'",
                         "short": true
                     }
                 ]
             }
         ]
     }'
EOF
    
    chmod +x ci/webhooks/scripts/*.sh
    
    # Démarrage du service webhook
    docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile webhooks up -d
    
    log "Webhooks configurés avec succès"
    info "URL Webhook: http://localhost:9001"
}

# Configuration des tests E2E
setup_e2e_testing() {
    log "Configuration des tests E2E..."
    
    # Démarrage de Selenium Grid
    docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile testing up -d
    
    # Attendre que Selenium soit prêt
    log "Attente du démarrage de Selenium Grid..."
    timeout 120 bash -c "while ! curl -s http://localhost:4444/wd/hub/status > /dev/null; do sleep 5; done"
    
    log "Tests E2E configurés avec succès"
    info "URL Selenium Grid: http://localhost:4444"
}

# Configuration des secrets
setup_secrets() {
    log "Configuration des secrets..."
    
    # Créer le fichier de secrets s'il n'existe pas
    if [ ! -f .env.secrets ]; then
        cat > .env.secrets << EOF
# Secrets pour CI/CD - À configurer selon votre environnement

# GitHub
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=your_github_username

# Docker Registry
DOCKER_REGISTRY_USERNAME=your_registry_username
DOCKER_REGISTRY_PASSWORD=your_registry_password

# Jenkins
JENKINS_ADMIN_PASSWORD=admin123
JENKINS_DEV_PASSWORD=dev123
JENKINS_AGENT_SECRET=your_agent_secret

# SonarQube
SONAR_TOKEN=your_sonar_token

# Slack
SLACK_TOKEN=your_slack_token
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Monitoring
GRAFANA_PASSWORD=admin123
EOF
        warn "Fichier .env.secrets créé avec des valeurs par défaut"
        warn "Veuillez configurer les secrets dans .env.secrets"
    fi
    
    # Vérifier que les secrets nécessaires sont configurés
    if [ -f .env.secrets ]; then
        source .env.secrets
        
        MISSING_SECRETS=""
        [ -z "$GITHUB_TOKEN" ] && MISSING_SECRETS="$MISSING_SECRETS GITHUB_TOKEN"
        [ -z "$DOCKER_REGISTRY_USERNAME" ] && MISSING_SECRETS="$MISSING_SECRETS DOCKER_REGISTRY_USERNAME"
        [ -z "$SLACK_WEBHOOK_URL" ] && MISSING_SECRETS="$MISSING_SECRETS SLACK_WEBHOOK_URL"
        
        if [ -n "$MISSING_SECRETS" ]; then
            warn "Secrets manquants:$MISSING_SECRETS"
            warn "Veuillez configurer ces secrets dans .env.secrets"
        fi
    fi
}

# Génération de la documentation
generate_documentation() {
    log "Génération de la documentation CI/CD..."
    
    cat > README-CI-CD.md << 'EOF'
# EcoDeli CI/CD Configuration

## Services disponibles

### Jenkins
- **URL:** http://localhost:8081
- **Utilisateur:** admin
- **Mot de passe:** voir logs Jenkins

### SonarQube
- **URL:** http://localhost:9000
- **Utilisateur:** admin
- **Mot de passe:** admin123

### Registry Docker
- **URL:** http://localhost:5000

### Selenium Grid
- **URL:** http://localhost:4444

### Portainer
- **URL:** https://localhost:9443

## Commandes utiles

### Démarrage des services
```bash
# Tous les services
docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile ci up -d

# Jenkins uniquement
docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile jenkins up -d

# SonarQube uniquement
docker-compose -f docker-compose.yml -f docker-compose.ci.yml --profile quality up -d
```

### Gestion des pipelines
```bash
# Déclencher un build Jenkins
curl -X POST "http://localhost:8081/job/ecodeli-ci-pipeline/build" \
     --user "admin:admin123"

# Vérifier le statut d'un build
curl -s "http://localhost:8081/job/ecodeli-ci-pipeline/lastBuild/api/json" \
     --user "admin:admin123" | jq '.result'
```

### Monitoring
```bash
# Vérifier les logs
docker-compose logs -f jenkins
docker-compose logs -f sonarqube

# Vérifier l'état des services
docker-compose ps
```

## GitHub Actions

Les workflows GitHub Actions sont configurés dans `.github/workflows/`:

- `ci.yml`: Pipeline principal CI/CD
- `deploy.yml`: Déploiement manuel

### Secrets GitHub requis
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SONAR_TOKEN`
- `SLACK_WEBHOOK_URL`

## Configuration

1. Configurer les secrets dans `.env.secrets`
2. Adapter les configurations selon votre environnement
3. Tester les pipelines

## Dépannage

### Jenkins ne démarre pas
```bash
docker-compose logs jenkins
docker-compose restart jenkins
```

### SonarQube inaccessible
```bash
docker-compose logs sonarqube
# Vérifier l'espace disque et la mémoire
```

### Tests E2E échouent
```bash
docker-compose logs selenium-hub
docker-compose logs selenium-chrome
```
EOF
    
    log "Documentation générée: README-CI-CD.md"
}

# Tests de validation
run_validation_tests() {
    log "Exécution des tests de validation..."
    
    # Test Jenkins
    if curl -s "$JENKINS_URL/login" > /dev/null; then
        log "✅ Jenkins accessible"
    else
        warn "❌ Jenkins non accessible"
    fi
    
    # Test SonarQube
    if curl -s "http://localhost:9000" > /dev/null; then
        log "✅ SonarQube accessible"
    else
        warn "❌ SonarQube non accessible"
    fi
    
    # Test Registry
    if curl -s "http://localhost:5000/v2/" > /dev/null; then
        log "✅ Registry Docker accessible"
    else
        warn "❌ Registry Docker non accessible"
    fi
    
    # Test Selenium
    if curl -s "http://localhost:4444/wd/hub/status" > /dev/null; then
        log "✅ Selenium Grid accessible"
    else
        warn "❌ Selenium Grid non accessible"
    fi
    
    log "Tests de validation terminés"
}

# Fonction principale
main() {
    log "🚀 Configuration CI/CD EcoDeli ($CI_TYPE)"
    
    check_prerequisites
    setup_secrets
    
    case $CI_TYPE in
        jenkins)
            setup_jenkins
            setup_sonarqube
            setup_registry
            setup_webhooks
            ;;
        github)
            log "Configuration GitHub Actions (pas de setup Docker requis)"
            ;;
        all)
            setup_jenkins
            setup_sonarqube
            setup_registry
            setup_webhooks
            setup_e2e_testing
            ;;
        *)
            error "Type CI/CD non supporté: $CI_TYPE"
            ;;
    esac
    
    generate_documentation
    run_validation_tests
    
    log "✅ Configuration CI/CD terminée avec succès!"
    
    # Affichage des informations de connexion
    info "📊 Services disponibles:"
    info "  - Jenkins: http://localhost:8081"
    info "  - SonarQube: http://localhost:9000"
    info "  - Registry: http://localhost:5000"
    info "  - Selenium: http://localhost:4444"
    info "  - Portainer: https://localhost:9443"
    info ""
    info "📖 Documentation: README-CI-CD.md"
    info "⚙️  Configuration: .env.secrets"
    info ""
    info "🔧 Prochaines étapes:"
    info "  1. Configurer les secrets dans .env.secrets"
    info "  2. Tester les pipelines"
    info "  3. Configurer les webhooks GitHub"
}

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [jenkins|github|all]"
    echo ""
    echo "Options:"
    echo "  jenkins    Configure Jenkins et les services associés"
    echo "  github     Configure GitHub Actions uniquement"
    echo "  all        Configure tous les services CI/CD (défaut)"
    echo ""
    echo "Examples:"
    echo "  $0 jenkins"
    echo "  $0 github"
    echo "  $0 all"
}

# Gestion des arguments
case ${1:-help} in
    jenkins|github|all)
        main
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Argument invalide: $1"
        show_help
        ;;
esac