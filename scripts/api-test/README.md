# EcoDeli API Test Suite

Un système complet de test pour l'API tRPC d'EcoDeli avec gestion automatique de l'authentification et tests par rôle.

## 📋 Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Structure](#structure)
- [Utilisation](#utilisation)
- [Exemples](#exemples)
- [Développement](#développement)

## 🚀 Installation

1. Installer les dépendances nécessaires :
```bash
pnpm add -D axios chalk dotenv zod tsx
```

2. Copier le fichier de configuration :
```bash
cp scripts/api-test/.env.test.example scripts/api-test/.env.test
```

3. Configurer les variables d'environnement dans `.env.test`

## ⚙️ Configuration

### Variables d'environnement

Le fichier `.env.test` contient toutes les configurations nécessaires :

- `TEST_ENV` : Environnement à tester (development, staging, production)
- `VERBOSE` : Afficher les logs détaillés
- URLs et credentials des utilisateurs de test

### Utilisateurs de test

Le système inclut des utilisateurs prédéfinis pour chaque rôle :

```typescript
// Client
client: test.client@ecodeli.test
clientPremium: test.client.premium@ecodeli.test

// Livreur
deliverer: test.deliverer@ecodeli.test
delivererVerified: test.deliverer.verified@ecodeli.test

// Commerçant
merchant: test.merchant@ecodeli.test
merchantPro: test.merchant.pro@ecodeli.test

// Prestataire
provider: test.provider@ecodeli.test
providerCertified: test.provider.certified@ecodeli.test

// Admin
admin: test.admin@ecodeli.test
superAdmin: test.superadmin@ecodeli.test
```

## 📁 Structure

```
scripts/api-test/
├── config/
│   ├── api.config.ts       # Configuration des endpoints
│   ├── auth.config.ts      # Configuration d'authentification
│   └── users.config.ts     # Utilisateurs de test
├── helpers/
│   ├── auth.helper.ts      # Gestion de l'authentification
│   ├── request.helper.ts   # Wrapper pour les requêtes
│   └── logger.helper.ts    # Logging coloré
├── tests/
│   ├── auth/              # Tests d'authentification
│   ├── annonces/          # Tests des annonces
│   ├── livraisons/        # Tests des livraisons
│   ├── prestations/       # Tests des prestations
│   └── admin/             # Tests admin
└── scenarios/
    ├── client-flow.ts      # Scénario client complet
    ├── livreur-flow.ts     # Scénario livreur complet
    └── full-cycle.ts       # Cycle complet de livraison
```

## 🎯 Utilisation

### Scripts NPM

Ajouter ces scripts dans `package.json` :

```json
{
  "scripts": {
    "test:api": "tsx scripts/api-test/index.ts",
    "test:api:auth": "tsx scripts/api-test/tests/auth/login.test.ts",
    "test:api:annonces": "tsx scripts/api-test/tests/annonces/annonces.test.ts",
    "test:api:scenario": "tsx scripts/api-test/scenarios/full-cycle.ts",
    "test:api:all": "tsx scripts/api-test/run-all-tests.ts"
  }
}
```

### Commandes

```bash
# Tester le module des annonces
pnpm test:api:annonces

# Exécuter un scénario complet
pnpm test:api:scenario

# Tester avec un utilisateur spécifique
TEST_USER=deliverer pnpm test:api:annonces

# Mode verbose
VERBOSE=true pnpm test:api:scenario
```

## 📚 Exemples

### Test simple d'une route

```typescript
import { RequestHelper } from '../helpers/request.helper';
import { defaultUsers } from '../config/users.config';

// Faire une requête authentifiée
const announcements = await RequestHelper.trpc(
  defaultUsers.client,
  'client.announcements.list',
  { page: 1, limit: 10 }
);
```

### Test avec validation Zod

```typescript
import { z } from 'zod';

const AnnouncementSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED'])
});

const result = await RequestHelper.trpc(
  user,
  'client.announcements.get',
  { id: 'announcement-id' }
);

// Valider la réponse
const validated = AnnouncementSchema.parse(result);
```

### Créer un nouveau test

```typescript
import { Logger } from '../../helpers/logger.helper';
import { RequestHelper } from '../../helpers/request.helper';
import { defaultUsers } from '../../config/users.config';

export class MyFeatureTests {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MyFeature');
  }

  async testCreateItem() {
    this.logger.title('Test: Create Item');
    
    try {
      const result = await RequestHelper.trpc(
        defaultUsers.client,
        'client.myFeature.create',
        { name: 'Test Item' }
      );
      
      this.logger.success('Item created', result);
      return result;
      
    } catch (error) {
      this.logger.error('Failed to create item', error);
      throw error;
    }
  }
}
```

### Scénario end-to-end

```typescript
export async function myScenario() {
  const logger = new Logger('MyScenario');
  
  // 1. Login as client
  const client = defaultUsers.client;
  logger.info('Starting scenario as client...');
  
  // 2. Create announcement
  const announcement = await RequestHelper.trpc(
    client,
    'client.announcements.create',
    { /* data */ }
  );
  
  // 3. Switch to deliverer
  const deliverer = defaultUsers.deliverer;
  
  // 4. Apply to announcement
  await RequestHelper.trpc(
    deliverer,
    'deliverer.announcements.apply',
    { announcementId: announcement.id }
  );
  
  // Continue scenario...
}
```

## 🛠️ Développement

### Ajouter un nouveau module de test

1. Créer un dossier dans `tests/` :
```bash
mkdir scripts/api-test/tests/mon-module
```

2. Créer le fichier de test :
```typescript
// scripts/api-test/tests/mon-module/mon-module.test.ts
export class MonModuleTests {
  // Implémentation
}
```

3. Ajouter au runner principal si nécessaire

### Logger personnalisé

```typescript
const logger = new Logger('MonModule', {
  showTimestamp: true,
  colorize: true,
  verbose: true
});

// Logs colorés
logger.info('Information');
logger.success('Succès!');
logger.warning('Attention');
logger.error('Erreur', error);

// Logs de requête/réponse
logger.request('POST', '/api/endpoint', data);
logger.response(200, responseData, 123); // 123ms
```

### Gestion des erreurs

Le système gère automatiquement :
- Retry avec backoff exponentiel
- Refresh des tokens expirés
- Logging détaillé des erreurs
- Validation des réponses

## 🔍 Debugging

### Mode verbose

```bash
VERBOSE=true pnpm test:api:annonces
```

### Logs détaillés

Les logs incluent :
- Timestamps
- Niveaux (INFO, SUCCESS, WARNING, ERROR)
- Contexte (Auth, Request, Test)
- Durée des requêtes
- Corps des requêtes/réponses (en mode verbose)

### Erreurs communes

1. **401 Unauthorized** : Token expiré ou invalide
   - Solution : Le système refresh automatiquement

2. **Network Error** : Serveur inaccessible
   - Vérifier que le serveur est lancé
   - Vérifier l'URL dans `.env.test`

3. **Validation Error** : Schéma Zod invalide
   - Vérifier la structure de la réponse
   - Mettre à jour le schéma si nécessaire

## 📝 Best Practices

1. **Isolation des tests** : Chaque test doit être indépendant
2. **Nettoyage** : Supprimer les données créées après les tests
3. **Validation** : Toujours valider les réponses avec Zod
4. **Logging** : Utiliser le logger pour la traçabilité
5. **Gestion d'erreurs** : Toujours gérer les cas d'erreur

## 🤝 Contribution

Pour ajouter de nouveaux tests :

1. Suivre la structure existante
2. Documenter les nouveaux endpoints
3. Ajouter des exemples d'utilisation
4. Tester avec différents rôles
5. Valider les edge cases