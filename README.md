# EcoDeli - Plateforme de Livraison Collaborative

![EcoDeli Logo](docs/images/ecodeli-logo.png)

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![JavaFX](https://img.shields.io/badge/JavaFX-17-orange.svg)](https://openjfx.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌟 Présentation

EcoDeli est une plateforme complète de livraison collaborative développée pour optimiser les services de livraison locaux. Le projet comprend trois applications principales containerisées avec Docker pour assurer une haute disponibilité et une facilité de déploiement.

### 🎯 Objectifs

- **Livraison Collaborative** : Connecter clients, livreurs et commerçants
- **Écologie** : Optimiser les trajets pour réduire l'empreinte carbone
- **Scalabilité** : Architecture microservices containerisée
- **Monitoring** : Surveillance complète avec Prometheus/Grafana
- **Sécurité** : SSL/TLS, authentification robuste

## 🏗️ Architecture

```
EcoDeli/
├── apps/
│   ├── web/          # Application Web (Next.js + tRPC)
│   ├── mobile/       # Application Mobile (React Native) [À développer]
│   └── desktop/      # Application Desktop (JavaFX)
├── docker/           # Configuration Docker
├── scripts/          # Scripts de déploiement et maintenance
└── docs/            # Documentation
```

### 🔧 Stack Technique

**Frontend Web:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- tRPC pour l'API

**Desktop:**
- Java 17 + JavaFX
- Client tRPC
- Génération PDF avec graphiques
- Module Data Mining (Weka)

**Backend & Infrastructure:**
- PostgreSQL 16 (Base de données)
- Redis (Cache)
- Nginx (Reverse Proxy + SSL)
- Prometheus + Grafana (Monitoring)
- Docker + Docker Compose (Orchestration)

## 🚀 Démarrage Rapide

### Prérequis

- Docker 24.0+
- Docker Compose 2.0+
- Git
- 8GB RAM minimum
- 20GB espace disque

### Installation

1. **Cloner le repository**
```bash
git clone https://github.com/your-org/ecodeli.git
cd ecodeli
```

2. **Configuration environnement**
```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

3. **Initialisation complète**
```bash
chmod +x scripts/deploy.sh scripts/maintenance.sh
./scripts/deploy.sh init
```

4. **Vérification**
```bash
./scripts/deploy.sh status
```

### 🌐 Accès aux Applications

| Service | URL | Description |
|---------|-----|-------------|
| Application Web | http://localhost | Interface principale |
| Desktop API | http://localhost:8080 | API Application Desktop |
| Monitoring | http://localhost/monitoring | Tableau de bord Grafana |
| Prometheus | http://localhost:9090 | Métriques système |

## 📊 Applications

### 🌐 Application Web (Next.js)

Interface principale pour tous les utilisateurs (clients, livreurs, commerçants, administrateurs).

**Fonctionnalités principales:**
- Authentification multi-rôles
- Gestion des annonces de livraison
- Suivi en temps réel
- Système de paiement
- Interface administrateur

**Technologies:**
- Next.js 14 avec App Router
- tRPC pour l'API type-safe
- Prisma ORM
- NextAuth.js pour l'authentification
- Tailwind CSS pour le styling

### 🖥️ Application Desktop (JavaFX)

Application desktop pour la génération de rapports et l'analyse de données.

**Fonctionnalités:**
- Génération de rapports PDF avec graphiques
- Minimum 4 graphiques par page, 2 pages minimum
- 30+ enregistrements de test par type de données
- Module Data Mining (bonus)
- Interface graphique JavaFX

**Spécifications techniques:**
- Java 17 + JavaFX 19
- Client tRPC pour communication avec le backend
- PDFBox pour génération PDF
- JFreeChart pour les graphiques
- Weka pour le Data Mining

### 📱 Application Mobile (À développer)

Application mobile React Native (structure préparée).

## 🐳 Docker & Déploiement

### Structure Docker

```
docker/
├── nginx/           # Reverse proxy + SSL
├── postgres/        # Base de données + backup
├── backup/          # Service de backup automatisé
├── prometheus/      # Monitoring
└── grafana/         # Dashboards
```

### Environnements

- **Development**: `docker-compose.dev.yml`
- **Staging**: `docker-compose.staging.yml`
- **Production**: `docker-compose.prod.yml`

### Commandes Principales

```bash
# Déploiement
./scripts/deploy.sh deploy --env production

# Maintenance
./scripts/maintenance.sh health
./scripts/maintenance.sh monitor

# Backup
./scripts/deploy.sh backup

# Logs
./scripts/deploy.sh logs web
```

## 🔒 Sécurité

### Certificats SSL

- Auto-génération pour développement
- Support Let's Encrypt pour production
- Renouvellement automatique

### Authentification

- NextAuth.js avec support OAuth
- 2FA (Two-Factor Authentication)
- JWT sécurisés
- Gestion des rôles et permissions

### Données

- Chiffrement des données sensibles
- Backup automatisé quotidien (23h)
- Backup mensuel (30 de chaque mois)
- Rétention configurable

## 📈 Monitoring & Observabilité

### Métriques Collectées

- **Infrastructure**: CPU, RAM, Disque, Réseau
- **Applications**: Temps de réponse, Erreurs, Throughput
- **Business**: Livraisons, Paiements, Utilisateurs actifs
- **Base de données**: Connexions, Requêtes lentes, Taille

### Alertes

- Email/Webhook automatiques
- Seuils configurables
- Escalade par niveau de gravité

### Dashboards Grafana

- Vue d'ensemble système
- Métriques business
- Performance applications
- Analyse des erreurs

## 🛠️ Maintenance

### Backup Automatisé

**Quotidien (23h00):**
- Base de données PostgreSQL
- Cache Redis
- Fichiers uploads
- Logs système

**Mensuel (30 de chaque mois):**
- Archive complète
- Rapport de backup
- Vérification d'intégrité

### Scripts de Maintenance

```bash
# Vérification santé système
./scripts/maintenance.sh health

# Optimisation performances
./scripts/maintenance.sh optimize

# Audit de sécurité
./scripts/maintenance.sh security

# Mode maintenance
./scripts/maintenance.sh maintenance-mode on
```

## 🧪 Tests & Qualité

### Tests Automatisés

- Tests unitaires (Jest)
- Tests d'intégration (Playwright)
- Tests API (Supertest)
- Health checks Docker

### CI/CD (À configurer)

- GitHub Actions / GitLab CI
- Tests automatiques
- Build des images Docker
- Déploiement automatisé

## 📝 API Documentation

### tRPC Endpoints

L'API utilise tRPC pour une communication type-safe entre le frontend et le backend.

**Principales routes:**
- `/api/trpc/auth.*` - Authentification
- `/api/trpc/admin.*` - Administration
- `/api/trpc/deliveries.*` - Gestion livraisons
- `/api/trpc/payments.*` - Système de paiement

### Authentification API

```typescript
// Headers requis
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

## 🔧 Configuration

### Variables d'Environnement

```bash
# Base de données
DATABASE_URL="postgresql://user:password@postgres:5432/ecodeli"

# Cache
REDIS_URL="redis://redis:6379"

# Authentification
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD="admin-password"

# Backup
BACKUP_SCHEDULE_DAILY="0 23 * * *"
BACKUP_RETENTION_DAYS=30
```

### Configuration Desktop

```hocon
# application.conf
backend {
  url = "http://localhost:3000"
  apiKey = "your-api-key"
  connectionTimeout = 30000
  readTimeout = 60000
}

reports {
  minTestRecords = 30
  graphsPerPage = 4
  minPages = 2
}

pdf {
  outputPath = "/app/reports"
  autoOpen = true
}

dataMining {
  enabled = true
  algorithms = ["J48", "NaiveBayes", "RandomForest"]
}
```

## 🚨 Dépannage

### Problèmes Courants

**Services ne démarrent pas:**
```bash
# Vérifier les logs
./scripts/deploy.sh logs

# Vérifier l'espace disque
df -h

# Redémarrer
./scripts/deploy.sh restart
```

**Base de données corrompue:**
```bash
# Restaurer depuis backup
./scripts/maintenance.sh database backup
./scripts/deploy.sh restore latest-backup.sql
```

**Problèmes de performance:**
```bash
# Optimisation
./scripts/maintenance.sh optimize

# Monitoring en temps réel
./scripts/maintenance.sh monitor
```

### Logs Importants

```bash
# Logs applicatifs
docker-compose logs web
docker-compose logs desktop

# Logs infrastructure
docker-compose logs nginx
docker-compose logs postgres

# Logs monitoring
docker-compose logs prometheus
docker-compose logs grafana
```

## 🤝 Contribution

### Développement Local

1. Fork du repository
2. Création d'une branche feature
3. Développement avec tests
4. Pull Request avec description

### Standards de Code

- TypeScript strict
- ESLint + Prettier
- Tests unitaires obligatoires
- Documentation JSDoc

### Commits

Format: `type(scope): description`

Exemples:
- `feat(web): add user authentication`
- `fix(desktop): resolve PDF generation issue`
- `docs(readme): update installation guide`

## 📄 License

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

- **Chef de Projet**: [Nom]
- **Développeur Full-Stack**: [Nom]
- **Développeur Java**: [Nom]
- **DevOps**: [Nom]

## 📞 Support

- **Documentation**: [Wiki du projet](wiki/README.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/ecodeli/issues)
- **Email**: support@ecodeli.com

## 🗺️ Roadmap

### Version 1.1
- [ ] Application mobile React Native
- [ ] Notifications push
- [ ] Géolocalisation avancée

### Version 1.2
- [ ] IA pour optimisation des trajets
- [ ] API publique pour partenaires
- [ ] Multi-tenancy

### Version 2.0
- [ ] Blockchain pour traçabilité
- [ ] IoT pour suivi des colis
- [ ] Machine Learning prédictif

---

*Documentation mise à jour le: $(date)*
*Version: 1.0.0*