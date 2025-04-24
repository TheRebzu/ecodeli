# API EcoDeli - Documentation

Cette documentation décrit l'API de l'application EcoDeli, un service de livraison collaborative.

## Technologies

L'API EcoDeli est construite avec:
- **Next.js**: Framework React pour le backend et le frontend
- **tRPC**: Framework TypeScript pour les API typées de bout en bout
- **Prisma**: ORM pour interagir avec la base de données PostgreSQL
- **NextAuth.js**: Framework d'authentification
- **Stripe**: Service de paiement

## Base URL

```
https://api.ecodeli.com/api/trpc
```

Pour l'environnement de développement local:
```
http://localhost:3000/api/trpc
```

## Authentification

L'API utilise l'authentification JWT via NextAuth. Pour accéder aux endpoints protégés, vous devez inclure un token JWT valide dans l'en-tête Authorization:

```
Authorization: Bearer <token>
```

### Endpoints d'authentification

#### Inscription - `auth.signUp`

Crée un nouveau compte utilisateur.

**Entrée:**
```typescript
{
  name: string; // 2-50 caractères
  email: string; // Format email valide
  password: string; // 8-100 caractères
  role: "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" // Optionnel, par défaut "CLIENT"
}
```

**Réponse:**
```typescript
{
  status: number; // 201
  message: string; // "Account created successfully"
  data: {
    userId: string;
    name: string;
    email: string;
    role: string;
  }
}
```

#### Connexion

La connexion est gérée par NextAuth. Envoyez une requête POST à `/api/auth/signin` avec les informations d'identification:

```typescript
{
  email: string;
  password: string;
}
```

**Réponse:**
Token JWT et informations de session utilisateur.

#### Validation de session - `auth.validateSession`

Vérifie si la session de l'utilisateur est valide.

**Entrée:** Aucune (utilise le token de la session)

**Réponse:**
```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }
}
```

## API Utilisateur

### Profil utilisateur - `user.getProfile`

Récupère le profil de l'utilisateur connecté.

**Entrée:** Aucune (utilise le token de la session)

**Réponse:**
```typescript
{
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}
```

### Mise à jour du profil - `user.updateProfile`

Met à jour le profil de l'utilisateur connecté.

**Entrée:**
```typescript
{
  name?: string; // 2-50 caractères, optionnel
  image?: string; // URL, optionnel
}
```

**Réponse:**
Profil utilisateur mis à jour.

### Liste des utilisateurs (Admin) - `user.getAllUsers`

Récupère la liste des utilisateurs (réservé aux administrateurs).

**Entrée:**
```typescript
{
  limit?: number; // 1-100, défaut 10
  cursor?: string; // Pour la pagination
  role?: "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN"; // Optionnel
}
```

**Réponse:**
```typescript
{
  items: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
    createdAt: string; // ISO date
  }>;
  nextCursor: string | null; // Pour la pagination
}
```

## API Annonces

### Création d'annonce - `announcement.create`

Crée une nouvelle annonce de livraison (réservé aux clients).

**Entrée:**
```typescript
{
  title: string; // 5-100 caractères
  description: string; // 10-500 caractères
  pickupAddress: string; // Min 5 caractères
  deliveryAddress: string; // Min 5 caractères
  packageSize: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
  packageWeight: number; // Positif
  packageValue: number; // Non négatif
  deadline: Date; // Date limite de livraison
  price: number; // Positif
  requiresInsurance: boolean; // Optionnel, défaut false
}
```

**Réponse:**
L'annonce créée avec toutes ses propriétés.

### Liste des annonces - `announcement.getAll`

Récupère la liste des annonces disponibles.

**Entrée:**
```typescript
{
  limit?: number; // 1-50, défaut 10
  cursor?: string; // Pour la pagination
  status?: "OPEN" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"; // Optionnel
}
```

**Réponse:**
```typescript
{
  items: Array<{
    id: string;
    title: string;
    // ... autres propriétés de l'annonce
    client: {
      id: string;
      name: string;
      image: string | null;
    };
  }>;
  nextCursor: string | null; // Pour la pagination
}
```

### Détails d'une annonce - `announcement.getById`

Récupère les détails d'une annonce spécifique.

**Entrée:**
```typescript
{
  id: string; // ID de l'annonce
}
```

**Réponse:**
Détails complets de l'annonce, y compris les informations du client et du livreur (si assigné).

### Mes annonces - `announcement.getMine`

Récupère les annonces créées par le client connecté.

**Entrée:**
```typescript
{
  limit?: number; // 1-50, défaut 10
  cursor?: string; // Pour la pagination
  status?: "OPEN" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"; // Optionnel
}
```

**Réponse:**
Liste des annonces avec pagination.

### Accepter une annonce - `announcement.acceptAnnouncement`

Permet à un livreur d'accepter une annonce de livraison.

**Entrée:**
```typescript
{
  id: string; // ID de l'annonce
}
```

**Réponse:**
L'annonce mise à jour avec le livreur assigné.

### Annuler une annonce - `announcement.cancelAnnouncement`

Annule une annonce (par le client, le livreur ou un admin).

**Entrée:**
```typescript
{
  id: string; // ID de l'annonce
}
```

**Réponse:**
L'annonce mise à jour avec le statut "CANCELLED".

## API Livraisons

### Démarrer une livraison - `delivery.startDelivery`

Démarre une livraison pour une annonce assignée (réservé aux livreurs).

**Entrée:**
```typescript
{
  announcementId: string; // ID de l'annonce
}
```

**Réponse:**
La livraison créée avec le statut "IN_TRANSIT".

### Mettre à jour la position - `delivery.updateLocation`

Met à jour la position d'une livraison en cours (réservé aux livreurs).

**Entrée:**
```typescript
{
  deliveryId: string; // ID de la livraison
  latitude: number; // Coordonnée GPS
  longitude: number; // Coordonnée GPS
}
```

**Réponse:**
Mise à jour de localisation créée.

### Terminer une livraison - `delivery.completeDelivery`

Marque une livraison comme terminée (réservé aux livreurs).

**Entrée:**
```typescript
{
  deliveryId: string; // ID de la livraison
  confirmationCode?: string; // Code de confirmation optionnel
  proof?: string; // URL vers une preuve de livraison optionnelle
}
```

**Réponse:**
La livraison mise à jour avec le statut "DELIVERED".

### Confirmer une livraison - `delivery.confirmDelivery`

Confirme la réception d'une livraison (réservé aux clients).

**Entrée:**
```typescript
{
  deliveryId: string; // ID de la livraison
  rating?: number; // 1-5, optionnel
  feedback?: string; // Max 500 caractères, optionnel
}
```

**Réponse:**
La livraison mise à jour avec la confirmation client.

### Détails d'une livraison - `delivery.getDeliveryById`

Récupère les détails d'une livraison spécifique.

**Entrée:**
```typescript
{
  id: string; // ID de la livraison
}
```

**Réponse:**
Détails complets de la livraison, y compris l'annonce associée et les mises à jour de localisation.

### Mes livraisons - `delivery.getMyDeliveries`

Récupère les livraisons associées à l'utilisateur connecté.

**Entrée:**
```typescript
{
  limit?: number; // 1-50, défaut 10
  cursor?: string; // Pour la pagination
  status?: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"; // Optionnel
  role?: "CLIENT" | "DELIVERER"; // Optionnel, défaut "DELIVERER"
}
```

**Réponse:**
Liste des livraisons avec pagination.

## API Paiements

### Créer une intention de paiement - `payment.createPaymentIntent`

Crée une intention de paiement Stripe.

**Entrée:**
```typescript
{
  announcementId: string; // ID de l'annonce
  paymentType: "ANNOUNCEMENT_CREATION" | "DELIVERER_PAYMENT" | "SUBSCRIPTION";
}
```

**Réponse:**
```typescript
{
  clientSecret: string; // Secret client Stripe
  amount: number; // Montant à payer
}
```

### Historique des paiements - `payment.getPaymentHistory`

Récupère l'historique des paiements de l'utilisateur.

**Entrée:**
```typescript
{
  limit?: number; // 1-50, défaut 10
  cursor?: string; // Pour la pagination
  type?: "ANNOUNCEMENT_CREATION" | "DELIVERER_PAYMENT" | "SUBSCRIPTION"; // Optionnel
}
```

**Réponse:**
Liste des paiements avec pagination.

### Statistiques des paiements (Admin) - `payment.getAdminPaymentStats`

Récupère les statistiques de paiement (réservé aux administrateurs).

**Entrée:**
```typescript
{
  startDate?: Date; // Optionnel
  endDate?: Date; // Optionnel
}
```

**Réponse:**
Statistiques détaillées des paiements par type et statut.

## API Commerçants

### Créer une boutique - `merchant.createStore`

Crée une nouvelle boutique (réservé aux commerçants).

**Entrée:**
```typescript
{
  name: string; // 3-100 caractères
  description: string; // 10-500 caractères
  address: string; // Min 5 caractères
  phoneNumber: string; // Min 5 caractères
  logoUrl?: string; // URL optionnelle
}
```

**Réponse:**
La boutique créée avec toutes ses propriétés.

### Autres endpoints commerçants

- `merchant.updateStore`: Met à jour une boutique
- `merchant.getStoreById`: Récupère les détails d'une boutique
- `merchant.getMyStore`: Récupère la boutique du commerçant connecté
- `merchant.approveStore`: Approuve une boutique (admin)
- `merchant.getAllStores`: Liste toutes les boutiques

## API Prestataires

### Créer un service - `provider.createService`

Crée un nouveau service (réservé aux prestataires).

**Entrée:**
```typescript
{
  title: string; // 3-100 caractères
  description: string; // 10-500 caractères
  category: "TRANSPORT" | "HOUSEWORK" | "SHOPPING" | "OTHER";
  price: number; // Positif
  duration: number; // Durée en minutes, entier positif
  imageUrl?: string; // URL optionnelle
}
```

**Réponse:**
Le service créé avec toutes ses propriétés.

### Autres endpoints prestataires

- `provider.updateService`: Met à jour un service
- `provider.getServiceById`: Récupère les détails d'un service
- `provider.getMyServices`: Liste les services d'un prestataire
- `provider.bookService`: Réserve un service (client)
- `provider.getProviderAppointments`: Liste les rendez-vous d'un prestataire
- `provider.confirmAppointment`: Confirme un rendez-vous

## Webhooks

### Webhook Stripe - `/api/webhooks/stripe`

Endpoint pour recevoir les événements de paiement Stripe.

**Méthode:** POST

**En-têtes requis:**
```
stripe-signature: <signature>
```

**Corps:** Événement Stripe (format brut)

**Réponse:**
```
{ received: true }
```

## Codes d'erreur

L'API utilise les codes d'erreur tRPC standard:

- `BAD_REQUEST`: Requête invalide (400)
- `UNAUTHORIZED`: Non authentifié (401)
- `FORBIDDEN`: Non autorisé (403)
- `NOT_FOUND`: Ressource non trouvée (404)
- `TIMEOUT`: Délai d'expiration dépassé (408)
- `CONFLICT`: Conflit (409)
- `PRECONDITION_FAILED`: Condition préalable non satisfaite (412)
- `PAYLOAD_TOO_LARGE`: Charge utile trop grande (413)
- `METHOD_NOT_SUPPORTED`: Méthode non supportée (405)
- `UNPROCESSABLE_CONTENT`: Contenu non traitable (422)
- `TOO_MANY_REQUESTS`: Trop de requêtes (429)
- `INTERNAL_SERVER_ERROR`: Erreur interne du serveur (500)

## Exemples d'utilisation

### Exemple 1: Inscription d'un utilisateur

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/api/root';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson,
    }),
  ],
});

const signUp = async () => {
  try {
    const result = await client.auth.signUp.mutate({
      name: 'Jean Dupont',
      email: 'jean@example.com',
      password: 'password123',
      role: 'CLIENT',
    });
    
    console.log('User created:', result);
  } catch (error) {
    console.error('Error creating user:', error);
  }
};
```

### Exemple 2: Créer une annonce

```typescript
// Avec React et le hook tRPC
import { trpc } from '@/lib/trpc-client';

export function CreateAnnouncementForm() {
  const createAnnouncement = trpc.announcement.create.useMutation({
    onSuccess: (data) => {
      console.log('Announcement created:', data);
      // Redirection ou notification
    },
    onError: (error) => {
      console.error('Error creating announcement:', error);
    },
  });

  const handleSubmit = (formData) => {
    createAnnouncement.mutate({
      title: formData.title,
      description: formData.description,
      pickupAddress: formData.pickupAddress,
      deliveryAddress: formData.deliveryAddress,
      packageSize: formData.packageSize,
      packageWeight: parseFloat(formData.packageWeight),
      packageValue: parseFloat(formData.packageValue),
      deadline: new Date(formData.deadline),
      price: parseFloat(formData.price),
      requiresInsurance: formData.requiresInsurance,
    });
  };

  // Formulaire et UI...
}
```

### Exemple 3: Récupérer les annonces disponibles

```typescript
// Avec React et le hook tRPC
import { trpc } from '@/lib/trpc-client';

export function AvailableAnnouncements() {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = 
    trpc.announcement.getAll.useInfiniteQuery(
      { limit: 10, status: 'OPEN' },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      {data.pages.flatMap((page) => 
        page.items.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))
      )}
      
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Charger plus</button>
      )}
    </div>
  );
}
```

## Limites

- Limite de rate: 100 requêtes par minute par IP
- Taille maximale des requêtes: 5MB
- Timeout des requêtes: 30 secondes

## Mise à jour et Support

Cette API est maintenue activement et évoluera selon les besoins métier. Pour toute question ou signalement de bug, veuillez contacter l'équipe technique à api@ecodeli.com.

# Structure de l'API d'authentification tRPC

## Vue d'ensemble

L'API d'authentification de EcoDeli est construite avec tRPC, offrant une expérience typée de bout en bout entre le client et le serveur. Cette documentation détaille la structure, les endpoints, et l'utilisation de l'API d'authentification.

## Structure des fichiers

```
src/
├── server/
│   ├── api/
│   │   ├── routers/
│   │   │   ├── auth.ts         # Principal routeur d'authentification
│   │   ├── root.ts             # Agrégation de tous les routeurs
│   │   └── trpc.ts             # Configuration tRPC (contexte, middleware)
├── lib/
│   ├── tokens.ts               # Gestion des tokens (vérification, réinitialisation)
│   ├── email.ts                # Fonctions d'envoi d'emails
│   └── prisma.ts               # Instance Prisma pour l'accès à la base de données
├── hooks/
│   └── use-auth.ts             # Hooks React pour faciliter l'authentification
```

## Schémas de validation (Zod)

### Schéma de base pour l'inscription

```typescript
const baseRegistrationSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  role: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
  phone: z.string().optional(),
});
```

### Schémas spécifiques aux rôles

Des schémas étendus pour chaque type d'utilisateur :

- `clientSchema` : Informations de base
- `delivererSchema` : Informations sur le véhicule, permis, etc.
- `merchantSchema` : Informations sur le commerce
- `providerSchema` : Informations sur les services proposés

Ces schémas sont combinés en un seul schéma discriminé par le champ `role`.

## Procédures d'authentification

### Inscription (`signUp`)

```typescript
signUp: publicProcedure
  .input(registrationSchema)
  .mutation(async ({ input }) => {
    // Logique d'inscription
  })
```

- **Entrée** : Données d'inscription selon le rôle
- **Traitement** :
  1. Vérification de l'existence de l'utilisateur
  2. Hachage du mot de passe
  3. Création de l'utilisateur
  4. Création du profil spécifique au rôle
  5. Génération d'un token de vérification d'email
  6. Envoi d'un email de vérification
- **Retour** : Confirmation de l'inscription et données basiques de l'utilisateur

### Vérification d'email (`verifyEmail`)

```typescript
verifyEmail: publicProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input }) => {
    // Logique de vérification
  })
```

- **Entrée** : Token de vérification
- **Traitement** :
  1. Validation du token
  2. Mise à jour du statut de vérification de l'utilisateur
  3. Envoi d'un email de bienvenue
- **Retour** : Confirmation de la vérification

### Mot de passe oublié (`forgotPassword`)

```typescript
forgotPassword: publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    // Logique de réinitialisation
  })
```

- **Entrée** : Adresse email
- **Traitement** :
  1. Génération d'un token de réinitialisation
  2. Envoi d'un email avec le lien de réinitialisation
- **Retour** : Confirmation de l'envoi (volontairement générique pour éviter l'énumération d'emails)

### Réinitialisation du mot de passe (`resetPassword`)

```typescript
resetPassword: publicProcedure
  .input(z.object({ 
    token: z.string(),
    password: z.string().min(8).regex(...) // Validation du mot de passe
  }))
  .mutation(async ({ input }) => {
    // Logique de réinitialisation
  })
```

- **Entrée** : Token de réinitialisation et nouveau mot de passe
- **Traitement** :
  1. Validation du token
  2. Hachage du nouveau mot de passe
  3. Mise à jour du mot de passe de l'utilisateur
- **Retour** : Confirmation de la réinitialisation

### Validation de session (`validateSession`)

```typescript
validateSession: protectedProcedure.query(async ({ ctx }) => {
  // Retour des données de session
})
```

- **Entrée** : Aucune (utilise la session de l'utilisateur connecté)
- **Traitement** : Vérification de la validité de la session
- **Retour** : Données de l'utilisateur connecté

### Changement de mot de passe (`changePassword`)

```typescript
changePassword: protectedProcedure
  .input(z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8).regex(...) // Validation du mot de passe
  }))
  .mutation(async ({ ctx, input }) => {
    // Logique de changement
  })
```

- **Entrée** : Mot de passe actuel et nouveau mot de passe
- **Traitement** :
  1. Vérification du mot de passe actuel
  2. Hachage du nouveau mot de passe
  3. Mise à jour du mot de passe de l'utilisateur
- **Retour** : Confirmation du changement

## Utilisation côté client

### Inscription

```typescript
const { mutate, isLoading } = api.auth.signUp.useMutation({
  onSuccess: (data) => {
    // Traitement après inscription réussie
  },
  onError: (error) => {
    // Gestion des erreurs
  }
});

// Appel de la mutation
mutate({
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  password: 'MotDePasse123',
  role: 'CLIENT'
});
```

### Vérification d'email

```typescript
// Dans la page de vérification d'email
const { mutate } = api.auth.verifyEmail.useMutation();

// Utilisation avec le token extrait de l'URL
mutate({ token: params.token });
```

### Accès aux données de session

```typescript
const { data: sessionData, isLoading } = api.auth.validateSession.useQuery();

// Utilisation des données de session
if (sessionData?.user) {
  // L'utilisateur est connecté
}
```

## Sécurité et bonnes pratiques

- Les mots de passe sont hachés avec bcrypt (12 rounds)
- Les tokens sont limités dans le temps et à usage unique
- Les erreurs d'authentification renvoient des messages génériques pour éviter les fuites d'informations
- Les procédures protégées (`protectedProcedure`) nécessitent une authentification 