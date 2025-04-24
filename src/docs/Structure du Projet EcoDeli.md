# Structure du Projet EcoDeli

## Vue d'ensemble

EcoDeli est une plateforme de crowdshipping qui met en relation des particuliers et des entreprises pour la livraison de colis et des services à la personne. Le projet est développé avec Next.js, React, Prisma, TailwindCSS, tRPC et d'autres technologies modernes.

## Structure des dossiers

```
ecodeli/
├── .github/                    # Configuration GitHub Actions
│   └── workflows/              # Workflows CI/CD
├── .husky/                     # Hooks Git pour linting et tests
├── .vscode/                    # Configuration VS Code
├── public/                     # Fichiers statiques
│   ├── fonts/                  # Polices de caractères
│   ├── images/                 # Images statiques
│   ├── locales/                # Fichiers de traduction
│   └── favicon.ico             # Favicon
├── src/                        # Code source principal
│   ├── app/                    # Structure de l'application Next.js (App Router)
│   │   ├── [locale]/           # Support multilingue
│   │   │   ├── (auth)/         # Routes d'authentification (groupées)
│   │   │   │   ├── login/      # Page de connexion
│   │   │   │   ├── register/   # Page d'inscription
│   │   │   │   └── ...
│   │   │   ├── (dashboard)/    # Routes du tableau de bord (groupées)
│   │   │   │   ├── admin/      # Espace administrateur
│   │   │   │   ├── client/     # Espace client
│   │   │   │   ├── merchant/   # Espace commerçant
│   │   │   │   ├── provider/   # Espace prestataire
│   │   │   │   ├── deliverer/  # Espace livreur
│   │   │   │   └── ...
│   │   │   ├── api/            # Routes API
│   │   │   ├── layout.tsx      # Layout principal
│   │   │   └── page.tsx        # Page d'accueil
│   ├── components/             # Composants React
│   │   ├── ui/                 # Composants UI réutilisables
│   │   ├── forms/              # Composants de formulaires
│   │   ├── layouts/            # Layouts réutilisables
│   │   ├── dashboard/          # Composants spécifiques au tableau de bord
│   │   ├── maps/               # Composants de cartes
│   │   └── ...
│   ├── config/                 # Configuration de l'application
│   │   ├── site.ts             # Configuration du site
│   │   ├── dashboard.ts        # Configuration du tableau de bord
│   │   └── ...
│   ├── hooks/                  # Hooks React personnalisés
│   ├── lib/                    # Bibliothèques et utilitaires
│   │   ├── auth/               # Utilitaires d'authentification
│   │   ├── api/                # Utilitaires API
│   │   ├── db/                 # Utilitaires de base de données
│   │   ├── utils/              # Fonctions utilitaires générales
│   │   └── ...
│   ├── server/                 # Code côté serveur
│   │   ├── api/                # Routes API tRPC
│   │   │   ├── routers/        # Routeurs tRPC
│   │   │   │   ├── auth.ts     # Routeur d'authentification
│   │   │   │   ├── user.ts     # Routeur utilisateur
│   │   │   │   ├── delivery.ts # Routeur de livraison
│   │   │   │   ├── merchant.ts # Routeur commerçant
│   │   │   │   ├── service.ts  # Routeur de service
│   │   │   │   └── ...
│   │   │   ├── trpc.ts         # Configuration tRPC
│   │   │   └── root.ts         # Routeur racine tRPC
│   │   ├── auth.ts             # Configuration Auth.js
│   │   ├── db.ts               # Client Prisma
│   │   └── ...
│   ├── styles/                 # Styles globaux
│   │   └── globals.css         # CSS global (TailwindCSS)
│   ├── types/                  # Types TypeScript
│   │   ├── next-auth.d.ts      # Types NextAuth
│   │   ├── api.ts              # Types API
│   │   └── ...
│   └── utils/                  # Utilitaires côté client
├── prisma/                     # Configuration Prisma
│   ├── schema.prisma           # Schéma de base de données
│   ├── migrations/             # Migrations de base de données
│   └── seed.ts                 # Script de seeding
├── emails/                     # Templates d'emails (React Email)
├── scripts/                    # Scripts utilitaires
├── tests/                      # Tests
│   ├── unit/                   # Tests unitaires
│   ├── integration/            # Tests d'intégration
│   └── e2e/                    # Tests end-to-end
├── .env                        # Variables d'environnement (local)
├── .env.example                # Exemple de variables d'environnement
├── .eslintrc.js                # Configuration ESLint
├── .prettierrc                 # Configuration Prettier
├── next.config.js              # Configuration Next.js
├── tailwind.config.js          # Configuration TailwindCSS
├── tsconfig.json               # Configuration TypeScript
├── package.json                # Dépendances et scripts
└── README.md                   # Documentation
```

## Structure de la base de données

Le schéma Prisma définira les modèles suivants :

```prisma
// Utilisateur de base
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String?
  name              String?
  phone             String?
  address           String?
  city              String?
  postalCode        String?
  country           String?
  role              UserRole  @default(CLIENT)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations selon le rôle
  client            Client?
  deliverer         Deliverer?
  merchant          Merchant?
  provider          Provider?
  admin             Admin?
}

enum UserRole {
  CLIENT
  DELIVERER
  MERCHANT
  PROVIDER
  ADMIN
}

// Client
model Client {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Relations
  deliveries        Delivery[]
  services          Service[]
  payments          Payment[]
  announcements     Announcement[]
}

// Livreur
model Deliverer {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  isVerified        Boolean   @default(false)
  rating            Float?
  
  // Documents justificatifs
  documents         Document[]
  
  // Relations
  deliveries        Delivery[]
  announcements     Announcement[]
  payments          Payment[]
  schedule          Schedule[]
}

// Commerçant
model Merchant {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName       String
  siret             String    @unique
  contractId        String?
  
  // Relations
  announcements     Announcement[]
  payments          Payment[]
  invoices          Invoice[]
}

// Prestataire de services
model Provider {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  isVerified        Boolean   @default(false)
  skills            String[]
  rating            Float?
  
  // Documents justificatifs
  documents         Document[]
  
  // Relations
  services          Service[]
  payments          Payment[]
  schedule          Schedule[]
}

// Administrateur
model Admin {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  permissions       String[]
}

// Document justificatif
model Document {
  id                String    @id @default(cuid())
  type              String
  url               String
  isVerified        Boolean   @default(false)
  uploadedAt        DateTime  @default(now())
  verifiedAt        DateTime?
  
  // Relations
  delivererId       String?
  deliverer         Deliverer? @relation(fields: [delivererId], references: [id])
  providerId        String?
  provider          Provider? @relation(fields: [providerId], references: [id])
}

// Livraison
model Delivery {
  id                String    @id @default(cuid())
  status            DeliveryStatus
  type              DeliveryType
  pickupAddress     String
  deliveryAddress   String
  pickupDate        DateTime
  deliveryDate      DateTime?
  weight            Float?
  dimensions        String?
  description       String?
  price             Float
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  clientId          String
  client            Client    @relation(fields: [clientId], references: [id])
  delivererId       String?
  deliverer         Deliverer? @relation(fields: [delivererId], references: [id])
  announcementId    String?
  announcement      Announcement? @relation(fields: [announcementId], references: [id])
  payments          Payment[]
}

enum DeliveryStatus {
  PENDING
  ACCEPTED
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  CANCELLED
}

enum DeliveryType {
  PACKAGE
  SHOPPING_CART
  AIRPORT_TRANSFER
  GROCERY
  FOREIGN_PRODUCT
}

// Service à la personne
model Service {
  id                String    @id @default(cuid())
  type              ServiceType
  description       String
  date              DateTime
  duration          Int       // en minutes
  address           String
  price             Float
  status            ServiceStatus
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  clientId          String
  client            Client    @relation(fields: [clientId], references: [id])
  providerId        String?
  provider          Provider? @relation(fields: [providerId], references: [id])
  payments          Payment[]
}

enum ServiceType {
  TRANSPORT
  AIRPORT_TRANSFER
  PET_SITTING
  HOUSEKEEPING
  GARDENING
}

enum ServiceStatus {
  PENDING
  ACCEPTED
  COMPLETED
  CANCELLED
}

// Annonce
model Announcement {
  id                String    @id @default(cuid())
  title             String
  description       String
  type              AnnouncementType
  fromAddress       String?
  toAddress         String?
  date              DateTime?
  price             Float?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  clientId          String?
  client            Client?   @relation(fields: [clientId], references: [id])
  merchantId        String?
  merchant          Merchant? @relation(fields: [merchantId], references: [id])
  delivererId       String?
  deliverer         Deliverer? @relation(fields: [delivererId], references: [id])
  deliveries        Delivery[]
}

enum AnnouncementType {
  DELIVERY_REQUEST
  DELIVERY_OFFER
  MERCHANT_OFFER
}

// Paiement
model Payment {
  id                String    @id @default(cuid())
  amount            Float
  status            PaymentStatus
  stripePaymentId   String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  clientId          String?
  client            Client?   @relation(fields: [clientId], references: [id])
  delivererId       String?
  deliverer         Deliverer? @relation(fields: [delivererId], references: [id])
  merchantId        String?
  merchant          Merchant? @relation(fields: [merchantId], references: [id])
  deliveryId        String?
  delivery          Delivery? @relation(fields: [deliveryId], references: [id])
  serviceId         String?
  service           Service?  @relation(fields: [serviceId], references: [id])
  invoiceId         String?
  invoice           Invoice?  @relation(fields: [invoiceId], references: [id])
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// Facture
model Invoice {
  id                String    @id @default(cuid())
  number            String    @unique
  amount            Float
  status            InvoiceStatus
  pdfUrl            String?
  createdAt         DateTime  @default(now())
  dueDate           DateTime
  
  // Relations
  merchantId        String?
  merchant          Merchant? @relation(fields: [merchantId], references: [id])
  payments          Payment[]
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}

// Planning
model Schedule {
  id                String    @id @default(cuid())
  date              DateTime
  startTime         DateTime
  endTime           DateTime
  isAvailable       Boolean   @default(true)
  
  // Relations
  delivererId       String?
  deliverer         Deliverer? @relation(fields: [delivererId], references: [id])
  providerId        String?
  provider          Provider? @relation(fields: [providerId], references: [id])
}

// Entrepôt
model Warehouse {
  id                String    @id @default(cuid())
  name              String
  address           String
  city              String
  postalCode        String
  country           String
  capacity          Int
  
  // Relations
  boxes             Box[]
}

// Box de stockage
model Box {
  id                String    @id @default(cuid())
  number            String
  size              String
  isOccupied        Boolean   @default(false)
  
  // Relations
  warehouseId       String
  warehouse         Warehouse @relation(fields: [warehouseId], references: [id])
}
```

## Workflow et Communication

### Flux d'authentification

1. L'utilisateur s'inscrit en spécifiant son rôle (client, livreur, commerçant, prestataire)
2. Selon le rôle, des informations supplémentaires sont demandées
3. Pour les livreurs et prestataires, des documents justificatifs sont requis
4. Les administrateurs vérifient les documents et valident les comptes
5. L'utilisateur peut se connecter et accéder à son espace dédié

### Flux de livraison

1. Un client ou un commerçant crée une annonce de livraison
2. Les livreurs peuvent consulter les annonces et proposer leurs services
3. Le client/commerçant sélectionne un livreur
4. Le paiement est effectué via Stripe (mis en attente)
5. Le livreur effectue la livraison et met à jour le statut
6. Le client confirme la réception
7. Le paiement est libéré et une facture est générée

### Flux de service à la personne

1. Un client demande un service à la personne
2. Les prestataires disponibles sont notifiés
3. Un prestataire accepte la demande
4. Le client effectue le paiement via Stripe (mis en attente)
5. Le prestataire effectue le service et met à jour le statut
6. Le client confirme la réalisation du service
7. Le paiement est libéré et une facture est générée

### Communication entre les composants

1. **Frontend <-> Backend** : Communication via tRPC pour les appels API typés
2. **Backend <-> Base de données** : Communication via Prisma ORM
3. **Notifications** : Utilisation de l'API OneSignal pour les notifications push
4. **Paiements** : Intégration avec Stripe pour les paiements sécurisés
5. **Emails** : Utilisation de React Email pour les templates d'emails
6. **Authentification** : Utilisation de NextAuth.js avec l'adaptateur Prisma
7. **Internationalisation** : Utilisation de next-intl pour la gestion des traductions

## Architecture technique

### Frontend

- **Next.js** : Framework React avec rendu côté serveur et App Router
- **React** : Bibliothèque UI
- **TailwindCSS** : Framework CSS utilitaire
- **Radix UI** : Composants UI accessibles
- **React Hook Form** : Gestion des formulaires
- **Zod** : Validation des données
- **TanStack Query** : Gestion des requêtes et du cache
- **Zustand** : Gestion de l'état global

### Backend

- **tRPC** : API typée pour la communication client-serveur
- **Prisma** : ORM pour la gestion de la base de données
- **NextAuth.js** : Authentification
- **Stripe** : Paiements
- **OneSignal** : Notifications push
- **React Email** : Templates d'emails

### Base de données

- **PostgreSQL** : Base de données relationnelle
- **Prisma** : ORM pour la gestion de la base de données

### Déploiement

- **Docker** : Conteneurisation
- **GitHub Actions** : CI/CD
- **Vercel** : Déploiement du frontend
- **Railway/Supabase** : Déploiement de la base de données
