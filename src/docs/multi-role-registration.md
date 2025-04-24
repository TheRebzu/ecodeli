# Système d'inscription multi-rôles pour EcoDeli

Ce document décrit le système d'inscription multi-rôles développé pour EcoDeli, permettant aux utilisateurs de s'inscrire selon différents profils et avec des informations spécifiques à chaque rôle.

## Architecture du système

Le système d'inscription est structuré comme suit :

1. **Sélecteur de rôle** - Page principale permettant aux utilisateurs de choisir leur type de profil
2. **Formulaires d'inscription spécifiques au rôle** - Composants adaptés à chaque type d'utilisateur
3. **Formulaires par étapes** - Processus progressif de collecte d'informations
4. **Pages de routes** - Pages Next.js associées à chaque type d'inscription

### Structure des fichiers

```
src/
  ├── app/
  │   └── (auth)/
  │       └── register/
  │           ├── page.tsx                 # Sélecteur de rôle
  │           ├── client/
  │           │   └── page.tsx             # Route d'inscription client
  │           ├── deliverer/
  │           │   └── page.tsx             # Route d'inscription livreur
  │           ├── merchant/
  │           │   └── page.tsx             # Route d'inscription commerçant
  │           └── provider/
  │               └── page.tsx             # Route d'inscription prestataire
  ├── components/
  │   └── auth/
  │       ├── role-selector.tsx            # Composant de sélection de rôle
  │       ├── form-steps/
  │       │   ├── personal-info.tsx        # Étape d'informations personnelles
  │       │   └── account-details.tsx      # Étape de création de compte
  │       └── register-forms/
  │           ├── client-form.tsx          # Formulaire d'inscription client
  │           ├── deliverer-form.tsx       # Formulaire d'inscription livreur
  │           ├── merchant-form.tsx        # Formulaire d'inscription commerçant
  │           └── provider-form.tsx        # Formulaire d'inscription prestataire
```

## Flux d'inscription

1. L'utilisateur arrive sur la page d'inscription principale et sélectionne son type de profil.
2. En fonction du choix, l'utilisateur est redirigé vers la page d'inscription spécifique à son rôle.
3. Chaque formulaire d'inscription est divisé en étapes distinctes :
   - **Informations personnelles** (commune à tous les rôles)
   - **Informations spécifiques au rôle** (varie selon le type d'utilisateur)
   - **Détails du compte** (mot de passe et conditions d'utilisation, commun à tous)
   - **Confirmation** (confirmation d'inscription réussie)

## Types d'utilisateurs et champs spécifiques

### Client
- Informations de base (nom, prénom, email, téléphone)
- Informations de compte (mot de passe, conditions d'utilisation)

### Livreur
- Informations de base
- Type de véhicule
- Numéro de permis et de carte d'identité
- Adresse complète
- Disponibilités
- Informations de compte

### Commerçant
- Informations de base
- Nom et type de commerce
- Adresse du commerce
- Numéro SIRET
- Informations de compte

### Prestataire de service
- Informations de base
- Nom du service
- Types de services proposés
- Zone de service
- Niveau d'expérience
- Numéro SIRET (optionnel)
- Biographie
- Informations de compte

## Validation des données

Chaque formulaire utilise Zod pour la validation côté client avec des règles spécifiques :
- Champs obligatoires
- Formats spécifiques (email, téléphone, code postal)
- Longueurs minimales/maximales
- Validation de mot de passe robuste

## Gestion de l'état et soumission

- Chaque formulaire gère son propre état avec React useState
- Les données sont collectées par étapes et combinées à la soumission finale
- La soumission simule un appel API (à remplacer par l'intégration réelle)

## Extension du système

Pour ajouter un nouveau type d'utilisateur ou rôle :

1. Créer un nouveau formulaire sous `components/auth/register-forms/`
2. Ajouter les étapes spécifiques au rôle
3. Créer une nouvelle route sous `app/(auth)/register/`
4. Ajouter le rôle au composant `role-selector.tsx`

## Considérations futures

- Intégration avec l'API d'authentification
- Vérification d'email
- Upload et vérification de documents
- Intégration des paiements pour les rôles commerciaux
- Système de parrainage 