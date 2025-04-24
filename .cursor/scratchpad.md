# Ecodeli Project Restructuring Plan

## Background and Motivation
EcoDeli est une société proposant une solution de crowdshipping (livraison collaborative) qui met en relation des personnes ou entreprises ayant des colis à expédier avec des livreurs particuliers. La plateforme permet également d'offrir divers services à la personne (transport, courses, travaux ménagers, etc.). Le projet vise à restructurer et à développer l'application web complète d'EcoDeli ainsi que les services annexes et l'infrastructure réseau nécessaire au bon fonctionnement de l'entreprise.

### Présentation d'EcoDeli
- Fondée en 2018 à Paris
- Propose un système de livraison par particuliers (crowdshipping)
- Offre également des services à la personne (transport, courses, etc.)
- Possède des entrepôts dans plusieurs villes françaises (Paris, Marseille, Lyon, Lille, Montpellier, Rennes)
- Modèle économique basé sur la mise en relation et les abonnements

### Structure du projet
Le projet est divisé en trois missions principales:
1. **Mission 1**: Gestion de la société via une application web
2. **Mission 2**: Services supplémentaires (application Java, application Android, cartes NFC)
3. **Mission 3**: Infrastructure Système, Réseau et Sécurité

## Key Challenges and Analysis
- Le projet nécessite de gérer différents types d'utilisateurs avec des fonctionnalités spécifiques
- L'application doit être multilingue pour aider les clients étrangers
- Une API doit être construite pour gérer l'intégralité des traitements
- L'application doit gérer des paiements via Stripe
- Le système doit générer automatiquement des factures et documents PDF
- L'infrastructure réseau doit assurer une haute disponibilité entre plusieurs sites
- La sécurité doit être renforcée à tous les niveaux (authentification, données, réseau)

### Détails des espaces utilisateurs
1. **Espace livreur**:
   - Gestion des annonces
   - Gestion des pièces justificatives
   - Gestion des livraisons
   - Gestion des paiements
   - Gestion du planning et des déplacements

2. **Espace commerçant**:
   - Gestion du contrat
   - Gestion des annonces
   - Gestion de la facturation
   - Accès aux paiements

3. **Espace client**:
   - Dépôt d'annonces
   - Réservation de services
   - Prise de rendez-vous avec prestataires
   - Gestion des paiements
   - Accès aux informations de stockage temporaire (box)
   - Tutoriel à la première connexion

4. **Espace prestataire**:
   - Suivi des évaluations
   - Validation de la sélection
   - Calendrier des disponibilités
   - Gestion des interventions
   - Facturation automatique mensuelle

5. **Administration générale**:
   - Gestion des commerçants, contrats, livreurs, prestataires, livraisons
   - Gestion des prestations et suivi
   - Gestion des paiements et facturation
   - Gestion financière de l'entreprise

## Implementation Approach
- Développer une application web complète pour la mission 1
- Créer des applications supplémentaires pour la mission 2
- Déployer l'infrastructure réseau pour la mission 3
- Utiliser une architecture modulaire avec API centrale
- Implémenter les standards de sécurité à tous les niveaux
- Assurer une expérience utilisateur fluide et intuitive

## High-level Task Breakdown

### Mission 1: Application Web de Gestion
1. **Développer le Frontend**
   - Interface utilisateur responsive avec routes appropriées
   - Composants UI pour les différents espaces utilisateurs
   - Formulaires pour toutes les opérations nécessaires
   - Système de notification push
   - Support multilingue
   - Success criteria: Interface utilisateur complète et fonctionnelle

2. **Développer le Backend et l'API**
   - API RESTful ou tRPC pour toutes les fonctionnalités
   - Gestion de l'authentification et autorisation
   - Intégration avec le système de paiement Stripe
   - Génération de PDF pour les factures et documents
   - Success criteria: API documentée et fonctionnelle

3. **Configurer la Base de Données**
   - Schéma complet avec toutes les entités nécessaires
   - Migration et seeding pour le développement
   - Optimisation des requêtes
   - Success criteria: Base de données structurée et performante

4. **Implémentation des Fonctionnalités Spécifiques**
   - Système de gestion des annonces
   - Système de suivi des livraisons en temps réel
   - Gestion des paiements et facturation
   - Système d'évaluation et de notation
   - Success criteria: Fonctionnalités métier implémentées

### Mission 2: Services Supplémentaires
1. **Développer l'Application Java de Reporting**
   - Interface graphique pour visualiser les statistiques
   - Récupération des données depuis l'API
   - Génération de rapports PDF avec diagrammes statistiques
   - Success criteria: Application fonctionnelle générant des rapports détaillés

2. **Développer l'Application Android**
   - Interface mobile pour les clients
   - Accès aux livraisons et prestations
   - Validation des livraisons
   - Success criteria: Application Android fonctionnelle

3. **Implémentation du Système NFC**
   - Intégration des cartes NFC pour les livreurs
   - Système de reconnaissance par les clients
   - Success criteria: Fonctionnalité NFC opérationnelle

### Mission 3: Infrastructure Système, Réseau et Sécurité
1. **Configurer les Serveurs**
   - Serveur Active Directory sous Windows
   - Serveurs de stockage
   - Serveurs mail sous Linux
   - Serveurs DHCP et DNS
   - Success criteria: Infrastructure serveur en place

2. **Configurer le Réseau**
   - Mise en place des VLAN
   - Configuration des firewalls OPNSense
   - Configuration des VPN site-to-site et client-to-site
   - Configuration du protocole RIP v2
   - Success criteria: Réseau fonctionnel et sécurisé

3. **Mettre en Place la Sécurité**
   - Configuration HTTPS
   - Chiffrement des données sensibles
   - Règles de firewalling précises
   - Success criteria: Système sécurisé à tous les niveaux

4. **Déploiement et Supervision**
   - Conteneurisation avec Docker
   - Outils de supervision (GLPI, Zabbix/Nagios)
   - Backup régulier des données
   - Success criteria: Système déployé et supervisé

## Project Status Board
- ⚠️ Task 1: Create missing top-level directories
  - ⚠️ 1.1: Create src/server directory and subdirectories (partiellement fait)
  - ✅ 1.2: Create src/types directory and basic type files
  - ❌ 1.3: Create src/constants directory and files

- ❌ Task 2: Fix and expand Prisma configuration (PRIORITÉ CRITIQUE)
  - ❌ 2.1: Fix schema.prisma provider
  - ❌ 2.2: Create basic data models
  - ❌ 2.3: Set up migrations
  - ❌ 2.4: Create seed script

- ⚠️ Task 3: Expand authentication structure
  - ✅ 3.1: Create authentication routes
  - ✅ 3.2: Set up NextAuth configuration
  - ⚠️ 3.3: Create auth components (en cours)
    - ✅ 3.3.1: Implement role selector component
    - ✅ 3.3.2: Create reusable form steps
    - ✅ 3.3.3: Implement client registration form
    - ❌ 3.3.4: Implement deliverer registration form
    - ❌ 3.3.5: Implement merchant registration form
    - ❌ 3.3.6: Implement provider registration form
    - ❌ 3.3.7: Create login form and related components

- ❌ Task 4: Organize dashboard routes
  - ❌ 4.1: Create client dashboard structure
  - ❌ 4.2: Create deliverer dashboard structure
  - ❌ 4.3: Create merchant dashboard structure
  - ❌ 4.4: Create provider dashboard structure
  - ❌ 4.5: Create admin dashboard structure

- ⚠️ Task 5: Expand components directory
  - ⚠️ 5.1: Create auth components subdirectory (en cours)
  - ❌ 5.2: Create layout components subdirectory
  - ❌ 5.3: Create dashboard components subdirectory
  - ❌ 5.4: Create delivery components subdirectory
  - ❌ 5.5: Create forms components subdirectory
  - ❌ 5.6: Create modals components subdirectory
  - ❌ 5.7: Create shared components subdirectory

- ✅ Task 6: Set up API routes
  - ✅ 6.1: Organize tRPC routes
  - ✅ 6.2: Set up auth API routes
  - ✅ 6.3: Set up webhook handlers

- ⚠️ Task 7: Expand lib directory
  - ⚠️ 7.1: Set up auth utilities (partiellement fait)
  - ✅ 7.2: Set up tRPC configuration
  - ❌ 7.3: Create utility modules (nfc, pdf, email, etc.)

- ❌ Task 8: Set up internationalization
  - ❌ 8.1: Create locale directories
  - ❌ 8.2: Add translation files
  - ❌ 8.3: Configure i18n

## Tâches supplémentaires pour la gestion des dépendances
- ❌ Task 9: Vérifier et installer les dépendances manquantes
  - ⚠️ 9.1: Vérifier les dépendances essentielles du framework principal (partiellement fait)
  - ❌ 9.2: Configurer Prisma et ses adaptateurs
  - ✅ 9.3: Installer les packages d'authentification
  - ⚠️ 9.4: Installer les composants UI et leurs dépendances (partiellement fait)
  - ❌ 9.5: Configurer les bibliothèques de formulaires
  - ⚠️ 9.6: Installer les dépendances API et gestion d'état (partiellement fait)
  - ❌ 9.7: Configurer les fonctionnalités métier spécifiques
  - ❌ 9.8: Installer les outils d'emails et notifications
  - ❌ 9.9: Configurer les outils de visualisation
  - ❌ 9.10: Mettre en place la sécurité et le SEO

## Tâches spécifiques au projet EcoDeli
- ❌ Task 10: Implémentation des fonctionnalités métier essentielles
  - ❌ 10.1: Système de dépôt d'annonces par les clients
  - ❌ 10.2: Système de matching entre annonces et livreurs
  - ❌ 10.3: Système de suivi des colis en temps réel
  - ❌ 10.4: Gestion des paiements et conservation des fonds jusqu'à livraison
  - ❌ 10.5: Système de validation de livraison par code
  - ❌ 10.6: Gestion des abonnements (Free, Starter, Premium)
  - ❌ 10.7: Système d'assurance pour les colis

- ❌ Task 11: Développement de l'application Java de reporting
  - ❌ 11.1: Interface graphique de l'application
  - ❌ 11.2: Connexion à l'API pour récupérer les données
  - ❌ 11.3: Génération de diagrammes statistiques
  - ❌ 11.4: Export au format PDF

- ❌ Task 12: Développement de l'application Android
  - ❌ 12.1: Interface mobile pour les clients
  - ❌ 12.2: Fonctionnalités de suivi des livraisons
  - ❌ 12.3: Système de validation des livraisons

## Tableau de Mapping des Dépendances

### Framework Principal
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| next | Framework principal avec routage et SSR | ✅ | Essentiel |
| react, react-dom | Bibliothèque UI | ✅ | Essentiel |
| typescript | Support de typage statique | ✅ | Essentiel |

### Base de Données
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| @prisma/client | Client ORM pour BD PostgreSQL | ✅ | Essentiel |
| prisma (dev) | Gestion du schéma et migrations | ✅ | Essentiel |

### Authentification
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| next-auth | Framework d'authentification multi-stratégies | ✅ | Essentiel |
| @auth/prisma-adapter | Adaptateur Prisma pour NextAuth | ✅ | Essentiel |
| bcrypt | Hachage des mots de passe | ✅ | Essentiel |
| jsonwebtoken | Gestion des JWT | ✅ | Essentiel |

### UI Composants
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| @radix-ui/* (tous) | Composants UI accessibles pour les différents espaces utilisateurs | ✅ | Essentiel |
| lucide-react | Icônes pour l'interface | ✅ | Essentiel |
| react-icons | Icônes supplémentaires | ✅ | Essentiel |
| next-themes | Thèmes clair/sombre | ✅ | Utile |
| sonner | Notifications toast pour feedback utilisateur | ✅ | Essentiel |
| embla-carousel-react | Carrousels pour affichage des annonces | ✅ | Utile |
| react-resizable-panels | Panneaux redimensionnables pour l'interface admin | ✅ | Utile |
| vaul | Composant drawer pour interfaces mobiles | ✅ | Utile |

### Formulaires
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| react-hook-form | Gestion des formulaires (inscription, annonces, etc.) | ✅ | Essentiel |
| @hookform/resolvers | Integration avec validateurs | ✅ | Essentiel |
| zod | Validation des données des formulaires | ✅ | Essentiel |
| zod-form-data | Validation des données de formulaires multipart | ✅ | Essentiel |
| zod-validation-error | Messages d'erreur améliorés | ✅ | Utile |
| input-otp | Saisie pour codes de validation livraison | ✅ | Essentiel |
| react-day-picker | Sélection de dates pour livraisons | ✅ | Essentiel |

### API & État
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| @trpc/* (tous) | API typesafe pour communications client-serveur | ✅ | Essentiel |
| @tanstack/react-query | Gestion des requêtes et mise en cache | ✅ | Essentiel |
| axios | Client HTTP pour APIs externes | ✅ | Essentiel |
| zustand | Gestion d'état global léger | ✅ | Essentiel |
| superjson | Sérialisation JSON améliorée | ✅ | Essentiel |

### Fonctionnalités Métier
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| @fullcalendar/* (tous) | Calendrier pour disponibilités des prestataires et livreurs | ✅ | Essentiel |
| @react-google-maps/api | Cartographie pour suivi des livraisons | ✅ | Essentiel |
| pdfmake | Génération des factures côté serveur | ✅ | Essentiel |
| react-pdf | Affichage des PDF côté client | ✅ | Essentiel |
| @stripe/* et stripe | Paiements sécurisés avec Stripe | ✅ | Essentiel |
| cloudinary | Stockage cloud pour pièces justificatives | ✅ | Essentiel |
| multer | Gestion des uploads de fichiers | ✅ | Essentiel |
| react-dropzone | Interface d'upload pour documents | ✅ | Essentiel |
| socket.io, socket.io-client | Communication temps réel pour suivi des colis | ✅ | Essentiel |
| react-qr-code | Génération de QR codes pour validation livraisons | ✅ | Essentiel |

### Emails & Notifications
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| nodemailer | Envoi d'emails (confirmation, notifications) | ✅ | Essentiel |
| react-email | Templates d'email React | ✅ | Essentiel |
| email-templates | Gestion des templates d'email | ✅ | Essentiel |
| web-push | Notifications push Web (alternative) | ✅ | Essentiel |

### Visualisations
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| recharts | Graphiques pour dashboard admin | ✅ | Essentiel |
| d3 | Visualisations avancées pour rapports | ✅ | Utile |

### Internationalisation
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| next-intl | Support multilingue | ✅ | Essentiel |

### Sécurité
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| helmet | Sécurisation des en-têtes HTTP | ✅ | Essentiel |
| next-csrf | Protection CSRF | ✅ | Essentiel |
| rate-limiter-flexible | Protection contre brute force | ✅ | Essentiel |

### SEO & Métadonnées
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| next-seo | Optimisation SEO | ✅ | Essentiel |
| schema-dts | Données structurées pour SEO | ✅ | Essentiel |

### Utilitaires
| Dépendance | Rôle dans EcoDeli | Statut | Importance |
|------------|-------------------|--------|------------|
| date-fns | Manipulation des dates | ✅ | Essentiel |
| class-variance-authority, clsx, tailwind-merge | Utilities CSS | ✅ | Essentiel |

## Planning des livrables
Selon le cahier des charges, les livrables doivent être fournis selon le calendrier suivant:

### Étape 1 (23/03/2025)
- Planification des tâches et chiffrage financier
- Charte graphique avec exemples
- Maquette définitive de l'application web
- Schéma de la base de données
- Descriptif fonctionnel détaillé
- Début de la partie back-office/gestion des utilisateurs
- Gantt ou équivalent
- Réponse au cahier des charges
- Devis avec le matériel informatique
- Ébauche du schéma réseau

### Étape 2 (11/05/2025)
- Front-end de la mission 1
- Finalisation du back-end de la mission 1
- Liste des fonctionnalités détaillées de la mission 2
- Schéma réseau à jour
- Document d'architecture technique (DAT)
- Finalisation de la gestion de projet
- Installation du cœur de réseau et début du déploiement du site de Paris

### Étape 3 (22/06/2025)
- Application Android (50%)
- Gestion des données (100%)
- Gestion des cartes NFC
- Déploiement des sites de Marseille et du site de backup
- Conteneurisation des missions 1 et 2

### Étape 4 (13/07/2025)
- Dossier complet d'utilisation
- Intégralité des fichiers sources
- Bases de données (vide et avec données)
- Applications complètes
- Documentation complète incluant DAT, réponse à l'appel d'offre, cahier des charges, aspect financier

## Implementation Priority
Nous recommandons d'implémenter les tâches dans l'ordre suivant:
1. Task 1 (Créer les répertoires manquants) - Établit la fondation
2. Task 9 (Vérifier et installer les dépendances) - Assure que tous les outils sont disponibles
3. Task 2 (Configuration Prisma) - Le schéma de base de données doit être défini tôt
4. Task 10 (Fonctionnalités métier) - Implémentation des fonctionnalités essentielles
5. Task 7 (Répertoire lib) - Les utilitaires sont nécessaires pour d'autres composants
6. Task 3 (Authentification) - Fonctionnalité critique
7. Task 6 (Routes API) - Points d'entrée backend nécessaires pour le frontend
8. Task 5 (Composants) - Composants UI pour supporter l'application
9. Task 4 (Routes dashboard) - Interfaces utilisateur pour différents rôles
10. Task 8 (Internationalisation) - Peut être implémenté en dernier
11. Task 11 (Application Java) - Après que les données principales soient disponibles
12. Task 12 (Application Android) - Après que l'API principale soit stable

## Current Status / Progress Tracking
API routes have been set up and implemented according to the project requirements. The implementation includes:

1. A comprehensive tRPC API structure with separate routers for different functionalities:
   - Authentication (user signup, session validation)
   - User management (profiles, updates, admin capabilities)
   - Announcements (creating, listing, accepting, canceling delivery announcements)
   - Deliveries (tracking, updating, confirming)
   - Merchants (store management)
   - Service providers (service offerings, appointments)
   - Payments (payment intents, webhooks, transaction history)

2. Authentication is implemented with NextAuth including:
   - JWT-based session management
   - Credentials provider with bcrypt password hashing
   - Custom user role-based authorization middleware

3. Webhook handling for payment processing:
   - Stripe integration for secure payments
   - Webhook endpoint for event processing
   - Support for different payment types (announcements, deliveries, subscriptions)

4. Client-side tRPC setup with:
   - React hooks provider
   - TypeScript type safety across client-server boundary
   - Superjson for seamless data serialization

5. Documentation and planning updates:
   - Created detailed API documentation
   - Updated authentication structure documentation with multi-role registration system
   - Prepared comprehensive file structure for authentication components

6. Authentication component implementation progress (NEW):
   - Directory structure created for auth components
   - Created role selector component for registration process
   - Implemented multi-step form components:
     - Personal information form step with validation
     - Account details form step with password strength indicator
   - Built client registration form with progress tracking
   - Created registration pages structure

### Recent Updates - Authentication Structure Enhancement
A detailed authentication structure has been designed and documented to implement a comprehensive multi-role registration system. The structure includes:

1. **Role-specific registration flows**:
   - Separate registration paths for clients, deliverers, merchants, and service providers
   - Custom validation schemas for each user type
   - Document verification processes for deliverers and service providers

2. **Enhanced security features**:
   - KYC verification process for specific user roles
   - Document upload and verification system
   - Role-based authorization with granular permissions

3. **Onboarding experience**:
   - Mandatory first-login tutorial system with role-specific guidance
   - Progress tracking for onboarding completion
   - Multilingual support for all authentication interfaces

4. **Backend Components**:
   - Specialized API endpoints for each user role
   - Role-specific tRPC procedures
   - Document processing and verification services

### Authentication Implementation Progress (NEW)
The initial phase of implementing the authentication structure is now underway. Progress so far:

1. **Directory Structure**:
   - Created component directories for auth forms and utilities
   - Set up app routes for the registration flow
   - Organized form components in a logical structure

2. **Components Implemented**:
   - Role selection interface for the main registration page
   - Reusable form step components (personal info, account details)
   - Multi-step registration form for clients with:
     - Progress tracking
     - Data persistence between steps
     - Success confirmation screen

3. **Validation**:
   - Implemented Zod schemas for form validation
   - Added password strength indicator
   - Integrated with React Hook Form for seamless form state management

### Validation Report - June 2023
The API implementation follows best practices for security, error handling, and data validation. All API endpoints include proper input validation using Zod schemas, error handling with appropriate HTTP status codes, and role-based access controls.

However, there are several critical issues that need to be addressed before proceeding:

#### Critical Issues:
1. **Missing Prisma Schema Models**: All API routers reference database models that don't exist yet in the Prisma schema, resulting in TypeScript errors.
2. **Authentication UI Components**: While the authentication backend is implemented, the UI components are missing.
3. **Directory Structure**: Some directories in the project structure are missing.

#### Status of Tasks:
✅ Task 6: Set up API routes - **COMPLETED**
  - All API routes organized with tRPC
  - Authentication setup with NextAuth
  - Webhook handlers for Stripe implemented

⚠️ Task 1: Create missing top-level directories - **PARTIALLY COMPLETED**
  - src/server/api structure exists
  - Need to finalize remaining directories

❌ Task 2: Fix and expand Prisma configuration - **CRITICAL PRIORITY**
  - No database schema matching API implementation
  - All API functionality blocked by this issue

⚠️ Task 3: Expand authentication structure - **PARTIALLY COMPLETED**
  - Backend authentication complete
  - Auth structure planned and documented
  - Frontend components missing
  - Need to implement registration forms for different user roles

⚠️ Task 7: Expand lib directory - **PARTIALLY COMPLETED**
  - tRPC base configuration exists
  - Need additional utilities for auth, validation and document handling

#### Technical Issues:
- Multiple TypeScript errors due to missing Prisma models
- Session handling null-safety issues
- Stripe API version mismatch ('2023-10-16' vs '2025-03-31.basil')
- Missing module references in various files

### Action Plan - Next Steps:
1. **IMMEDIATE**: Complete Task 2 - Prisma schema definition
   - Define all required models (User, Announcement, Delivery, etc.)
   - Update schema.prisma with appropriate relations
   - Set up migrations
   - Create seed data for testing

2. **SECONDARY**:
   - Complete Task 1 - Create remaining directories
   - Implement auth UI components (Task 3.3)
   - Fix TypeScript errors after schema definition
   - Add proper null-safety checks in routers

3. **FUTURE**:
   - Implement Tasks 4 & 5 (Dashboard routes and Components)
   - Complete Task 8 (Internationalization)
   - Test all API functionality with database integration

This action plan aligns with the project deadlines outlined in the Planning des livrables section, focusing on having the core infrastructure ready for the Étape 1 deadline (23/03/2025).

## Executor's Feedback or Assistance Requests
I've made significant progress implementing the authentication structure as detailed in the `src/docs/auth-structure.md` document. Here's my current status and next steps:

### Current Progress

I've successfully implemented the foundation of the multi-role registration system:

1. **Directory Structure**: 
   - Created key directories for auth components and registration flows
   - Organized the codebase following the structure outlined in the auth documentation

2. **Core Components**:
   - Implemented role selector component to direct users to the appropriate registration form
   - Created reusable form step components (PersonalInfo, AccountDetails) with validation
   - Built complete client registration flow with multi-step form and progress tracking
   - Created route files for the different user roles

3. **Validation and User Experience**:
   - Implemented form validation with Zod schemas integrated with React Hook Form
   - Added password strength indicator with visual feedback
   - Created a smooth multi-step experience with state persistence between steps

### Next Steps

I plan to continue with the following tasks:

1. **Complete Registration Forms**:
   - Implement deliverer registration form with document upload capability
   - Create merchant registration form with business-specific fields
   - Build service provider registration form with services selection
   - Implement document verification interface for admin users

2. **Authentication Components**:
   - Create login form with email/password and social login options
   - Implement password reset flow
   - Build email verification components
   - Create two-factor authentication interface

3. **Integration with Backend**:
   - Connect forms to API endpoints when ready
   - Implement proper error handling and feedback
   - Set up authentication state management

### Assistance Needed

Before proceeding with the next phase, I would like clarification on the following points:

1. **UI Framework**: We're currently using a combination of custom CSS and Tailwind. Is there a preferred UI component library (like shadcn/ui, Radix UI, etc.) that we should use for form elements?

2. **Document Upload**: The authentication structure mentions Cloudinary for document storage. Is this already set up, or should I implement a different solution for document uploads?

3. **Internationalization**: The auth structure specifies multi-language support. Should I integrate this now, or focus on completing the English/French implementation first?

4. **API Integration**: While the tRPC router structure is in place, there seems to be an issue with Prisma models. Should I hold off on connecting forms to the backend until this is resolved?

I'll continue with implementing the deliverer registration form as my next task unless directed otherwise.

## Lessons
- Assurer une organisation appropriée dès le début pour éviter la complexité ultérieure
- La séparation des préoccupations est importante pour la maintenabilité
- La structure des fichiers doit refléter le modèle de domaine de l'application
- Corriger les problèmes de configuration (comme le fournisseur Prisma) tôt avant qu'ils ne causent des problèmes
- Une structure de dépendances bien organisée facilite la maintenance et l'évolution du projet
- Identifier clairement les dépendances essentielles vs utiles permet de prioriser l'implémentation
- Bien comprendre le cahier des charges avant de commencer l'implémentation
- Planifier les livrables en fonction des échéances imposées 
- Il est crucial de définir le schéma de base de données avant d'implémenter des fonctionnalités qui y font référence
- Un modèle de données cohérent facilite l'implémentation d'une API typée
- L'utilisation de tRPC permet une meilleure intégration entre frontend et backend
- L'implémentation rôle par rôle (client, livreur, commerçant) facilite la séparation des responsabilités
- L'intégration des services tiers (comme Stripe) nécessite une attention particulière aux versions d'API
- La gestion des erreurs TypeScript aide à identifier les problèmes d'implémentation
- La documentation des endpoints est essentielle pour la maintenance à long terme 