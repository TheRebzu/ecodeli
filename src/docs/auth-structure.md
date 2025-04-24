# Structure d'authentification pour Ecodeli

Ce document présente une structure de fichiers complète pour l'authentification utilisateur dans l'application Ecodeli. Cette structure s'intègre au framework Next.js et utilise NextAuth.js pour la gestion de l'authentification, tout en respectant l'architecture existante avec tRPC et Prisma.

## Structure des répertoires

```
src/
├── app/
│   ├── (auth)/                        # Routes d'authentification
│   │   ├── login/                     # Page de connexion
│   │   │   └── page.tsx               # Composant de page de connexion
│   │   ├── register/                  # Page d'inscription principale
│   │   │   ├── page.tsx               # Sélecteur de type d'utilisateur
│   │   │   ├── client/                # Inscription client
│   │   │   │   └── page.tsx           # Formulaire client
│   │   │   ├── deliverer/             # Inscription livreur
│   │   │   │   └── page.tsx           # Formulaire livreur
│   │   │   ├── merchant/              # Inscription commerçant
│   │   │   │   └── page.tsx           # Formulaire commerçant
│   │   │   └── provider/              # Inscription prestataire
│   │   │       └── page.tsx           # Formulaire prestataire
│   │   ├── verify/                    # Vérification d'email
│   │   │   └── page.tsx               # Page de vérification
│   │   ├── document-verification/     # Vérification des documents
│   │   │   └── page.tsx               # Page de statut de vérification
│   │   ├── reset-password/            # Réinitialisation de mot de passe
│   │   │   └── page.tsx               # Première étape (demande)
│   │   ├── new-password/              # Nouvelle étape de mot de passe
│   │   │   ├── page.tsx               # Page pour définir un nouveau mot de passe
│   │   │   └── [token]/               # Route avec token de réinitialisation
│   │   │       └── page.tsx           # Page avec formulaire
│   │   └── layout.tsx                 # Layout commun pour les pages d'auth
│   ├── (dashboard)/
│   │   ├── profile/                   # Gestion du profil utilisateur
│   │   │   └── page.tsx               # Page du profil
│   │   ├── onboarding/                # Tutoriel première connexion
│   │   │   ├── client/                # Tutoriel client
│   │   │   ├── deliverer/             # Tutoriel livreur
│   │   │   ├── merchant/              # Tutoriel commerçant
│   │   │   └── provider/              # Tutoriel prestataire
│   │   └── settings/                  # Paramètres utilisateur
│   │       ├── page.tsx               # Page principale des paramètres
│   │       ├── account/               # Paramètres du compte
│   │       │   └── page.tsx           # Page des paramètres du compte
│   │       ├── security/              # Paramètres de sécurité
│   │       │   └── page.tsx           # Page des paramètres de sécurité
│   │       ├── documents/             # Gestion des documents (livreur)
│   │       │   └── page.tsx           # Page de gestion des documents
│   │       └── notifications/         # Préférences de notification
│   │           └── page.tsx           # Page des préférences de notification
│   └── api/                           # Routes API Next.js
│       ├── auth/                      # API d'authentification
│       │   ├── [...nextauth]/         # Configuration NextAuth
│       │   │   └── route.ts           # Route API NextAuth
│       │   ├── register/              # API d'inscription
│       │   │   ├── route.ts           # Endpoint général d'inscription
│       │   │   ├── client.ts          # Logique spécifique client
│       │   │   ├── deliverer.ts       # Logique spécifique livreur
│       │   │   ├── merchant.ts        # Logique spécifique commerçant
│       │   │   └── provider.ts        # Logique spécifique prestataire
│       │   ├── verify-email/          # API de vérification d'email
│       │   │   └── route.ts           # Endpoint de vérification
│       │   ├── document-upload/       # API d'upload de documents
│       │   │   └── route.ts           # Endpoint d'upload
│       │   ├── document-verification/ # API de vérification de documents
│       │   │   └── route.ts           # Endpoint de vérification manuelle
│       │   └── reset-password/        # API de réinitialisation de mot de passe
│       │       └── route.ts           # Endpoint de réinitialisation
├── components/
│   ├── auth/                          # Composants d'authentification
│   │   ├── login-form.tsx             # Formulaire de connexion
│   │   ├── role-selector.tsx          # Sélecteur de type d'utilisateur
│   │   ├── register-forms/            # Formulaires d'inscription
│   │   │   ├── client-form.tsx        # Formulaire client
│   │   │   ├── deliverer-form.tsx     # Formulaire livreur
│   │   │   ├── merchant-form.tsx      # Formulaire commerçant
│   │   │   └── provider-form.tsx      # Formulaire prestataire
│   │   ├── form-steps/                # Étapes de formulaire
│   │   │   ├── personal-info.tsx      # Informations personnelles
│   │   │   ├── account-details.tsx    # Détails du compte
│   │   │   ├── address-info.tsx       # Informations d'adresse
│   │   │   └── role-specific-info.tsx # Informations spécifiques au rôle
│   │   ├── password-reset-form.tsx    # Formulaire de réinitialisation
│   │   ├── new-password-form.tsx      # Formulaire de nouveau mot de passe
│   │   ├── oauth-buttons.tsx          # Boutons de connexion OAuth
│   │   ├── email-verification.tsx     # Composant de vérification d'email
│   │   ├── two-factor-auth.tsx        # 2FA (authentification à deux facteurs)
│   │   └── logout-button.tsx          # Bouton de déconnexion
│   ├── onboarding/                    # Composants d'onboarding
│   │   ├── onboarding-wrapper.tsx     # Wrapper pour le tutoriel
│   │   ├── first-login-tutorial.tsx   # Tutoriel première connexion
│   │   ├── tutorial-steps/            # Étapes de tutoriel
│   │   │   ├── client-steps.tsx       # Étapes pour client
│   │   │   ├── deliverer-steps.tsx    # Étapes pour livreur
│   │   │   ├── merchant-steps.tsx     # Étapes pour commerçant
│   │   │   └── provider-steps.tsx     # Étapes pour prestataire
│   │   └── progress-tracker.tsx       # Suivi de progression du tutoriel
│   ├── documents/                     # Gestion des documents
│   │   ├── document-upload.tsx        # Upload de documents
│   │   ├── document-preview.tsx       # Prévisualisation de documents
│   │   ├── document-status.tsx        # Statut de vérification
│   │   └── verification-steps.tsx     # Étapes de vérification
│   ├── profile/                       # Composants de gestion de profil
│   │   ├── profile-form.tsx           # Formulaire d'édition de profil
│   │   ├── change-password-form.tsx   # Formulaire de changement de mot de passe
│   │   ├── delete-account-form.tsx    # Formulaire de suppression de compte
│   │   └── profile-image-upload.tsx   # Upload d'image de profil
│   └── shared/                        # Composants partagés
│       ├── protected-route.tsx        # HOC pour les routes protégées
│       ├── role-protected-route.tsx   # HOC pour routes protégées par rôle
│       └── auth-status.tsx            # Affichage du statut d'authentification
├── lib/
│   ├── auth/                          # Utilitaires d'authentification
│   │   ├── auth-options.ts            # Options NextAuth
│   │   ├── session.ts                 # Gestion et typage des sessions
│   │   ├── password-utils.ts          # Utilitaires de hachage des mots de passe
│   │   ├── email-templates.ts         # Templates d'emails d'authentification
│   │   ├── jwt-utils.ts               # Utilitaires JWT
│   │   ├── rate-limiting.ts           # Limitation de débit pour la sécurité
│   │   ├── role-verification.ts       # Vérification spécifique au rôle
│   │   └── oauth-providers.ts         # Configuration des fournisseurs OAuth
│   ├── validation/                    # Validation des données
│   │   ├── auth-schemas.ts            # Schémas Zod pour l'authentification
│   │   ├── client-schema.ts           # Validation spécifique client
│   │   ├── deliverer-schema.ts        # Validation spécifique livreur
│   │   ├── merchant-schema.ts         # Validation spécifique commerçant
│   │   └── provider-schema.ts         # Validation spécifique prestataire
│   ├── documents/                     # Gestion des documents
│   │   ├── document-storage.ts        # Stockage des documents
│   │   ├── document-processing.ts     # Traitement des documents
│   │   └── verification-queue.ts      # File d'attente de vérification
│   └── notifications/                 # Système de notifications
│       ├── push-notifications.ts      # Intégration OneSignal
│       └── auth-events.ts             # Événements d'authentification
├── server/
│   ├── api/routers/                   # Routeurs tRPC
│   │   ├── auth.ts                    # Routeur d'authentification tRPC
│   │   ├── user.ts                    # Routeur de gestion utilisateur
│   │   ├── client.ts                  # Routeur spécifique client
│   │   ├── deliverer.ts               # Routeur spécifique livreur
│   │   ├── merchant.ts                # Routeur spécifique commerçant
│   │   └── provider.ts                # Routeur spécifique prestataire
│   └── services/                      # Services métier
│       ├── auth-service.ts            # Logique métier d'authentification
│       ├── verification-service.ts    # Service de vérification
│       └── document-service.ts        # Service de gestion des documents
├── emails/                            # Templates d'email
│   ├── welcome-email.tsx              # Email de bienvenue
│   ├── reset-password-email.tsx       # Email de réinitialisation de mot de passe
│   ├── verification-email.tsx         # Email de vérification d'identité
│   ├── document-verified-email.tsx    # Email de confirmation de document
│   └── verify-email.tsx               # Email de vérification
├── types/                             # Types TypeScript
│   ├── auth.ts                        # Types liés à l'authentification
│   ├── roles.ts                       # Types et interfaces de rôles
│   └── verification.ts                # Types liés à la vérification
└── i18n/                              # Internationalisation
    ├── locales/                       # Fichiers de traduction
    │   ├── fr/                        # Français
    │   │   ├── auth.json              # Traductions pour l'authentification
    │   │   ├── role-selector.json     # Traductions pour sélecteur de rôle
    │   │   ├── onboarding.json        # Traductions pour tutoriels
    │   │   └── forms.json             # Traductions pour formulaires
    │   ├── en/                        # Anglais
    │   └── ...                        # Autres langues
    └── config.ts                      # Configuration i18n
```

## Description des composants clés

### API Routes

#### `api/auth/[...nextauth]/route.ts`
Configure NextAuth.js avec les options suivantes:
- Adaptateur Prisma pour stocker les sessions et comptes
- Plusieurs fournisseurs d'authentification:
  - Credentials (email/mot de passe)
  - OAuth (Google, GitHub, etc.)
- Callbacks personnalisés pour gérer les sessions, JWT et redirections
- Événements (connexion, déconnexion, création de compte)
- Gestion des rôles utilisateur dans la session

#### `api/auth/register/`
Endpoints pour l'inscription des utilisateurs:
- Route principale pour le routage initial
- Routes spécialisées pour chaque type d'utilisateur:
  - `client.ts`: Logique d'inscription client
  - `deliverer.ts`: Logique d'inscription livreur avec vérification accrue
  - `merchant.ts`: Logique d'inscription commerçant avec validation SIRET
  - `provider.ts`: Logique d'inscription prestataire avec vérification des compétences

#### `api/auth/document-upload/route.ts`
Endpoint pour l'upload de documents des livreurs et prestataires:
- Upload sécurisé vers Cloudinary ou stockage local
- Validation des types de fichiers autorisés
- Scanning antivirus des fichiers
- Stockage des métadonnées et références dans la base de données

#### `api/auth/document-verification/route.ts`
Endpoint pour la vérification des documents:
- Interface pour administrateurs pour approuver/rejeter des documents
- Notifications aux utilisateurs sur le statut de la vérification
- Mise à jour du statut utilisateur après vérification

### Routeurs tRPC

#### `server/api/routers/auth.ts`
Routeur tRPC pour les fonctionnalités d'authentification:
- Mutation d'inscription générique (`signUp`)
- Vérification de session (`validateSession`)
- Demande de réinitialisation de mot de passe (`requestPasswordReset`)
- Réinitialisation de mot de passe (`resetPassword`)
- Vérification d'email (`verifyEmail`)
- Enregistrement du tutoriel complété (`completeOnboarding`)

#### `server/api/routers/client.ts`, `deliverer.ts`, `merchant.ts`, `provider.ts`
Routeurs spécifiques à chaque rôle:
- Mutations d'inscription spécifiques avec validation adaptée
- Requêtes pour données spécifiques au rôle
- Mutations pour mise à jour des informations spécifiques
- Gestion des abonnements (pour clients)
- Gestion des documents (pour livreurs et prestataires)

### Composants d'authentification

#### `components/auth/role-selector.tsx`
Sélecteur de type d'utilisateur:
- Interface visuelle intuitive pour choisir son rôle
- Descriptions des responsabilités et avantages de chaque rôle
- Redirection vers le formulaire approprié
- Support multilingue intégré

#### `components/auth/register-forms/`
Formulaires d'inscription spécifiques:
- `client-form.tsx`: Formulaire client avec:
  - Informations personnelles
  - Adresse de livraison par défaut
  - Choix d'abonnement (Free, Starter, Premium)
  
- `deliverer-form.tsx`: Formulaire livreur avec:
  - Informations personnelles étendues
  - Informations bancaires
  - Upload de documents (identité, assurance, permis)
  - Zones géographiques d'opération
  - Type de véhicule
  
- `merchant-form.tsx`: Formulaire commerçant avec:
  - Informations sur l'entreprise (nom, SIRET)
  - Coordonnées du responsable
  - Informations bancaires
  - Catégories de produits
  
- `provider-form.tsx`: Formulaire prestataire avec:
  - Compétences et services proposés
  - Zones d'intervention
  - Tarifs et disponibilités
  - Qualification et expérience

#### `components/documents/`
Composants de gestion des documents:
- `document-upload.tsx`: Interface d'upload avec:
  - Drag & drop
  - Prévisualisation
  - Validation des types et tailles
  - Barre de progression
  
- `document-status.tsx`: Affichage du statut de vérification:
  - En attente
  - Approuvé
  - Rejeté avec raison
  
- `verification-steps.tsx`: Guide visuel des étapes de vérification

#### `components/onboarding/`
Composants pour le tutoriel de première connexion:
- `onboarding-wrapper.tsx`: Conteneur bloquant l'accès jusqu'à complétion
- `tutorial-steps/`: Étapes personnalisées selon le rôle utilisateur
- `progress-tracker.tsx`: Indicateur de progression du tutoriel

## Validation des données

### Schémas de validation spécifiques aux rôles

#### `lib/validation/client-schema.ts`
```typescript
export const clientSchema = z.object({
  // Informations de base partagées
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(2),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  
  // Spécifique client
  defaultAddress: addressSchema,
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
  }),
  subscriptionPlan: z.enum(['FREE', 'STARTER', 'PREMIUM']).default('FREE'),
});
```

#### `lib/validation/deliverer-schema.ts`
```typescript
export const delivererSchema = z.object({
  // Informations de base partagées
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(2),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  
  // Spécifique livreur
  dateOfBirth: z.date().refine(value => {
    return differenceInYears(new Date(), value) >= 18;
  }, 'Vous devez avoir au moins 18 ans'),
  address: addressSchema,
  bankInfo: bankInfoSchema,
  vehicleType: z.enum(['BIKE', 'SCOOTER', 'CAR', 'VAN']),
  operationZones: z.array(z.string()).min(1),
  availability: availabilitySchema,
  documents: z.object({
    identityDocument: z.string().optional(),
    drivingLicense: z.string().optional(),
    insurance: z.string().optional(),
    vehicleRegistration: z.string().optional(),
  }),
});
```

## Flux d'inscription et vérification

### Flux d'inscription client
1. Utilisateur sélectionne le rôle "Client"
2. Remplit le formulaire client
3. Validation des données côté client et serveur
4. Création du compte avec statut "ACTIVE"
5. Envoi d'email de vérification
6. Redirection vers le tutoriel d'onboarding

### Flux d'inscription livreur
1. Utilisateur sélectionne le rôle "Livreur"
2. Remplit les informations personnelles et de contact
3. Télécharge les documents requis
4. Validation des données et documents côté client/serveur
5. Création du compte avec statut "PENDING_VERIFICATION"
6. Entrée dans la file d'attente de vérification
7. Notification à l'administrateur pour vérification manuelle
8. Email de confirmation une fois vérifié (ou rejet avec raison)
9. Accès au tutoriel d'onboarding une fois approuvé

### Flux d'inscription commerçant
1. Utilisateur sélectionne le rôle "Commerçant"
2. Remplit les informations d'entreprise avec validation SIRET
3. Configure les informations de paiement
4. Création du compte avec statut "PENDING_APPROVAL"
5. Vérification des informations d'entreprise
6. Email de confirmation une fois approuvé
7. Accès au tutoriel d'onboarding spécifique commerçant

## Tutoriel d'onboarding post-inscription

Pour répondre à l'exigence "un tutoriel sur le site sera affichable à la première connexion (bloquer l'utilisateur et utiliser des overlays)", chaque type d'utilisateur bénéficie d'un tutoriel spécifique:

### Client
1. Présentation de l'interface
2. Comment déposer une annonce
3. Comment suivre une livraison
4. Gérer les paiements et abonnements
5. Contacter un livreur/prestataire

### Livreur
1. Comprendre le tableau de bord
2. Rechercher et accepter des annonces
3. Utiliser l'application mobile pour le suivi
4. Valider une livraison et recevoir un paiement
5. Gérer son planning et ses zones

### Commerçant
1. Configuration du profil boutique
2. Publier des annonces et offres
3. Gérer les demandes de livraison
4. Suivre les paiements et factures
5. Analyser les statistiques de vente

Le tutoriel utilise un composant bloquant qui empêche l'accès complet à l'application jusqu'à sa complétion, avec la possibilité de le reporter une fois.

## Mesures de sécurité

### Stockage sécurisé des mots de passe
- Utilisation de bcrypt pour le hachage des mots de passe
- Facteur de coût élevé pour résister aux attaques par force brute

### Protection contre les attaques courantes
- Protection CSRF avec tokens NextAuth
- Rate limiting sur les routes sensibles
- Validation stricte des entrées utilisateur avec Zod
- Prévention des injections SQL via Prisma

### Gestion des documents sensibles
- Chiffrement des documents téléchargés
- Stockage sécurisé avec accès restreint
- Validation des types MIME et analyse antivirus
- Suppression automatique des données temporaires

### Vérification d'identité
- Vérification d'email obligatoire pour tous les utilisateurs
- Vérification manuelle des documents pour livreurs et prestataires
- Authentification à deux facteurs optionnelle
- Notifications de connexion suspecte
- Historique des connexions accessible à l'utilisateur

## Intégration avec les autres systèmes

### Base de données
- Utilisation de Prisma pour l'accès sécurisé à la base de données
- Schéma compatible avec NextAuth pour les sessions et comptes
- Stockage des métadonnées des documents et références

### Frontend
- État d'authentification géré via les hooks NextAuth
- Composants réutilisables et modulaires
- Protection des routes côté client et serveur
- Routes protégées par rôle spécifique

### Email et Notifications
- Envoi d'emails transactionnels via nodemailer
- Templates d'email réactifs et personnalisables
- Notifications push via OneSignal pour:
  - Progression de vérification de documents
  - Approbation/rejet d'inscription
  - Connexions suspectes
  - Rappels de complétion du profil

### Intégration Stripe
- Stockage sécurisé des informations de paiement via Stripe
- Séparation stricte des données d'authentification et de paiement
- Conformité PCI DSS pour les commerçants et prestataires

## Considérations pour le passage à l'échelle

### Performances
- Mise en cache des sessions
- Minimisation des requêtes de validation de session
- Optimisation des requêtes Prisma
- File d'attente pour les processus de vérification

### Extensibilité
- Support de plusieurs fournisseurs d'authentification
- Architecture modulaire pour ajouter de nouvelles fonctionnalités
- Support multi-locataire pour les différentes régions et langues
- Facilité d'ajout de nouveaux types d'utilisateurs

### Conformité
- RGPD/GDPR: Consentement explicite, droit à l'oubli
- PCI DSS: Séparation des données d'authentification et de paiement
- WCAG: Accessibilité des formulaires et flux d'authentification
- KYC: Processus de vérification "Know Your Customer" pour les livreurs et prestataires