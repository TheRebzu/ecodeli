# EcoDeli CI/CD - Guide Complet

Ce guide détaille la configuration complète CI/CD pour EcoDeli avec Jenkins et GitHub Actions selon les exigences du cahier des charges.

## 🎯 Vue d'ensemble

EcoDeli dispose d'une infrastructure CI/CD complète avec :
- **Jenkins** pour l'intégration continue
- **GitHub Actions** pour l'automatisation
- **SonarQube** pour la qualité du code
- **Docker Registry** pour les images
- **Monitoring** avec Prometheus/Grafana
- **Notifications** multi-canaux

## 🚀 Démarrage rapide

### 1. Configuration initiale

```bash
# Cloner le repository
git clone https://github.com/ecodeli/platform.git
cd platform

# Configuration CI/CD
chmod +x scripts/ci-setup.sh
./scripts/ci-setup.sh all
```

### 2. Configuration des secrets

```bash
# Copier le fichier de secrets
cp .env.secrets.example .env.secrets

# Configurer les secrets
nano .env.secrets
```

## 🛠️ Infrastructure CI/CD

### Services disponibles

| Service | URL | Description |
|---------|-----|-------------|
| Jenkins | http://localhost:8081 | Serveur d'intégration continue |
| SonarQube | http://localhost:9000 | Analyse qualité du code |
| Registry | http://localhost:5000 | Registry Docker privé |
| Prometheus | http://localhost:9090 | Monitoring des métriques |
| Grafana | http://localhost:3001 | Visualisation des données |
| Portainer | https://localhost:9443 | Gestion des containers |

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   Jenkins       │    │   Docker        │
│   Repository    │────│   Master        │────│   Registry      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │              ┌─────────────────┐              │
        │              │   SonarQube     │              │
        │              │   Quality Gate  │              │
        │              │                 │              │
        │              └─────────────────┘              │
        │                       │                       │
        │              ┌─────────────────┐              │
        └──────────────│   Deployment    │──────────────┘
                       │   Environments  │
                       │                 │
                       └─────────────────┘
```

## 📋 Pipelines disponibles

### 1. Pipeline principal (Jenkins)

**Fichier:** `ci/jenkins/Jenkinsfile`

**Étapes:**
1. ✅ Checkout du code
2. ✅ Installation des dépendances
3. ✅ Analyse qualité (ESLint, TypeScript)
4. ✅ Tests unitaires
5. ✅ Tests d'intégration
6. ✅ Analyse SonarQube
7. ✅ Build de l'application
8. ✅ Build de l'image Docker
9. ✅ Scan de sécurité
10. ✅ Tests E2E
11. ✅ Déploiement
12. ✅ Tests de smoke
13. ✅ Tests de performance

### 2. Pipeline de déploiement (Jenkins)

**Fichier:** `ci/jenkins/Jenkinsfile.deploy`

**Étapes:**
1. ✅ Validation pré-déploiement
2. ✅ Sauvegarde état actuel
3. ✅ Déploiement sur environnement
4. ✅ Health check
5. ✅ Tests post-déploiement
6. ✅ Baseline de performance
7. ✅ Mise à jour monitoring
8. ✅ Nettoyage

### 3. GitHub Actions

**Fichiers:**
- `.github/workflows/ci.yml` - Pipeline principal
- `.github/workflows/deploy.yml` - Déploiement manuel

## 🔧 Configuration Jenkins

### Installation automatique

```bash
# Démarrer Jenkins avec tous les plugins
./scripts/ci-setup.sh jenkins

# Accéder à Jenkins
open http://localhost:8081
```

### Configuration manuelle

1. **Plugins requis** (cf. `ci/jenkins/plugins.txt`)
2. **Configuration as Code** (cf. `ci/jenkins/jenkins.yaml`)
3. **Pipelines** automatiquement créés

### Credentials configurés

- `github-credentials` - Accès GitHub
- `docker-registry` - Registry Docker
- `sonar-token` - SonarQube
- `slack-token` - Notifications Slack

## 📊 Monitoring et Qualité

### SonarQube

```bash
# Accès SonarQube
http://localhost:9000
# Utilisateur: admin / Mot de passe: admin123

# Analyse manuelle
npm run sonar
```

### Métriques surveillées

- ✅ Couverture de code > 80%
- ✅ Bugs bloquants = 0
- ✅ Vulnérabilités = 0
- ✅ Code smells < 5%
- ✅ Duplication < 3%

### Monitoring Prometheus

```bash
# Métriques disponibles
curl http://localhost:9090/api/v1/query?query=up

# Dashboards Grafana
http://localhost:3001
```

## 🔔 Notifications

### Canaux supportés

1. **Slack** - Notifications temps réel
2. **Discord** - Notifications équipe
3. **Email** - Notifications critiques
4. **Microsoft Teams** - Notifications entreprise

### Types de notifications

```bash
# Déploiement
./scripts/notify.sh deployment success "Déploiement réussi"

# Build
./scripts/notify.sh build failure "Échec de compilation"

# Tests
./scripts/notify.sh test success "Tous les tests passent"

# Personnalisé
./scripts/notify.sh custom warning "Maintenance programmée"
```

## 🚢 Déploiement

### Environnements

| Environnement | Branche | URL | Déclencheur |
|---------------|---------|-----|-------------|
| Dev | develop | https://dev.ecodeli.com | Push automatique |
| Staging | main | https://staging.ecodeli.com | Manuel |
| Production | main | https://ecodeli.com | Manuel + approbation |

### Déploiement automatique

```bash
# Via Jenkins
curl -X POST "http://localhost:8081/job/ecodeli-deploy-prod/build" \
     --user "admin:admin123" \
     --data-urlencode "ENVIRONMENT=prod"

# Via script
./scripts/deploy.sh deploy prod
```

### Déploiement manuel (GitHub Actions)

1. Aller sur GitHub Actions
2. Sélectionner "EcoDeli Manual Deployment"
3. Configurer les paramètres
4. Lancer le déploiement

## 🧪 Tests

### Types de tests

```bash
# Tests unitaires
npm run test:ci

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests de performance
npm run test:performance

# Tests de smoke
npm run test:smoke
```

### Configuration Selenium

```bash
# Démarrer Selenium Grid
docker-compose -f docker-compose.ci.yml --profile testing up -d

# Vérifier les navigateurs
curl http://localhost:4444/wd/hub/status
```

## 📁 Structure des fichiers

```
ci/
├── jenkins/
│   ├── Jenkinsfile                 # Pipeline principal
│   ├── Jenkinsfile.deploy          # Pipeline déploiement
│   ├── jenkins.yaml                # Configuration as Code
│   └── plugins.txt                 # Plugins requis
├── webhooks/
│   ├── hooks.json                  # Configuration webhooks
│   └── scripts/                    # Scripts webhook
├── registry/
│   └── config.yml                  # Configuration registry
└── monitoring/
    ├── prometheus.yml              # Configuration Prometheus
    ├── alert_rules.yml             # Règles d'alerte
    └── ecodeli-dashboard.json      # Dashboard Grafana

.github/
└── workflows/
    ├── ci.yml                      # Pipeline GitHub Actions
    └── deploy.yml                  # Déploiement manuel

scripts/
├── ci-setup.sh                     # Configuration automatique
├── deploy.sh                       # Déploiement
├── backup.sh                       # Sauvegarde
├── restore.sh                      # Restauration
├── health-check.sh                 # Vérification santé
├── notify.sh                       # Notifications
└── update-monitoring.sh            # Mise à jour monitoring
```

## 🔐 Sécurité

### Bonnes pratiques

1. **Secrets** stockés en variables d'environnement
2. **Scan de sécurité** des images Docker
3. **Authentification** requise pour tous les services
4. **RBAC** configuré dans Jenkins
5. **Audit** des accès et actions

### Scan de sécurité

```bash
# Audit npm
npm audit

# Scan Docker avec Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasecurity/trivy image ecodeli/platform:latest
```

## 📈 Performance

### Métriques surveillées

- ✅ Temps de réponse < 2s
- ✅ Taux d'erreur < 1%
- ✅ Disponibilité > 99.9%
- ✅ Temps de build < 10min
- ✅ Temps de déploiement < 5min

### Optimisations

1. **Cache** des dépendances npm
2. **Build** multi-stage Docker
3. **Parallélisation** des tests
4. **CDN** pour les assets statiques

## 🔧 Dépannage

### Problèmes courants

#### Jenkins ne démarre pas
```bash
# Vérifier les logs
docker-compose logs jenkins

# Vérifier l'espace disque
df -h

# Redémarrer Jenkins
docker-compose restart jenkins
```

#### SonarQube inaccessible
```bash
# Vérifier la mémoire
docker stats sonarqube

# Augmenter la mémoire
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
sysctl -p
```

#### Builds échouent
```bash
# Vérifier les logs de build
docker-compose logs jenkins

# Nettoyer l'espace disque
docker system prune -a

# Vérifier la configuration
./scripts/health-check.sh
```

#### Tests E2E échouent
```bash
# Vérifier Selenium
curl http://localhost:4444/wd/hub/status

# Redémarrer Selenium
docker-compose restart selenium-hub selenium-chrome
```

## 📚 Commandes utiles

### Gestion des services

```bash
# Démarrer tous les services CI/CD
docker-compose -f docker-compose.yml -f docker-compose.ci.yml up -d

# Arrêter tous les services
docker-compose -f docker-compose.yml -f docker-compose.ci.yml down

# Vérifier l'état
docker-compose -f docker-compose.yml -f docker-compose.ci.yml ps

# Logs en temps réel
docker-compose -f docker-compose.yml -f docker-compose.ci.yml logs -f
```

### Gestion des builds

```bash
# Déclencher un build
curl -X POST "http://localhost:8081/job/ecodeli-ci-pipeline/build" \
     --user "admin:admin123"

# Vérifier le statut
curl -s "http://localhost:8081/job/ecodeli-ci-pipeline/lastBuild/api/json" \
     --user "admin:admin123" | jq '.result'

# Arrêter un build
curl -X POST "http://localhost:8081/job/ecodeli-ci-pipeline/123/stop" \
     --user "admin:admin123"
```

### Gestion du registry

```bash
# Lister les images
curl http://localhost:5000/v2/_catalog

# Vérifier une image
curl http://localhost:5000/v2/ecodeli/platform/tags/list

# Supprimer une image
curl -X DELETE http://localhost:5000/v2/ecodeli/platform/manifests/sha256:...
```

## 🔄 Mise à jour

### Mise à jour des services

```bash
# Mettre à jour Jenkins
docker-compose pull jenkins
docker-compose up -d jenkins

# Mettre à jour les plugins
docker-compose exec jenkins jenkins-plugin-cli --plugins "$(cat ci/jenkins/plugins.txt | tr '\n' ' ')"

# Redémarrer tous les services
docker-compose restart
```

### Mise à jour des pipelines

```bash
# Recharger la configuration Jenkins
curl -X POST "http://localhost:8081/reload" --user "admin:admin123"

# Mettre à jour les jobs
curl -X POST "http://localhost:8081/job/ecodeli-ci-pipeline/config.xml" \
     --user "admin:admin123" \
     --data-binary "@ci/jenkins/Jenkinsfile"
```

## 🎯 Conformité cahier des charges

Cette configuration CI/CD respecte les exigences suivantes :

### ✅ Exigences techniques
- Docker pour le packaging
- Scripts d'installation automatisés
- Tests automatisés complets
- Déploiement automatisé
- Monitoring et alerting
- Notifications multi-canaux
- Sécurité renforcée

### ✅ Exigences fonctionnelles
- Intégration continue
- Déploiement continu
- Rollback automatique
- Tests de non-régression
- Analyse qualité du code
- Audit de sécurité
- Documentation complète

### ✅ Exigences d'infrastructure
- Haute disponibilité
- Scalabilité
- Monitoring temps réel
- Sauvegarde automatique
- Recovery procedures
- Performance optimisée

## 📞 Support

### Contacts

- **Équipe DevOps:** devops@ecodeli.com
- **Support technique:** support@ecodeli.com
- **Documentation:** https://docs.ecodeli.com

### Ressources

- **Runbooks:** `docs/runbooks/`
- **Architecture:** `docs/architecture/`
- **Monitoring:** `docs/monitoring/`
- **Troubleshooting:** `docs/troubleshooting/`

---

*Cette documentation est automatiquement mise à jour à chaque déploiement.*