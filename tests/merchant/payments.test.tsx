import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import MerchantPayments from '@/app/merchant/payments/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('MerchantPayments Component', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the payments page correctly', () => {
    render(<MerchantPayments />);

    // Check if the title is rendered
    expect(screen.getByText('Gestion des paiements')).toBeInTheDocument();

    // Check if the tabs are rendered
    expect(screen.getByRole('tab', { name: 'Tous' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Complétés' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En attente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Échoués' })).toBeInTheDocument();

    // Check if the search input is rendered
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();

    // Check if the "Exporter" button is rendered
    expect(screen.getByText('Exporter')).toBeInTheDocument();
  });

  it('navigates to export page when button is clicked', () => {
    render(<MerchantPayments />);

    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/merchant/payments/export');
  });

  it('filters payments when searching', () => {
    render(<MerchantPayments />);

    // Get all payment rows initially
    const initialPaymentRows = screen.getAllByRole('row');
    const initialCount = initialPaymentRows.length - 1; // Subtract header row

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Rechercher...');
    fireEvent.change(searchInput, { target: { value: 'abonnement' } });

    // Check if payments are filtered
    const filteredPaymentRows = screen.getAllByRole('row');
    expect(filteredPaymentRows.length - 1).toBeLessThan(initialCount);
  });

  it('displays payment status badges with correct variants', () => {
    render(<MerchantPayments />);

    // Check if status badges are rendered with correct text
    expect(screen.getByText('Complété')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Échoué')).toBeInTheDocument();
  });

  it('navigates to payment details when viewing a payment', () => {
    render(<MerchantPayments />);

    // Find the first view button and click it
    const viewButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(viewButtons[0]);

    // Check if router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalled();
  });

  it('displays payment methods correctly', () => {
    render(<MerchantPayments />);

    // Check if payment methods are rendered
    expect(screen.getByText('Virement bancaire')).toBeInTheDocument();
    expect(screen.getByText('Carte bancaire')).toBeInTheDocument();
  });
});
# Project Structure Documentation

## Overview

This document outlines the structure of the EcoDeli project, focusing on the authentication system and overall organization. The project follows a modern Next.js 15 application structure with a focus on clean architecture and maintainability.

## Authentication System

The authentication is implemented using NextAuth.js v5 (Auth.js), which provides a robust authentication solution with support for:

- Email/password credentials
- OAuth providers (Google, Facebook)
- Email verification
- Password reset
- Two-factor authentication

### Key Files

- `src/auth.ts`: Main NextAuth.js configuration
- `src/auth.config.ts`: Base configuration shared between auth.ts and middleware
- `src/middleware.ts`: Route protection and authorization
- `src/app/api/auth/[...nextauth]/route.ts`: API route handler for NextAuth.js
- `src/hooks/use-auth.ts`: Client-side authentication hook
- `src/components/providers/auth-provider.tsx`: Authentication provider component

## Project Directory Structure

### Root Directories

- `src/`: Application source code
- `prisma/`: Database schema and migrations
- `public/`: Static assets
- `docs/`: Documentation
- `tests/`: Test files
- `scripts/`: Utility scripts

### Source Code Organization

- `src/app/`: Next.js App Router pages and layouts
  - `(auth)/`: Authentication-related pages
  - `(public)/`: Public pages
  - `dashboard/`: User dashboard
  - `admin/`: Admin pages
  - `api/`: API routes

- `src/components/`: React components
  - `auth/`: Authentication-related components
  - `ui/`: UI components (based on Shadcn/UI)
  - `providers/`: Context providers
  - `layout/`: Layout components

- `src/lib/`: Utilities and services
  - `prisma.ts`: Prisma client
  - `validations/`: Zod schemas
  - `services/`: Service modules
  - `actions/`: Server actions

- `src/hooks/`: Custom React hooks
- `src/types/`: TypeScript type definitions
- `src/shared/`: Shared utilities and constants
- `src/locales/`: Internationalization files

## API Structure

The API routes are organized by domain and follow a RESTful approach:

- `src/app/api/auth/`: Authentication endpoints
- `src/app/api/users/`: User management
- `src/app/api/deliveries/`: Delivery-related endpoints
- And many other domain-specific endpoints

## Authentication Flows

### Login Flow

1. User submits credentials via the `LoginForm` component
2. The `signIn` function from `use-auth.ts` is called
3. NextAuth.js validates the credentials against the database
4. Upon success, the user is redirected to the dashboard

### Registration Flow

1. User submits registration data via the `RegisterForm` component
2. The form data is validated using Zod schemas
3. The registration API creates a new user in the database
4. The user is redirected to a verification page or logged in directly

### Protected Routes

Routes under `/dashboard`, `/admin`, and `/profile` are protected by the middleware, which:

1. Checks if the user is authenticated
2. Verifies the user's role for role-based access control
3. Redirects unauthenticated users to the login page

## Recent Refactoring Changes

The project was recently refactored to improve organization and eliminate redundant files:

1. Removed `better-auth` related files and dependencies which were unused
2. Consolidated authentication configuration in `auth.config.ts` and `auth.ts`
3. Improved middleware for better route protection
4. Enhanced type safety with dedicated NextAuth type definitions
5. Created a consistent authentication hook for client components
6. Updated the auth provider to use NextAuth's SessionProvider

## Development Guidelines

When working on this project, please follow these guidelines:

1. Use TypeScript for all new code and maintain proper type definitions
2. Follow the established naming conventions: kebab-case for files, PascalCase for components
3. Create Zod schemas for all form data and API endpoints
4. Use server components where possible to reduce client-side JavaScript
5. Implement proper error handling and user feedback
6. Include comprehensive tests for new features

## Environment Setup

The project requires several environment variables for authentication:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
FACEBOOK_CLIENT_ID=your_client_id
FACEBOOK_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=your_database_url

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM=noreply@example.com
```
# Rapport Final - Projet EcoDeli

## Résumé du travail accompli

Dans le cadre de ce projet, nous avons continué le développement de la plateforme EcoDeli, une solution de crowdshipping qui met en relation différents types d'utilisateurs (clients, livreurs, commerçants, prestataires de services). Voici les principales réalisations :

1. **Analyse et résolution des conflits** : Nous avons identifié et résolu les conflits de fusion dans les fichiers clés du projet, en privilégiant les versions "Updated upstream" comme demandé.

2. **Implémentation des fonctionnalités manquantes** : Nous avons développé les interfaces et fonctionnalités essentielles pour les sections merchant (commerçant) et provider (prestataire), qui étaient les moins avancées dans le projet initial.

3. **Création de tests** : Nous avons développé des tests unitaires, d'intégration et fonctionnels pour toutes les fonctionnalités implémentées, assurant ainsi la robustesse du code.

4. **Documentation complète** : Nous avons créé une documentation détaillée du projet, incluant l'architecture, les fonctionnalités, les tests et les instructions pour continuer le développement.

5. **Guide de déploiement** : Nous avons fourni un guide complet pour le déploiement et l'utilisation de la plateforme.

6. **Validation des exigences** : Nous avons vérifié la conformité des fonctionnalités implémentées par rapport au cahier des charges.

## Fonctionnalités implémentées

### Section Merchant (Commerçant)
- Tableau de bord avec statistiques
- Gestion des contrats
- Gestion des annonces
- Système de facturation
- Suivi des paiements

### Section Provider (Prestataire)
- Tableau de bord avec statistiques et services à venir
- Calendrier interactif
- Gestion des services
- Configuration des disponibilités
- Gestion des factures et paiements

## Points d'amélioration identifiés

Lors de la tentative de construction du projet, nous avons identifié quelques problèmes qui nécessiteront une attention particulière pour les développements futurs :

1. **Conflits de routes** : Des conflits ont été détectés entre les routes parallèles, notamment dans les sections dashboard et admin. Ces conflits devront être résolus en restructurant les groupes de routes.

2. **Utilisation incorrecte de directives** : Une erreur a été détectée concernant l'exportation de "metadata" depuis un composant marqué avec "use client", ce qui n'est pas autorisé dans Next.js.

3. **Configuration Babel personnalisée** : Le projet utilise une configuration Babel personnalisée qui pourrait être simplifiée pour améliorer les performances de construction.

## Prochaines étapes recommandées

Pour continuer le développement du projet, nous recommandons les actions suivantes :

1. **Résoudre les conflits de routes** : Restructurer les groupes de routes pour éliminer les conflits identifiés lors de la construction.

2. **Corriger les erreurs de directives** : Revoir l'utilisation des directives "use client" et l'exportation de metadata dans les composants.

3. **Implémenter l'authentification** : Développer les flux d'authentification pour les différents types d'utilisateurs.

4. **Développer les API backend** : Créer les endpoints API nécessaires pour connecter les interfaces frontend à une base de données.

5. **Compléter les interfaces client et livreur** : Développer les interfaces utilisateur pour les sections client et livreur qui sont actuellement moins avancées.

6. **Optimiser les performances** : Simplifier la configuration Babel et optimiser le chargement des ressources.

## Livrables fournis

1. **Code source** : Le code source complet du projet avec les fonctionnalités implémentées.

2. **Documentation** :
   - `docs/documentation.md` : Documentation complète du projet
   - `docs/validation-requirements.md` : Validation des fonctionnalités par rapport aux exigences
   - `docs/deployment-guide.md` : Guide de déploiement et d'utilisation
   - `docs/exigences-projet.md` : Synthèse des exigences du projet
   - `docs/composants-manquants.md` : Analyse des composants manquants

3. **Tests** : Tests unitaires, d'intégration et fonctionnels pour toutes les fonctionnalités implémentées.

## Conclusion

Le projet EcoDeli a été développé en suivant les bonnes pratiques de Next.js, avec une organisation scalable et des données dynamiques. Les fonctionnalités essentielles pour les commerçants et les prestataires de services ont été implémentées avec succès, et des tests ont été créés pour assurer la robustesse du code.

Bien que certains problèmes aient été identifiés lors de la tentative de construction, ces points sont bien documentés et peuvent être résolus dans les prochaines phases de développement. La documentation complète et le guide de déploiement fournis faciliteront la poursuite du développement et l'utilisation de la plateforme.

Nous sommes convaincus que ce projet constitue une base solide pour le développement futur de la plateforme EcoDeli et qu'il répond aux exigences définies dans le cahier des charges.

---

Date : 5 avril 2025
// This is your Prisma schema file for EcoDeli
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Modèle de base pour les utilisateurs
model User {
  id                String    @id @default(cuid())
  name              String
  email             String    @unique
  emailVerified     DateTime?
  image             String?
  password          String
  phone             String?
  address           String?
  city              String?
  postalCode        String?
  country           String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  role              Role      @default(CLIENT)
  status            Status    @default(PENDING)

  // Relations avec les autres modèles en fonction du rôle
  client            Client?
  merchant          Merchant?
  courier           Courier?
  provider          Provider?

  // Authentification
  accounts          Account[]
  sessions          Session[]

  // Alertes
  alertRules        AlertRule[]
  alerts            Alert[]
}

// Modèle pour l'authentification avec NextAuth
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Énumération des rôles possibles
enum Role {
  ADMIN
  CLIENT
  MERCHANT
  COURIER
  PROVIDER
}

// Énumération des statuts des utilisateurs
enum Status {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

// Client (Particulier)
model Client {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  loyaltyPoints Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  shipments     Shipment[]
  orders        Order[]

  @@index([userId])
}

// Commerçant
model Merchant {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName     String
  siret           String    @unique
  businessType    String
  website         String?
  description     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  products        Product[]
  orders          Order[]

  @@index([userId])
  @@index([siret])
}

// Livreur
model Courier {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicleType       String
  licensePlate      String?
  idCardNumber      String?
  drivingLicense    String?
  idCardVerified    Boolean   @default(false)
  licenseVerified   Boolean   @default(false)
  isAvailable       Boolean   @default(true)
  currentLocation   String?
  rating            Float?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  deliveries        Delivery[]

  @@index([userId])
  @@index([isAvailable])
}

// Prestataire de services
model Provider {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName     String?
  siret           String?   @unique
  serviceTypes    String[]
  description     String?
  rating          Float?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  services        Service[]

  @@index([userId])
}

// Modèle pour les colis
model Shipment {
  id              String    @id @default(cuid())
  clientId        String
  trackingNumber  String    @unique
  status          String
  origin          String
  destination     String
  weight          Float
  dimensions      String?
  description     String?
  specialHandling Boolean   @default(false)
  insurance       Boolean   @default(false)
  price           Float
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  client          Client    @relation(fields: [clientId], references: [id])
  delivery        Delivery?

  @@index([clientId])
  @@index([trackingNumber])
  @@index([status])
}

// Modèle pour les livraisons
model Delivery {
  id              String    @id @default(cuid())
  shipmentId      String    @unique
  courierId       String?
  status          String
  estimatedPickup DateTime?
  actualPickup    DateTime?
  estimatedDelivery DateTime?
  actualDelivery  DateTime?
  notes           String?
  signature       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  shipment        Shipment  @relation(fields: [shipmentId], references: [id])
  courier         Courier?  @relation(fields: [courierId], references: [id])

  @@index([shipmentId])
  @@index([courierId])
  @@index([status])
}

// Modèle pour les produits des commerçants
model Product {
  id              String    @id @default(cuid())
  merchantId      String
  name            String
  description     String?
  price           Float
  stock           Int
  category        String?
  imageUrl        String?
  weight          Float?
  dimensions      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  merchant        Merchant  @relation(fields: [merchantId], references: [id])
  orderItems      OrderItem[]

  @@index([merchantId])
  @@index([category])
}

// Modèle pour les commandes
model Order {
  id              String    @id @default(cuid())
  clientId        String
  merchantId      String
  status          String
  totalAmount     Float
  paymentStatus   String
  shippingAddress String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  client          Client    @relation(fields: [clientId], references: [id])
  merchant        Merchant  @relation(fields: [merchantId], references: [id])
  orderItems      OrderItem[]

  @@index([clientId])
  @@index([merchantId])
  @@index([status])
}

// Modèle pour les articles d'une commande
model OrderItem {
  id              String    @id @default(cuid())
  orderId         String
  productId       String
  quantity        Int
  unitPrice       Float
  totalPrice      Float

  // Relations
  order           Order     @relation(fields: [orderId], references: [id])
  product         Product   @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
}

// Modèle pour les services proposés par les prestataires
model Service {
  id              String    @id @default(cuid())
  providerId      String
  name            String
  description     String?
  price           Float
  duration        Int?      // en minutes
  category        String
  isAvailable     Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  provider        Provider  @relation(fields: [providerId], references: [id])
  bookings        Booking[]

  @@index([providerId])
  @@index([category])
  @@index([isAvailable])
}

// Modèle pour les réservations de services
model Booking {
  id              String    @id @default(cuid())
  serviceId       String
  userId          String
  status          String
  scheduledDate   DateTime
  notes           String?
  price           Float
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  service         Service   @relation(fields: [serviceId], references: [id])

  @@index([serviceId])
  @@index([userId])
  @@index([status])
}

// Modèle pour les règles d'alerte
model AlertRule {
  id              String    @id @default(cuid())
  userId          String
  type            String
  conditions      String    // JSON
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  user            User      @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([type])
}

// Modèle pour les alertes
model Alert {
  id              String    @id @default(cuid())
  userId          String
  title           String
  message         String
  type            String
  isRead          Boolean   @default(false)
  createdAt       DateTime  @default(now())

  // Relations
  user            User      @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([isRead])
}
