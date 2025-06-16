# Scripts EcoDeli

Ce dossier contient les scripts utilitaires essentiels du projet EcoDeli après nettoyage.

## 📁 Structure

### Scripts conservés

#### 🔐 `/auth/`
Scripts d'authentification et gestion des sessions
- Extraction de tokens de session pour les tests
- Outils d'authentification pour le développement

#### 🧪 `/api-test/`
Suite complète de tests API tRPC
- Tests automatisés des endpoints
- Scénarios de test par rôle utilisateur
- Tests d'intégration complets
- Documentation des tests API

#### 🗃️ `/prisma/`
Scripts de gestion de la base de données Prisma
- Merge des schémas modulaires
- Validation des schémas
- Migrations et rollbacks
- Outils de maintenance DB

#### 🌱 `/seed/`
Scripts de peuplement de la base de données
- Seeds modulaires par fonctionnalité
- Données de test et de développement
- Configuration des seeds

#### 🌍 `/i18n/`
Scripts d'internationalisation
- Extraction automatique des traductions
- Génération des fichiers de langues
- Validation des traductions
- Outils de gestion i18n

#### 📊 `/monitoring/`
Scripts de surveillance et monitoring
- Health checks automatisés
- Surveillance des services

#### 🔧 `/diagnostics/`
Outils de diagnostic du projet
- Vérifications globales du projet
- Diagnostic de l'état de santé

#### 🛠️ `/maintenance/`
Scripts de maintenance du projet
- Configuration Husky
- Outils de maintenance générale

#### 📚 Documentation API
- `generate-api-docs.ts` - Génération automatique de la documentation API

## 🗑️ Scripts supprimés

Les dossiers et scripts suivants ont été supprimés car ils étaient temporaires ou obsolètes :

- **`/fixes/`** - Tous les scripts de correction temporaires (29 fichiers)
- **`/testing/`** - Scripts de test redondants (4 fichiers)
- **`/build/`** - Scripts de build obsolètes
- **Scripts isolés** : `add-api-docs.ts`, `test-swagger-access.js`
- **Scripts de diagnostic** redondants

## 📋 Utilisation

### Tests API
```bash
# Lancer tous les tests API
pnpm test:api

# Test d'un module spécifique
pnpm test:api:annonces

# Test avec un utilisateur spécifique
TEST_USER=deliverer pnpm test:api
```

### Gestion Prisma
```bash
# Merger les schémas
tsx scripts/prisma/merge-schemas.ts

# Valider les schémas
tsx scripts/prisma/validate-prisma-schema.ts
```

### Seeds
```bash
# Lancer tous les seeds
pnpm seed

# Seed spécifique
pnpm seed:users
```

### Internationalisation
```bash
# Extraire les traductions
tsx scripts/i18n/extract-labels.ts

# Générer les traductions
tsx scripts/i18n/generate-translations.ts
```

### Monitoring
```bash
# Health check
tsx scripts/monitoring/health-check.ts
```

## 📝 Notes

- Tous les scripts utilisent TypeScript et tsx pour l'exécution
- Les scripts d'API test nécessitent un serveur en cours d'exécution
- Les scripts Prisma nécessitent une base de données configurée
- Les scripts i18n sont optionnels si le projet n'utilise qu'une langue

## 🔄 Maintenance

Ce dossier est maintenant nettoyé et ne contient que les scripts essentiels au projet. Évitez d'ajouter des scripts temporaires ou de correction ici - utilisez des dossiers temporaires séparés si nécessaire. 