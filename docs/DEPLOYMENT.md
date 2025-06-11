# Guide de Déploiement EcoDeli

## 📋 Prérequis

### Système

- **OS**: Linux (Ubuntu 20.04+ recommandé) ou macOS
- **RAM**: 8GB minimum, 16GB recommandé
- **Stockage**: 50GB minimum d'espace libre
- **Réseau**: Ports 80, 443, 8080, 9090, 3000 disponibles

### Logiciels

- Docker 24.0+
- Docker Compose 2.0+
- Git 2.30+
- Curl/wget

## 🚀 Installation Complète

### 1. Préparation du Serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installation de Docker Compose
sudo apt install docker-compose-plugin

# Configuration des permissions
sudo usermod -aG docker $USER
newgrp docker

# Vérification
docker --version
docker compose version
```

### 2. Clonage et Configuration

```bash
# Clonage du repository
git clone https://github.com/your-org/ecodeli.git
cd ecodeli

# Copie de la configuration
cp .env.example .env

# Édition de la configuration
nano .env
```

### 3. Configuration Minimale

```bash
# .env - Configuration minimum
DATABASE_URL="postgresql://ecodeli_user:CHANGE_ME_DB_PASSWORD@postgres:5432/ecodeli"
REDIS_URL="redis://redis:6379"

# Authentification
NEXTAUTH_SECRET="CHANGE_ME_LONG_RANDOM_STRING_64_CHARS_MIN"
NEXTAUTH_URL="https://yourdomain.com"

# Domaine et SSL
DOMAIN_NAME="yourdomain.com"
SSL_ENABLED=true

# Monitoring
GRAFANA_ADMIN_PASSWORD="CHANGE_ME_GRAFANA_PASSWORD"

# Backup
BACKUP_NOTIFICATION_WEBHOOK="https://hooks.slack.com/your-webhook"
```

### 4. Déploiement Initial

```bash
# Rendre les scripts exécutables
chmod +x scripts/deploy.sh scripts/maintenance.sh

# Initialisation complète
./scripts/deploy.sh init

# Vérification du déploiement
./scripts/deploy.sh status
```

## 🌍 Environnements de Déploiement

### Développement

```bash
# Configuration développement
export ENVIRONMENT=development

# Déploiement avec hot-reload
./scripts/deploy.sh deploy --env development

# Accès aux services
echo "Web: http://localhost:3000"
echo "Desktop: http://localhost:8080"
echo "Adminer: http://localhost:8081"
```

### Staging

```bash
# Configuration staging
export ENVIRONMENT=staging

# Déploiement avec données de test
./scripts/deploy.sh deploy --env staging

# Vérification
./scripts/maintenance.sh health
```

### Production

```bash
# Configuration production
export ENVIRONMENT=production

# Backup pré-déploiement automatique
export BACKUP_BEFORE_DEPLOY=true

# Déploiement production
./scripts/deploy.sh deploy --env production --version 1.0.0

# Post-déploiement
./scripts/maintenance.sh security
```

## 🔐 Configuration SSL

### Certificats Auto-signés (Développement)

```bash
# Génération automatique
docker-compose exec nginx /usr/local/bin/generate-ssl.sh

# Vérification
docker-compose exec nginx openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates
```

### Let's Encrypt (Production)

```bash
# Installation Certbot
sudo apt install certbot python3-certbot-nginx

# Arrêt temporaire de Nginx
./scripts/deploy.sh stop nginx

# Génération certificat
sudo certbot certonly --standalone -d yourdomain.com

# Copie des certificats
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem

# Redémarrage
./scripts/deploy.sh restart nginx
```

### Renouvellement Automatique

```bash
# Crontab pour renouvellement
sudo crontab -e

# Ajout de la ligne (renouvellement tous les 3 mois)
0 3 1 */3 * certbot renew --quiet && docker-compose -f /path/to/ecodeli/docker-compose.yml restart nginx
```

## 🗃️ Base de Données

### Initialisation

```bash
# Attendre que PostgreSQL soit prêt
./scripts/deploy.sh logs postgres

# Vérifier la connexion
docker-compose exec postgres pg_isready -U postgres

# Exécuter les migrations
docker-compose exec web npx prisma migrate deploy

# Seeding (développement uniquement)
docker-compose exec web npx prisma db seed
```

### Migration de Données

```bash
# Export depuis l'ancien système
pg_dump -h old-server -U username -d old_database > migration.sql

# Import vers EcoDeli
docker-compose exec -T postgres psql -U ecodeli_user -d ecodeli < migration.sql

# Vérification
docker-compose exec postgres psql -U ecodeli_user -d ecodeli -c "\dt"
```

## 📊 Monitoring et Alertes

### Configuration Grafana

```bash
# Accès initial
echo "URL: http://localhost/monitoring"
echo "User: admin"
echo "Password: $(grep GRAFANA_ADMIN_PASSWORD .env | cut -d= -f2)"

# Import des dashboards
curl -X POST http://admin:password@localhost/monitoring/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @docker/grafana/dashboards/ecodeli/main-dashboard.json
```

### Configuration des Alertes

```bash
# Configuration Slack
docker-compose exec grafana grafana-cli admin reset-admin-password newpassword

# Configuration webhook dans Grafana UI
# Notifications > Notification channels > Add channel
# Type: Slack
# URL: https://hooks.slack.com/your-webhook
```

### Métriques Personnalisées

```bash
# Vérification des métriques
curl http://localhost:9090/api/v1/label/__name__/values | jq

# Test d'une requête
curl "http://localhost:9090/api/v1/query?query=up" | jq
```

## 💾 Stratégie de Backup

### Configuration Backup Automatique

```bash
# Vérification du service backup
docker-compose ps backup

# Test de backup manuel
docker-compose exec backup /app/scripts/backup-all.sh

# Vérification des backups
docker-compose exec backup ls -la /backups/
```

### Planification Avancée

```bash
# Édition du crontab backup
docker-compose exec backup crontab -e

# Backup quotidien à 23h (par défaut)
0 23 * * * /app/scripts/backup-all.sh

# Backup hebdomadaire complet le dimanche à 2h
0 2 * * 0 /app/scripts/backup-all.sh --full

# Nettoyage mensuel le 1er à 4h
0 4 1 * * /app/scripts/cleanup-old-backups.sh
```

### Restauration

```bash
# Lister les backups disponibles
docker-compose exec backup ls -la /backups/postgresql/

# Restauration complète
./scripts/deploy.sh stop
docker-compose exec backup /app/scripts/restore-database.sh /backups/postgresql/ecodeli_full_20240101_120000.sql.gz
./scripts/deploy.sh start

# Vérification post-restauration
./scripts/maintenance.sh database status
```

## 🔧 Maintenance

### Maintenance Préventive

```bash
# Script de maintenance quotidienne
#!/bin/bash
# maintenance-daily.sh

# Vérification santé
./scripts/maintenance.sh health

# Optimisation si nécessaire
./scripts/maintenance.sh optimize

# Nettoyage logs anciens
docker system prune -f --filter "until=24h"

# Rapport par email
./scripts/maintenance.sh health | mail -s "EcoDeli Health Report" admin@yourdomain.com
```

### Surveillance Continue

```bash
# Monitoring en temps réel
./scripts/maintenance.sh monitor

# Alertes par webhook
export NOTIFICATION_WEBHOOK="https://hooks.slack.com/your-webhook"
./scripts/maintenance.sh health --notify
```

### Mode Maintenance

```bash
# Activation maintenance
./scripts/maintenance.sh maintenance-mode on

# Vérification
curl -I http://localhost
# HTTP/1.1 503 Service Temporarily Unavailable

# Désactivation
./scripts/maintenance.sh maintenance-mode off
```

## 🚀 Mise à jour de Version

### Mise à jour Standard

```bash
# Backup pré-mise à jour
./scripts/deploy.sh backup

# Pull dernière version
git pull origin main

# Mise à jour avec nouvelle version
./scripts/deploy.sh update --version 1.1.0

# Vérification
./scripts/deploy.sh status
```

### Mise à jour avec Rollback

```bash
# Sauvegarde state actuel
docker-compose ps > deployment-state-before-update.txt

# Mise à jour
./scripts/deploy.sh update --version 1.1.0

# Si problème, rollback
git checkout previous-version-tag
./scripts/deploy.sh deploy --force

# Restauration backup si nécessaire
./scripts/deploy.sh restore latest-backup.sql
```

## 🔍 Dépannage

### Problèmes Courants

**Services ne démarrent pas:**
```bash
# Vérifier les logs détaillés
docker-compose logs --tail=100 web

# Vérifier l'espace disque
df -h

# Vérifier les permissions
ls -la docker/
```

**Problème de connexion DB:**
```bash
# Test connexion directe
docker-compose exec postgres psql -U postgres -d ecodeli -c "SELECT version();"

# Vérification configuration
docker-compose exec web printenv | grep DATABASE

# Reset base de données
docker-compose down -v
docker-compose up -d postgres
# Attendre initialisation
./scripts/deploy.sh init
```

**Certificats SSL expirés:**
```bash
# Vérification expiration
docker-compose exec nginx openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates

# Régénération
docker-compose exec nginx /usr/local/bin/generate-ssl.sh --force

# Redémarrage Nginx
docker-compose restart nginx
```

### Logs de Debug

```bash
# Logs détaillés avec timestamp
docker-compose logs --timestamps --follow web

# Logs d'erreur uniquement
docker-compose logs web 2>&1 | grep -i error

# Export logs pour analyse
docker-compose logs --no-color > ecodeli-logs-$(date +%Y%m%d).txt
```

### Performance

```bash
# Utilisation ressources
docker stats

# Analyse performance DB
docker-compose exec postgres psql -U postgres -d ecodeli -c "
SELECT schemaname,tablename,n_live_tup,n_dead_tup,last_vacuum,last_analyze 
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000;"

# Optimisation
./scripts/maintenance.sh optimize
```

## 📋 Checklist de Déploiement

### Pré-déploiement

- [ ] Serveur mis à jour
- [ ] Docker et Docker Compose installés
- [ ] Ports nécessaires ouverts
- [ ] Configuration .env validée
- [ ] Certificats SSL configurés
- [ ] Backup système effectué

### Déploiement

- [ ] Code cloné et à jour
- [ ] Images Docker construites
- [ ] Services déployés
- [ ] Base de données initialisée
- [ ] Health checks validés
- [ ] Tests de fumée passés

### Post-déploiement

- [ ] Monitoring configuré
- [ ] Alertes testées
- [ ] Backup automatique configuré
- [ ] Documentation mise à jour
- [ ] Équipe notifiée
- [ ] Plan de rollback validé

---

*Guide mis à jour le: $(date)*
*Version: 1.0.0*