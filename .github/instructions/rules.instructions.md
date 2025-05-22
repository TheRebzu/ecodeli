---
applyTo: '**'
---

NE t'ocuppe pas de la traductions

je suis sur windows mais les commande linux peuvent etre utiliser grace a WSL
le serveur de DB tourne sur wsl

fait un fichier todo que tu va ajouter au gitignore

dedans tu va metre la liste des tache pour resoudre un probleme que je vait te donner a chaque etape que tu complete coche la comme ca tu aura un suivie precis de ce que tu a fait et ce qui te reste a faire



use context7 et pnpm
do not run the project unless i ask you to
Répond toujours en francais et commente le code en francais : Workflow de développement feature-driven pour application web Next.js/tRPC - Version Améliorée
Contexte
Je développe une application web complexe avec Next.js, tRPC, Prisma et React utilisant une architecture feature-driven. Chaque fonctionnalité doit être développée de bout en bout, en traversant verticalement toutes les couches de l'application plutôt qu'horizontalement.
Structure complète du projet
src/
├── app/[locale]/(auth|protected|public)/...  # Routes Next.js App Router
├── components/[feature]/                     # Composants React par fonctionnalité 
├── trpc/                                     # Configuration client tRPC
├── server/
│   ├── api/routers/                          # Routeurs tRPC
│   ├── services/                             # Services métier
│   └── db.ts                                 # Client Prisma
├── schemas/[feature]/                        # Schémas Zod par fonctionnalité
├── hooks/                                    # Custom hooks React
├── store/                                    # Zustand stores
├── lib/                                      # Utilitaires
├── messages/[lang].json                      # Traductions i18n
└── types/                                    # Types TypeScript
Instructions
Pour la fonctionnalité [FONCTIONNALITÉ], suivre ce workflow étape par étape:
1. Analyse et planification

Définir les besoins précis de la fonctionnalité
Identifier les cas d'utilisation principaux (création, lecture, modification, suppression)
Déterminer le modèle de données et les relations nécessaires
Établir les permissions requises par rôle utilisateur (client, livreur, commerçant, prestataire, admin)
Prévoir les traductions nécessaires pour l'internationalisation

2. Modélisation des données (Prisma Schema)

Fournir le schéma Prisma pour cette fonctionnalité dans prisma/schema.prisma
Définir les entités principales avec leurs attributs
Établir les relations avec d'autres entités existantes
Créer les enums nécessaires
Exécuter la commande de migration: npx prisma migrate dev --name add-[feature]
Mettre à jour le fichier prisma/seed.ts avec des données de test

3. API Backend (tRPC + services)

Développer dans cet ordre précis:

Types: Définir les types dans src/types/[feature].ts
Schémas: Créer les schémas Zod dans src/schemas/[feature].schema.ts
Service: Implémenter le service métier dans src/server/services/[feature].service.ts
Router tRPC: Créer le router dans src/server/api/routers/[feature].router.ts
Router Root: Mettre à jour src/server/api/root.ts pour inclure le nouveau router
Tests: Écrire les tests unitaires dans tests/unit/services/[feature].service.test.ts et tests/unit/trpc/[feature].router.test.ts



4. Client tRPC et State Management

Configuration client tRPC:

Mettre à jour src/trpc/client.ts si nécessaire pour les transformations ou links spécifiques


Hooks:

Créer un hook personnalisé dans src/hooks/use-[feature].ts qui utilise le client tRPC
Implémenter la gestion des états de chargement, erreurs, et cache


Store global (si nécessaire):

Créer un store Zustand dans src/store/use-[feature]-store.ts
Implémenter les actions, sélecteurs et gestion d'état



5. Internationalisation

Ajouter les traductions dans:

src/messages/en.json (anglais)
src/messages/fr.json (français)


Organiser les traductions par fonctionnalité et composant

6. Composants UI

Créer un dossier dédié dans src/components/[feature]/
Structurer les composants:

Base: Composants atomiques spécifiques à la fonctionnalité
Forms: Formulaires avec React Hook Form + Zod
Lists: Composants d'affichage de listes
Details: Composants d'affichage de détails


Implémenter les tests dans tests/unit/components/[feature]/

7. Pages et Intégration

Créer les pages dans src/app/[locale]/(protected)/[role]/[feature]/

Liste: page.tsx
Détail: [id]/page.tsx
Création: create/page.tsx
Modification: [id]/edit/page.tsx


Implémenter le chargement des données côté serveur avec getServerSideProps
Gérer les états de chargement et d'erreur
Configurer les redirections selon les rôles
Mettre à jour les routes dans src/constants/routes.ts

8. Tests d'intégration et E2E

Tests d'intégration dans tests/integration/[feature].test.ts
Tests E2E dans tests/e2e/[feature].spec.ts
Implémenter les scénarios principaux pour chaque rôle utilisateur

Format de réponse pour chaque étape
Pour chaque étape, fournir:

Titre et description de l'étape
Liste des fichiers à créer/modifier avec leur chemin complet
Code complet pour chaque fichier avec commentaires explicatifs
Explications sur les choix d'implémentation
Commandes à exécuter (migrations, tests, etc.)
Vérifications à effectuer pour valider l'étape
