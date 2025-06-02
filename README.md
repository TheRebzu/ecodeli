Je dois créer la structure de base pour un système de seeds modulaire. Voici ce qu'il faut mettre en place :

### STRUCTURE DE BASE À CRÉER

1. **Fichier orchestrateur principal** : `/prisma/seeds/run-all-seeds.ts`
   - Importe et exécute tous les seeds dans le bon ordre
   - Gère les dépendances entre les données
   - Options pour exécution partielle
   - Logging détaillé avec timestamps

2. **Fichiers de configuration** :
   - `/prisma/seeds/seed.config.ts` - Configuration globale (quantités, paramètres)
   - `/prisma/seeds/base/roles-seed.ts` - Rôles système (admin, client, deliverer, merchant, provider)
   - `/prisma/seeds/base/permissions-seed.ts` - Permissions par rôle
   - `/prisma/seeds/base/document-types-seed.ts` - Types de documents requis

3. **Utilitaires** dans `/prisma/seeds/utils/` :
   - `seed-helpers.ts` - Fonctions de génération de données
   - `seed-logger.ts` - Logger coloré pour suivre l'exécution
   - `seed-cleaner.ts` - Nettoyage sélectif avant seed
   - `seed-validator.ts` - Validation post-seed

4. **Scripts pnpm** à ajouter dans `package.json` :
   - `seed:all` - Exécute tous les seeds
   - `seed:base` - Seulement données de base
   - `seed:clean` - Nettoie la base
   - `seed:reset` - Clean + seed complet
   - `seed:validate` - Vérifie l'intégrité

### ORDRE D'EXÉCUTION
1. Clean (optionnel)
2. Base (roles, permissions, types)
3. Users
4. Documents/Verifications
5. Contracts
6. Services/Announcements
7. Financial
8. Notifications/Logs