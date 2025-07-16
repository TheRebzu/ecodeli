# EcoDeli - Guide Docker

Ce guide explique comment déployer et gérer EcoDeli avec Docker selon les spécifications du cahier des charges.

## 📋 Prérequis

- Docker Engine 20.10+
- Docker Compose v2.0+
- Git
- 4GB RAM minimum
- 10GB espace disque libre

## 🚀 Démarrage rapide

### 1. Configuration initiale

```bash
# Cloner le repository
git clone https://github.com/ecodeli/platform.git
cd platform

# Copier le fichier d'environnement
cp .env.docker .env

# Modifier les variables d'environnement selon vos besoins
nano .env
```

### 2. Déploiement en développement

```bash
# Démarrage simple
docker-compose up -d

# Ou avec le script de déploiement
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy dev
```

### 3. Déploiement en production

```bash
# Déploiement avec configuration de production
./scripts/deploy.sh deploy prod

# Ou manuellement
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📁 Structure des fichiers Docker

```
.
├── Dockerfile                    # Image principale de l'application
├── docker-compose.yml           # Configuration de base
├── docker-compose.dev.yml       # Configuration développement
├── docker-compose.prod.yml      # Configuration production
├── .env.docker                  # Variables d'environnement
├── nginx/
│   ├── nginx.conf              # Configuration Nginx
│   └── ssl/                    # Certificats SSL
├── scripts/
│   ├── deploy.sh               # Script de déploiement
│   ├── backup.sh               # Script de sauvegarde
│   ├── restore.sh              # Script de restauration
│   └── health-check.sh         # Script de vérification
└── README-DOCKER.md            # Ce fichier
```

## 🐳 Services Docker

### Services principaux

- **ecodeli-app**: Application Next.js EcoDeli
- **postgres**: Base de données PostgreSQL
- **nginx**: Reverse proxy (production uniquement)

### Services optionnels

- **pgadmin**: Interface de gestion PostgreSQL (développement)
- **prometheus**: Monitoring des métriques
- **grafana**: Visualisation des données
- **backup**: Service de sauvegarde automatique

## 🔧 Configuration

### Variables d'environnement

```bash
# Base de données
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:password@postgres:5432/ecodeli

# Application
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# Services externes
STRIPE_SECRET_KEY=sk_test_your_stripe_key
ONESIGNAL_APP_ID=your_onesignal_app_id
```

### Profiles Docker Compose

```bash
# Développement avec PgAdmin
docker-compose --profile dev up -d

# Production avec Nginx
docker-compose --profile production up -d

# Monitoring complet
docker-compose --profile monitoring up -d
```

## 📊 Monitoring et Logs

### Vérification de santé

```bash
# Vérification automatique
./scripts/health-check.sh

# Vérification manuelle
docker-compose ps
docker-compose logs -f ecodeli-app
```

### Métriques de performance

```bash
# Statistiques des containers
docker stats

# Logs en temps réel
docker-compose logs -f --tail=100
```

## 💾 Sauvegarde et Restauration

### Sauvegarde automatique

```bash
# Sauvegarde immédiate
./scripts/backup.sh

# Configuration de sauvegarde automatique (cron)
0 2 * * * /path/to/scripts/backup.sh
```

### Restauration

```bash
# Restauration depuis la sauvegarde la plus récente
./scripts/restore.sh

# Restauration depuis un fichier spécifique
./scripts/restore.sh backups/ecodeli_backup_20240101_120000.sql.gz
```

## 🔐 Sécurité

### Configuration SSL

```bash
# Génération de certificats auto-signés (développement)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=FR/ST=Paris/L=Paris/O=EcoDeli/CN=localhost"
```

### Hardening de sécurité

- Utilisation d'utilisateurs non-root dans les containers
- Chiffrement des données sensibles
- Rate limiting avec Nginx
- Headers de sécurité configurés
- Secrets gérés via variables d'environnement

## 🛠️ Commandes utiles

### Gestion des containers

```bash
# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Redémarrer un service
docker-compose restart ecodeli-app

# Voir les logs
docker-compose logs -f ecodeli-app

# Exécuter des commandes dans un container
docker-compose exec ecodeli-app bash
```

### Gestion de la base de données

```bash
# Accès à PostgreSQL
docker-compose exec postgres psql -U postgres -d ecodeli

# Sauvegarde manuelle
docker-compose exec postgres pg_dump -U postgres ecodeli > backup.sql

# Restauration manuelle
docker-compose exec -T postgres psql -U postgres ecodeli < backup.sql
```

### Nettoyage

```bash
# Nettoyage des containers arrêtés
docker-compose down --remove-orphans

# Nettoyage des volumes
docker-compose down -v

# Nettoyage complet
docker system prune -a
```

## 🔄 Mise à jour

### Mise à jour de l'application

```bash
# Mise à jour du code
git pull origin main

# Reconstruction et redéploiement
docker-compose up -d --build

# Ou avec le script
./scripts/deploy.sh deploy prod
```

### Migrations de base de données

```bash
# Exécution des migrations
docker-compose exec ecodeli-app npm run db:migrate

# Génération des données de test
docker-compose exec ecodeli-app npm run db:seed
```

## 🐛 Dépannage

### Problèmes courants

1. **Port déjà utilisé**
   ```bash
   # Vérifier les ports occupés
   netstat -tlnp | grep :3000
   
   # Modifier le port dans docker-compose.yml
   ports:
     - "3001:3000"
   ```

2. **Problème de permissions**
   ```bash
   # Corriger les permissions
   sudo chown -R $USER:$USER .
   ```

3. **Base de données inaccessible**
   ```bash
   # Vérifier le statut
   docker-compose exec postgres pg_isready
   
   # Redémarrer PostgreSQL
   docker-compose restart postgres
   ```

### Logs de debug

```bash
# Logs détaillés
docker-compose logs --tail=200 ecodeli-app

# Logs de la base de données
docker-compose logs postgres

# Logs du reverse proxy
docker-compose logs nginx
```

## 📈 Performance

### Optimisations recommandées

1. **Ressources allouées**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1.0'
         memory: 512M
   ```

2. **Cache Redis** (optionnel)
   - Non utilisé selon les spécifications
   - Peut être ajouté si nécessaire

3. **Monitoring**
   - Prometheus pour les métriques
   - Grafana pour les dashboards
   - Alerting configuré

## 🌐 Déploiement en production

### Configuration serveur

```bash
# Installation Docker sur Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installation Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Déploiement automatisé

```bash
# Script de déploiement production
./scripts/deploy.sh deploy prod

# Vérification du déploiement
./scripts/health-check.sh prod
```

## 📞 Support

Pour toute question ou problème :

1. Vérifiez les logs : `docker-compose logs -f`
2. Consultez le health check : `./scripts/health-check.sh`
3. Vérifiez la documentation : `README.md`

## 🔄 Conformité cahier des charges

Cette configuration Docker respecte les exigences suivantes :

- ✅ Déploiement packagé pour installation facile
- ✅ Script d'installation automatisé
- ✅ Gestion des bases de données
- ✅ Configuration des bibliothèques
- ✅ Serveur web personnel configuré
- ✅ Gestion des erreurs et réécriture d'URL
- ✅ Haute disponibilité avec health checks
- ✅ Sauvegarde automatique
- ✅ Monitoring et logs
- ✅ Sécurité renforcée