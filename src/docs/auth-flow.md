# Flux d'Authentification EcoDeli

Ce document détaille l'architecture et le flux de fonctionnement du système d'authentification multi-rôles d'EcoDeli.

## Architecture Globale

```
                                +-------------------+
                                |                   |
                                |  Pages (Next.js)  |
                                |                   |
                                +--------+----------+
                                         |
                                         v
+-----------------+          +-----------+-----------+         +------------------+
|                 |          |                       |         |                  |
|  Components     +<-------->+       Hooks           +<------->+    tRPC Client   |
|                 |          |                       |         |                  |
+-----------------+          +-----------------------+         +--------+---------+
                                                                        |
                                                                        v
+----------------+           +-----------------------+         +--------+---------+
|                |           |                       |         |                  |
|  Email Service +<----------+   API Routes (REST)   |         |   tRPC Server    |
|                |           |                       |         |                  |
+----------------+           +-----------+-----------+         +--------+---------+
                                         |                              |
                                         v                              v
                             +-----------+-----------+         +--------+---------+
                             |                       |         |                  |
                             |    Auth Libraries     +<------->+    Middlewares   |
                             |                       |         |                  |
                             +-----------+-----------+         +------------------+
                                         |
                                         v
                             +-----------+-----------+
                             |                       |
                             |    Prisma / Base      |
                             |      de données       |
                             |                       |
                             +-----------------------+
```

## Flux d'Authentification Détaillé

### 1. Inscription Utilisateur

#### Frontend
1. **Composants UI** (`src/components/auth/register-forms/*.tsx`)
   - Présente le formulaire d'inscription spécifique au rôle
   - Utilise React Hook Form pour la gestion des états et validations côté client
   - Applique les validations via Zod
   - Styles UI avec TailwindCSS

2. **Pages** (`src/app/(auth)/register/*.tsx`)
   - Pages routées par Next.js pour chaque type d'inscription
   - Charge les composants de formulaire appropriés

3. **Hooks** (`src/hooks/use-auth.ts`)
   - Fournit la méthode `signUp` pour l'inscription
   - Gère l'état de chargement et les erreurs
   - Centralise la logique d'authentification

#### Backend
4. **tRPC Endpoint** (`src/server/api/routers/auth.ts`)
   - Procédure `signUp` qui valide et traite les données d'inscription
   - Effectue des validations spécifiques selon le rôle

5. **API REST Alternative** (`src/app/api/auth/register/route.ts`)
   - Endpoint REST pour l'inscription
   - Valide les données avec les mêmes schémas Zod

6. **Services** (`src/lib/tokens.ts`, `src/lib/email.ts`)
   - Génère un token de vérification
   - Envoie un email de vérification à l'utilisateur

7. **Modèles Prisma** (`prisma/schema.prisma`)
   - Stocke l'utilisateur avec son rôle et profil spécifique

### 2. Vérification de l'Email

#### Frontend
1. **Page** (`src/app/(auth)/verify-email/[token]/page.tsx`)
   - Affiche une page de vérification avec un état de chargement
   - Vérifie automatiquement le token dans l'URL

2. **Hooks** (`src/hooks/use-verification.ts`)
   - Gère la vérification du token
   - Affiche le résultat (succès/échec)

#### Backend
3. **tRPC Endpoint** (`src/server/api/routers/auth.ts`)
   - Procédure `verifyEmail` qui valide le token
   - Met à jour le statut de l'utilisateur

4. **API REST Alternative** (`src/app/api/auth/verify-email/route.ts`)
   - Endpoint pour la vérification d'email
   - Marque l'email comme vérifié

5. **Services** (`src/lib/tokens.ts`, `src/lib/email.ts`)
   - Vérifie la validité du token et son expiration
   - Envoie un email de bienvenue après vérification

### 3. Connexion Utilisateur

#### Frontend
1. **Composants UI** (`src/components/auth/login-form.tsx`)
   - Formulaire de connexion avec validations
   - Affiche des messages d'erreur appropriés

2. **Page** (`src/app/(auth)/login/page.tsx`)
   - Page de connexion avec gestion des redirections

3. **Hooks** (`src/hooks/use-auth.ts`)
   - Méthode `login` qui gère la soumission du formulaire
   - Persiste la session utilisateur

#### Backend
4. **NextAuth.js** (`src/app/api/auth/[...nextauth]/route.ts`)
   - Configure NextAuth avec le provider credentials
   - Gère la validation des identifiants

5. **Middlewares** (`src/middleware.ts`)
   - Protège les routes nécessitant une authentification
   - Redirige en fonction du rôle de l'utilisateur

6. **Services** (`src/lib/auth.ts`)
   - Options de configuration NextAuth
   - Callbacks de session et JWT

### 4. Récupération de Mot de Passe

#### Frontend
1. **Composants UI** (`src/components/auth/forgot-password-form.tsx`, `src/components/auth/reset-password-form.tsx`)
   - Formulaires pour demander et effectuer la réinitialisation

2. **Pages** (`src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/[token]/page.tsx`)
   - Pages pour le flux de récupération de mot de passe

3. **Hooks** (`src/hooks/use-password-reset.ts`)
   - Gère les requêtes de réinitialisation
   - Gère la validation du nouveau mot de passe

#### Backend
4. **tRPC Endpoints** (`src/server/api/routers/auth.ts`)
   - Procédures `forgotPassword` et `resetPassword`
   - Valide les demandes et met à jour les mots de passe

5. **API REST Alternative** (`src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`)
   - Endpoints pour demander et effectuer une réinitialisation

6. **Services** (`src/lib/tokens.ts`, `src/lib/email.ts`)
   - Génère et valide les tokens de réinitialisation
   - Envoie les emails avec les liens de réinitialisation

### 5. Protection des Routes et Autorisations

#### Frontend
1. **Hooks** (`src/hooks/use-auth.ts`)
   - Fournit `isAuthenticated`, `user` et `role` pour vérifier les droits
   - Méthode `hasRole` pour la vérification d'autorisations

2. **Layouts protégés** (`src/app/(dashboard)/layout.tsx`, etc.)
   - Vérifie l'authentification avant de rendre les enfants
   - Redirige si non autorisé

#### Backend
3. **tRPC Middlewares** (`src/lib/trpc.ts`)
   - `protectedProcedure` - Exige une authentification
   - Procédures spécifiques aux rôles (`adminProcedure`, `clientProcedure`, etc.)

4. **Next.js Middleware** (`src/middleware.ts`)
   - Intercepte les requêtes aux routes protégées
   - Vérifie la session et les autorisations

## Modèles de Données Clés

### User
```prisma
model User {
  id            String        @id @default(cuid())
  name          String?
  email         String        @unique
  emailVerified DateTime?
  password      String?
  image         String?
  role          UserRole      @default(CLIENT)
  // ... autres champs et relations
}
```

### Profils Spécifiques aux Rôles
```prisma
model ClientProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  phone     String?
  // ... autres champs
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model DelivererProfile {
  // ... champs spécifiques aux livreurs
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ... autres profils
```

### Tokens d'Authentification
```prisma
model VerificationToken {
  id        String   @id @default(cuid())
  token     String   @unique
  expires   DateTime
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... autres champs
}

model PasswordResetToken {
  // ... champs similaires
}
```

## Configuration Technique

### NextAuth.js
Configuration dans `src/lib/auth.ts` et `src/app/api/auth/[...nextauth]/route.ts`:
- Stratégie de session JWT
- Pages personnalisées
- Callbacks pour enrichir les tokens et sessions
- Adaptateur Prisma

### Validation avec Zod
Schémas de validation dans plusieurs fichiers:
- Validation des entrées utilisateur
- Typage fort avec inférence TypeScript
- Validations spécifiques aux rôles

### Sécurité
- Mots de passe hashés avec bcrypt
- Tokens signés et à durée limitée
- Protection CSRF via NextAuth
- Pas d'énumération d'emails possible

## Cycle de Vie Complet d'un Utilisateur

1. **Inscription**: Création du compte avec données spécifiques au rôle
2. **Vérification**: Activation du compte via email
3. **Connexion**: Authentification et création de session
4. **Utilisation**: Accès aux fonctionnalités selon le rôle
5. **Gestion de compte**: Modification du profil, changement de mot de passe
6. **Récupération**: Processus de récupération de compte si nécessaire
7. **Déconnexion**: Fin de session et nettoyage des cookies

## Intégrations Frontend-Backend

### tRPC: Typed RPC
- Pont typé entre frontend et backend
- Procédures avec validation intégrée
- Auto-complétion et vérification de type

### API Routes Next.js
- Endpoints REST alternatifs
- Compatibilité avec les clients tiers
- Même logique métier que tRPC

### React Hooks Personnalisés
- Abstraction de la logique d'authentification
- États et effets réutilisables
- Gestion des erreurs et du chargement 