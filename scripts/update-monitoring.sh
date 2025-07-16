#!/bin/bash

# Script de mise à jour du monitoring après déploiement
# Usage: ./scripts/update-monitoring.sh [ENVIRONMENT] [VERSION]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
VERSION=${2:-latest}
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3001"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Mise à jour de la configuration Prometheus
update_prometheus_config() {
    log "Mise à jour de la configuration Prometheus..."
    
    # Créer le répertoire de configuration s'il n'existe pas
    mkdir -p monitoring
    
    # Configuration Prometheus
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Application EcoDeli
  - job_name: 'ecodeli-app'
    static_configs:
      - targets: ['ecodeli-app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 10s
    
  # Base de données PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  # Nginx
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  # Jenkins
  - job_name: 'jenkins'
    static_configs:
      - targets: ['jenkins:8080']
    metrics_path: '/prometheus'
    scrape_interval: 60s
    
  # SonarQube
  - job_name: 'sonarqube'
    static_configs:
      - targets: ['sonarqube:9000']
    metrics_path: '/api/monitoring/metrics'
    scrape_interval: 60s
    
  # Docker containers
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
    scrape_interval: 30s
    
  # Node exporter
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
EOF
    
    log "Configuration Prometheus mise à jour"
}

# Mise à jour des règles d'alerte
update_alert_rules() {
    log "Mise à jour des règles d'alerte..."
    
    cat > monitoring/alert_rules.yml << EOF
groups:
  - name: ecodeli.rules
    rules:
      # Application Health
      - alert: EcoDeliDown
        expr: up{job="ecodeli-app"} == 0
        for: 1m
        labels:
          severity: critical
          environment: ${ENVIRONMENT}
        annotations:
          summary: "EcoDeli application is down"
          description: "EcoDeli application has been down for more than 1 minute"
      
      # High Response Time
      - alert: EcoDeliHighResponseTime
        expr: http_request_duration_seconds{job="ecodeli-app", quantile="0.95"} > 2
        for: 5m
        labels:
          severity: warning
          environment: ${ENVIRONMENT}
        annotations:
          summary: "EcoDeli high response time"
          description: "95th percentile response time is {{ \$value }}s"
      
      # High Error Rate
      - alert: EcoDeliHighErrorRate
        expr: rate(http_requests_total{job="ecodeli-app", status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          environment: ${ENVIRONMENT}
        annotations:
          summary: "EcoDeli high error rate"
          description: "Error rate is {{ \$value }} requests per second"
      
      # Database Connection
      - alert: PostgreSQLDown
        expr: up{job="postgres"} == 0
        for: 30s
        labels:
          severity: critical
          environment: ${ENVIRONMENT}
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL database is unreachable"
      
      # High CPU Usage
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total{job="ecodeli-app"}[5m]) * 100 > 80
        for: 5m
        labels:
          severity: warning
          environment: ${ENVIRONMENT}
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ \$value }}%"
      
      # High Memory Usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes{job="ecodeli-app"} / (1024 * 1024 * 1024) > 1
        for: 5m
        labels:
          severity: warning
          environment: ${ENVIRONMENT}
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ \$value }}GB"
      
      # Disk Space
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 1m
        labels:
          severity: critical
          environment: ${ENVIRONMENT}
        annotations:
          summary: "Low disk space"
          description: "Disk space is {{ \$value }}% full"
      
      # Deployment Alert
      - alert: DeploymentEvent
        expr: increase(deployment_total[1m]) > 0
        labels:
          severity: info
          environment: ${ENVIRONMENT}
        annotations:
          summary: "New deployment detected"
          description: "Version ${VERSION} has been deployed to ${ENVIRONMENT}"
EOF
    
    log "Règles d'alerte mises à jour"
}

# Création des dashboards Grafana
create_grafana_dashboards() {
    log "Création des dashboards Grafana..."
    
    # Dashboard principal EcoDeli
    cat > monitoring/ecodeli-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "EcoDeli Application Dashboard",
    "tags": ["ecodeli", "application"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Application Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"ecodeli-app\"}",
            "legendFormat": "App Status"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {
                "options": {
                  "0": {
                    "text": "DOWN",
                    "color": "red"
                  },
                  "1": {
                    "text": "UP",
                    "color": "green"
                  }
                },
                "type": "value"
              }
            ]
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds{job=\"ecodeli-app\", quantile=\"0.95\"}",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "http_request_duration_seconds{job=\"ecodeli-app\", quantile=\"0.50\"}",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "unit": "s"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        }
      },
      {
        "id": 3,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"ecodeli-app\"}[5m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "yAxes": [
          {
            "unit": "reqps"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        }
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"ecodeli-app\", status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors/sec"
          },
          {
            "expr": "rate(http_requests_total{job=\"ecodeli-app\", status=~\"4..\"}[5m])",
            "legendFormat": "4xx errors/sec"
          }
        ],
        "yAxes": [
          {
            "unit": "reqps"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF
    
    log "Dashboard Grafana créé"
}

# Envoi d'un événement de déploiement
send_deployment_event() {
    log "Envoi de l'événement de déploiement..."
    
    # Événement vers Prometheus
    curl -X POST "${PROMETHEUS_URL}/api/v1/alerts" \
         -H "Content-Type: application/json" \
         -d '{
             "annotations": {
                 "summary": "EcoDeli deployment to '"${ENVIRONMENT}"'",
                 "description": "Version '"${VERSION}"' deployed to '"${ENVIRONMENT}"'"
             },
             "labels": {
                 "alertname": "DeploymentEvent",
                 "environment": "'"${ENVIRONMENT}"'",
                 "version": "'"${VERSION}"'",
                 "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
             }
         }' 2>/dev/null || warn "Impossible d'envoyer l'événement à Prometheus"
    
    log "Événement de déploiement envoyé"
}

# Importation des dashboards dans Grafana
import_grafana_dashboards() {
    log "Importation des dashboards dans Grafana..."
    
    # Attendre que Grafana soit prêt
    timeout 60 bash -c "while ! curl -s ${GRAFANA_URL}/api/health > /dev/null; do sleep 2; done"
    
    # Importer le dashboard principal
    curl -X POST "${GRAFANA_URL}/api/dashboards/db" \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer ${GRAFANA_API_TOKEN:-}" \
         -d "@monitoring/ecodeli-dashboard.json" \
         --user "admin:${GRAFANA_PASSWORD:-admin123}" 2>/dev/null || warn "Impossible d'importer le dashboard"
    
    log "Dashboards importés dans Grafana"
}

# Rechargement de la configuration Prometheus
reload_prometheus() {
    log "Rechargement de la configuration Prometheus..."
    
    # Redémarrer Prometheus pour prendre en compte les nouvelles configurations
    docker-compose restart prometheus || warn "Impossible de redémarrer Prometheus"
    
    # Vérifier que Prometheus est prêt
    timeout 60 bash -c "while ! curl -s ${PROMETHEUS_URL}/api/v1/status/config > /dev/null; do sleep 2; done"
    
    log "Configuration Prometheus rechargée"
}

# Validation des métriques
validate_metrics() {
    log "Validation des métriques..."
    
    # Vérifier que les métriques de l'application sont disponibles
    if curl -s "${PROMETHEUS_URL}/api/v1/query?query=up{job=\"ecodeli-app\"}" | grep -q '"result":\['; then
        log "✅ Métriques de l'application disponibles"
    else
        warn "❌ Métriques de l'application non disponibles"
    fi
    
    # Vérifier les métriques de base de données
    if curl -s "${PROMETHEUS_URL}/api/v1/query?query=up{job=\"postgres\"}" | grep -q '"result":\['; then
        log "✅ Métriques de base de données disponibles"
    else
        warn "❌ Métriques de base de données non disponibles"
    fi
    
    log "Validation des métriques terminée"
}

# Fonction principale
main() {
    log "🔄 Mise à jour du monitoring EcoDeli"
    log "Environnement: $ENVIRONMENT"
    log "Version: $VERSION"
    
    update_prometheus_config
    update_alert_rules
    create_grafana_dashboards
    reload_prometheus
    send_deployment_event
    import_grafana_dashboards
    validate_metrics
    
    log "✅ Monitoring mis à jour avec succès"
    log "📊 Prometheus: ${PROMETHEUS_URL}"
    log "📈 Grafana: ${GRAFANA_URL}"
}

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [ENVIRONMENT] [VERSION]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT    Environnement cible (dev, staging, prod)"
    echo "  VERSION        Version déployée"
    echo ""
    echo "Examples:"
    echo "  $0 dev latest"
    echo "  $0 prod 1.2.3"
    echo "  $0 staging 123-abc123"
}

# Gestion des arguments
if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Exécution
main "$@"