# Analyse du Projet EcoDeli

## Contexte du Projet

EcoDeli est une société de crowdshipping créée à Paris en 2018, qui met en relation des particuliers et des entreprises pour la livraison de colis et des services à la personne. L'entreprise connaît une croissance rapide et souhaite moderniser son système d'information, tant du point de vue du réseau que du point de vue applicatif.

## Services Proposés par EcoDeli

### Services de Livraison
- Gestion des annonces proposées par les particuliers ou les commerçants
- Prise en charge intégrale ou partielle du trajet de livraison
- Livraison aux destinataires finaux
- Suivi des colis en temps réel
- Assurances proposées par la société
- Lâcher de chariot (livraison à domicile des achats effectués chez un commerçant partenaire)

### Services à la Personne
- Transport quotidien de personnes (personnes âgées, voisins, etc.)
- Transfert aéroport au départ ou à l'arrivée
- Courses effectuées par un livreur EcoDeli
- Achat de produits à l'étranger
- Garde d'animaux à domicile
- Petits travaux ménagers et de jardinage

### Infrastructure Physique
- Entrepôts dans plusieurs villes (Paris, Marseille, Lyon, Lille, Montpellier, Rennes)
- L'entrepôt de Paris sert également de bureau principal

## Structure Actuelle du Projet

Le projet EcoDeli est une application Next.js avec une architecture organisée en plusieurs dossiers principaux:
- `/app` (structure principale avec App Router)
- `/components` (composants UI réutilisables)
- `/lib` (code de bibliothèque)
- `/prisma` (schéma de base de données)
- `/public` (ressources statiques)
- `/locales` (internationalisation)
- `/hooks` (hooks React)
- `/context` (contextes React)
- `/tests` (fichiers de test)
- `/docker` (configuration de conteneurisation)

L'application est divisée en sections pour différents types d'utilisateurs:
- `/admin`
- `/client`
- `/courier` (livreur)
- `/merchant` (commerçant)
- `/provider` (prestataire)
- `/(public)`

## Technologies Utilisées

- **Next.js 15.3.1** : Framework React avec App Router
- **pnpm** : Gestionnaire de paquets
- **Prisma 6.6.0** : ORM pour la gestion de la base de données PostgreSQL
- **shadcn/ui** : Composants UI basés sur Radix UI
- **TypeScript** : Pour le typage statique
- **TailwindCSS** : Pour le styling
- **tRPC** : Pour les API typesafe
- **NextAuth/Auth.js** : Pour l'authentification
- **Stripe** : Pour les paiements
- **React Hook Form & Zod** : Pour la validation des formulaires

## Flux de Travail Principaux

### Authentification
1. L'utilisateur s'inscrit en spécifiant son rôle
2. Des informations supplémentaires sont demandées selon le rôle
3. Pour les livreurs et prestataires, des documents justificatifs sont requis
4. Les administrateurs vérifient les documents et valident les comptes

### Livraison
1. Un client ou commerçant crée une annonce de livraison
2. Les livreurs consultent les annonces et proposent leurs services
3. Le client/commerçant sélectionne un livreur
4. Le paiement est effectué via Stripe (mis en attente)
5. Le livreur effectue la livraison et met à jour le statut
6. Le client confirme la réception
7. Le paiement est libéré et une facture est générée

### Services à la Personne
1. Un client demande un service
2. Les prestataires disponibles sont notifiés
3. Un prestataire accepte la demande
4. Le client effectue le paiement (mis en attente)
5. Le prestataire effectue le service et met à jour le statut
6. Le client confirme la réalisation
7. Le paiement est libéré et une facture est générée

## État Actuel du Développement

Le projet a été initialisé avec la structure de base et les dépendances nécessaires. Cependant, plusieurs erreurs TypeScript ont été détectées lors de la vérification de l'installation, ce qui est courant dans les projets en développement.

## Phases de Développement Prévues

1. **Configuration initiale et structure du projet** (partiellement complétée)
2. **Authentification et API**
3. **Développement des fonctionnalités principales** (espaces client, livreur, commerçant, prestataire, admin)
4. **Fonctionnalités avancées** (système de livraison, services à la personne, paiements, notifications)
5. **Optimisation et finalisation**
6. **Documentation et formation**

## Exigences Spécifiques

- Le projet doit suivre une structure organisée avec le répertoire `/app` et ne pas utiliser le système d'organisation par domaine
- Le nommage des fichiers doit être en anglais
- L'API doit être conçue pour être utilisable par les futures applications mobiles et desktop
- La base de données à utiliser est PostgreSQL
- L'authentification doit respecter les besoins spécifiés dans le cahier des charges
- Le développement doit respecter les bonnes pratiques de Next.js
- Toutes les données doivent être dynamiques et des tests doivent être implémentés
- Le projet doit être utilisable et respecter le cahier des charges
