# Documentation API d'Ecodeli

## Introduction

Cette documentation décrit l'API interne d'Ecodeli, implémentée avec tRPC. L'API fournit des fonctionnalités pour les différents types d'utilisateurs de la plateforme : clients, livreurs, commerçants, prestataires et administrateurs.

## Structure de l'API

L'API Ecodeli est organisée en plusieurs routeurs tRPC, chacun gérant un domaine fonctionnel spécifique :

- **userRouter** : Gestion des utilisateurs et des profils
- **authRouter** : Authentification et enregistrement
- **announcementRouter** : Gestion des annonces de livraison
- **deliveryRouter** : Suivi et gestion des livraisons
- **merchantRouter** : Gestion des commerces et des contrats
- **providerRouter** : Gestion des prestataires de services
- **paymentRouter** : Gestion des paiements et transactions

## Types de procédures

L'API utilise différents niveaux d'autorisation :

- **publicProcedure** : Accessible sans authentification
- **protectedProcedure** : Nécessite une authentification
- **adminProcedure** : Réservé aux administrateurs
- **clientProcedure** : Réservé aux clients
- **delivererProcedure** : Réservé aux livreurs
- **merchantProcedure** : Réservé aux commerçants
- **providerProcedure** : Réservé aux prestataires de services

## Authentication API (authRouter)

### signUp

Permet à un utilisateur de créer un compte.

- **Type** : `publicProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    name: string; // 2-50 caractères
    email: string; // Format email valide
    password: string; // 8-100 caractères
    role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER'; // Par défaut 'CLIENT'
  }
  ```
- **Sortie** :
  ```typescript
  {
    status: number;
    message: string;
    data: {
      userId: string;
      name: string;
      email: string;
      role: string;
    }
  }
  ```
- **Erreurs possibles** :
  - `CONFLICT` : L'utilisateur existe déjà

### validateSession

Vérifie si la session de l'utilisateur est valide.

- **Type** : `protectedProcedure.query`
- **Entrée** : Aucune
- **Sortie** :
  ```typescript
  {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    }
  }
  ```

## User API (userRouter)

### getProfile

Récupère le profil de l'utilisateur connecté.

- **Type** : `protectedProcedure.query`
- **Entrée** : Aucune
- **Sortie** :
  ```typescript
  {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Erreurs possibles** :
  - `NOT_FOUND` : Utilisateur non trouvé

### updateProfile

Met à jour le profil de l'utilisateur connecté.

- **Type** : `protectedProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    name?: string; // 2-50 caractères
    image?: string; // URL valide
  }
  ```
- **Sortie** :
  ```typescript
  {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string;
    updatedAt: Date;
  }
  ```

### getAllUsers

Récupère la liste de tous les utilisateurs (admin uniquement).

- **Type** : `adminProcedure.query`
- **Entrée** :
  ```typescript
  {
    limit?: number; // 1-100, par défaut 10
    cursor?: string; // Pour la pagination
    role?: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';
  }
  ```
- **Sortie** :
  ```typescript
  {
    items: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      image: string;
      createdAt: Date;
    }>;
    nextCursor?: string;
  }
  ```

## Delivery API (deliveryRouter)

### startDelivery

Commence une livraison pour une annonce assignée.

- **Type** : `delivererProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    announcementId: string;
  }
  ```
- **Sortie** : Objet `Delivery`
- **Erreurs possibles** :
  - `NOT_FOUND` : Annonce non trouvée
  - `FORBIDDEN` : Livreur non assigné à cette livraison
  - `BAD_REQUEST` : Livraison ne peut pas être démarrée

### updateLocation

Met à jour la position géographique d'une livraison en cours.

- **Type** : `delivererProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    deliveryId: string;
    latitude: number;
    longitude: number;
  }
  ```
- **Sortie** : Objet `LocationUpdate`
- **Erreurs possibles** :
  - `NOT_FOUND` : Livraison non trouvée
  - `FORBIDDEN` : Utilisateur n'est pas le livreur de cette livraison
  - `BAD_REQUEST` : Livraison n'est pas en transit

### completeDelivery

Marque une livraison comme terminée.

- **Type** : `delivererProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    deliveryId: string;
    confirmationCode?: string; // Requis si requiresConfirmationCode est true
    proof?: string; // URL vers une image ou document
  }
  ```
- **Sortie** : Objet `Delivery` mis à jour
- **Erreurs possibles** :
  - `NOT_FOUND` : Livraison non trouvée
  - `FORBIDDEN` : Utilisateur n'est pas le livreur
  - `BAD_REQUEST` : Livraison n'est pas en transit ou code manquant

### confirmDelivery

Permet au client de confirmer la réception d'une livraison.

- **Type** : `clientProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    deliveryId: string;
    rating?: number; // 1-5
    feedback?: string; // Max 500 caractères
  }
  ```
- **Sortie** : Objet `Delivery` mis à jour
- **Erreurs possibles** :
  - `NOT_FOUND` : Livraison non trouvée
  - `FORBIDDEN` : Utilisateur n'est pas le client
  - `BAD_REQUEST` : Livraison non terminée ou déjà confirmée

### getDeliveryById

Récupère les détails d'une livraison par son ID.

- **Type** : `protectedProcedure.query`
- **Entrée** :
  ```typescript
  {
    id: string;
  }
  ```
- **Sortie** : Objet `Delivery` avec relations (announcement, client, deliverer, locationUpdates)
- **Erreurs possibles** :
  - `NOT_FOUND` : Livraison non trouvée
  - `FORBIDDEN` : Utilisateur non autorisé

### getMyDeliveries

Récupère la liste des livraisons de l'utilisateur connecté.

- **Type** : `protectedProcedure.query`
- **Entrée** :
  ```typescript
  {
    limit?: number; // 1-50, par défaut 10
    cursor?: string; // Pour la pagination
    status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
    role?: 'CLIENT' | 'DELIVERER'; // Par défaut 'DELIVERER'
  }
  ```
- **Sortie** :
  ```typescript
  {
    items: Array<Delivery>; // Avec relations
    nextCursor?: string;
  }
  ```

## Announcement API (announcementRouter)

Le routeur des annonces gère la création, la recherche et la gestion des annonces de livraison.

Les principales fonctionnalités incluent :
- Création d'annonces par les clients
- Recherche d'annonces disponibles pour les livreurs
- Acceptation d'annonces par les livreurs
- Gestion du cycle de vie des annonces

## Merchant API (merchantRouter)

Le routeur des commerçants gère les boutiques et les services proposés par les commerçants.

Les principales fonctionnalités incluent :
- Création et gestion de boutiques
- Gestion des contrats
- Suivi des commandes et livraisons associées à un commerçant

## Provider API (providerRouter)

Le routeur des prestataires gère les services proposés et les rendez-vous.

Les principales fonctionnalités incluent :
- Création et gestion de services
- Gestion du calendrier et des disponibilités
- Traitement des rendez-vous et interventions

## Payment API (paymentRouter)

### createPaymentIntent

Crée une intention de paiement via Stripe.

- **Type** : `protectedProcedure.mutation`
- **Entrée** :
  ```typescript
  {
    announcementId: string;
    paymentType: 'ANNOUNCEMENT_CREATION' | 'DELIVERER_PAYMENT' | 'SUBSCRIPTION';
  }
  ```
- **Sortie** :
  ```typescript
  {
    clientSecret: string;
    amount: number;
  }
  ```
- **Erreurs possibles** :
  - `NOT_FOUND` : Annonce non trouvée
  - `FORBIDDEN` : Utilisateur non autorisé
  - `BAD_REQUEST` : Conditions requises non remplies
  - `INTERNAL_SERVER_ERROR` : Échec de création de l'intention de paiement

### getPaymentHistory

Récupère l'historique des paiements de l'utilisateur.

- **Type** : `protectedProcedure.query`
- **Entrée** :
  ```typescript
  {
    limit?: number; // 1-50, par défaut 10
    cursor?: string; // Pour la pagination
    type?: 'ANNOUNCEMENT_CREATION' | 'DELIVERER_PAYMENT' | 'SUBSCRIPTION';
  }
  ```
- **Sortie** :
  ```typescript
  {
    items: Array<Payment>; // Avec relation announcement
    nextCursor?: string;
  }
  ```

### getAdminPaymentStats

Récupère des statistiques sur les paiements (admin uniquement).

- **Type** : `adminProcedure.query`
- **Entrée** :
  ```typescript
  {
    startDate?: Date;
    endDate?: Date;
  }
  ```
- **Sortie** :
  ```typescript
  {
    paymentsByType: Array<{
      type: string;
      status: string;
      _sum: { amount: number };
    }>;
    successfulPayments: {
      _sum: { amount: number };
      _count: number;
    };
    failedPayments: {
      _sum: { amount: number };
      _count: number;
    };
  }
  ```

## Modèles de données

### User

```typescript
{
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  password: string | null;
  image: string | null;
  role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  accounts: Account[];
  sessions: Session[];
  clientAnnouncements: Announcement[];
  delivererAnnouncements: Announcement[];
  clientAppointments: Appointment[];
  providerAppointments: Appointment[];
  stores: Store[];
  services: Service[];
}
```

### Announcement

```typescript
{
  id: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
  packageWeight: number;
  packageValue: number;
  deadline: Date;
  price: number;
  requiresInsurance: boolean;
  status: 'OPEN' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'PAID_TO_DELIVERER' | 'REFUNDED' | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  clientId: string;
  client: User;
  delivererId: string | null;
  deliverer: User | null;
  deliveries: Delivery[];
  payments: Payment[];
}
```

### Delivery

```typescript
{
  id: string;
  announcementId: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  startTime: Date | null;
  endTime: Date | null;
  proof: string | null;
  requiresConfirmationCode: boolean;
  clientConfirmed: boolean;
  rating: number | null;
  feedback: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'PAID_TO_DELIVERER' | 'REFUNDED' | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  announcement: Announcement;
  locationUpdates: LocationUpdate[];
}
```

### Payment

```typescript
{
  id: string;
  stripePaymentId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'PAID_TO_DELIVERER' | 'REFUNDED';
  type: 'ANNOUNCEMENT_CREATION' | 'DELIVERER_PAYMENT' | 'SUBSCRIPTION';
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  announcementId: string;
  announcement: Announcement;
}
```

## Gestion des erreurs

L'API utilise le système d'erreurs tRPC pour renvoyer des réponses d'erreur structurées.

Les codes d'erreur courants sont :
- `UNAUTHORIZED` : L'utilisateur n'est pas authentifié
- `FORBIDDEN` : L'utilisateur n'a pas les droits requis
- `NOT_FOUND` : La ressource demandée n'existe pas
- `BAD_REQUEST` : La requête est mal formée ou invalide
- `CONFLICT` : Conflit avec l'état actuel des données (ex: email déjà utilisé)
- `INTERNAL_SERVER_ERROR` : Erreur serveur interne

## Pagination

Pour les requêtes qui renvoient de nombreux résultats, l'API utilise un système de pagination basé sur un curseur.

Le client spécifie :
- `limit` : Nombre d'éléments à renvoyer (avec une limite maximale)
- `cursor` : Point de départ pour la pagination (généralement l'ID du dernier élément reçu)

Le serveur renvoie :
- `items` : Les éléments demandés
- `nextCursor` : Le curseur à utiliser pour la page suivante, ou `undefined` s'il n'y a plus de données

## Authentification et autorisation

L'authentification est gérée via NextAuth.js. Une fois authentifié, l'utilisateur reçoit une session qui est vérifiée à chaque requête protégée.

L'autorisation est basée sur les rôles définis dans le modèle `User`. Chaque procédure tRPC peut être limitée à des rôles spécifiques à l'aide des middlewares d'autorisation.

## Intégration Stripe

Les paiements sont gérés via l'API Stripe. L'API Ecodeli crée des intentions de paiement côté serveur, puis le client finalise le paiement via Stripe Elements côté client.

Les webhooks Stripe sont utilisés pour traiter les événements de paiement (réussite, échec, remboursement, etc.). 