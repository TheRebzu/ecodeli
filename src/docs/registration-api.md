# API d'Inscription Multi-Rôles EcoDeli

Cette documentation décrit les endpoints API pour le système d'inscription multi-rôles d'EcoDeli, permettant aux utilisateurs de s'inscrire selon différents profils (client, livreur, commerçant, prestataire).

## Technologies

- **Next.js** : Framework React pour le backend et le frontend
- **tRPC** : API typées pour la communication client-serveur
- **Prisma** : ORM pour la base de données PostgreSQL
- **NextAuth.js** : Authentification
- **Zod** : Validation de schémas

## Endpoints API REST

### Inscription - `POST /api/auth/register`

Créer un nouveau compte utilisateur avec un profil spécifique au rôle.

**Payload de la requête**:
```json
{
  "firstName": "string", // Min 2 caractères
  "lastName": "string", // Min 2 caractères
  "email": "string", // Format email valide
  "password": "string", // Min 8 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre
  "role": "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER",
  
  // Champs pour les MERCHANT (commerçants)
  "storeName": "string", // Requis pour les commerçants
  "storeType": "string", // Requis pour les commerçants
  "siret": "string", // 14 chiffres, optionnel
  
  // Champs pour les DELIVERER (livreurs)
  "vehicleType": "string", // Requis pour les livreurs
  "licenseNumber": "string", // Requis pour les livreurs
  "idCardNumber": "string", // Requis pour les livreurs
  
  // Champs pour les PROVIDER (prestataires)
  "serviceType": "string", // Requis pour les prestataires
  "experience": "string", // Optionnel
  "hourlyRate": "string", // Optionnel
  
  // Champs communs pour certains rôles
  "address": "string", // Requis pour les commerçants, livreurs, prestataires
  "city": "string", // Requis pour les commerçants, livreurs, prestataires
  "postalCode": "string", // Requis pour les commerçants, livreurs, prestataires (5 chiffres)
  "phone": "string", // Optionnel pour tous les rôles
  "serviceArea": "number", // Optionnel pour les prestataires
  "availability": "string[]", // Optionnel pour les livreurs
  "description": "string" // Optionnel pour les prestataires
}
```

**Réponse - Succès (201)**:
```json
{
  "success": true,
  "message": "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER"
  }
}
```

**Réponse - Erreur (400, 409, 500)**:
```json
{
  "error": "Message d'erreur",
  "details": [] // Détails des erreurs de validation (pour les erreurs 400)
}
```

### Vérification d'Email - `POST /api/auth/verify-email`

Vérifie l'adresse email d'un utilisateur à l'aide d'un token.

**Payload de la requête**:
```json
{
  "token": "string" // Token de vérification
}
```

**Réponse - Succès (200)**:
```json
{
  "success": true,
  "message": "Votre adresse email a été vérifiée avec succès"
}
```

**Réponse - Erreur (400, 500)**:
```json
{
  "error": "Le lien de vérification est invalide ou a expiré"
}
```

### Demande de Réinitialisation de Mot de Passe - `POST /api/auth/forgot-password`

Génère un token de réinitialisation et envoie un email à l'utilisateur.

**Payload de la requête**:
```json
{
  "email": "string" // Format email valide
}
```

**Réponse - Succès (200)**:
```json
{
  "success": true,
  "message": "Si votre adresse est associée à un compte, un email de réinitialisation a été envoyé"
}
```

**Réponse - Erreur (400, 500)**:
```json
{
  "error": "Message d'erreur"
}
```

### Réinitialisation de Mot de Passe - `POST /api/auth/reset-password`

Réinitialise le mot de passe d'un utilisateur à l'aide d'un token.

**Payload de la requête**:
```json
{
  "token": "string",
  "password": "string", // Min 8 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre
  "confirmPassword": "string" // Doit correspondre au mot de passe
}
```

**Réponse - Succès (200)**:
```json
{
  "success": true,
  "message": "Votre mot de passe a été réinitialisé avec succès"
}
```

**Réponse - Erreur (400, 500)**:
```json
{
  "error": "Message d'erreur"
}
```

## Endpoints API tRPC

Les endpoints tRPC suivants sont également disponibles pour les mêmes fonctionnalités :

- `auth.signUp` - Inscription
- `auth.verifyEmail` - Vérification d'email
- `auth.forgotPassword` - Demande de réinitialisation
- `auth.resetPassword` - Réinitialisation de mot de passe
- `auth.validateSession` - Validation de session
- `auth.changePassword` - Changement de mot de passe (utilisateur connecté)

## Flux d'Inscription

1. L'utilisateur sélectionne son type de profil (client, livreur, commerçant, prestataire)
2. L'utilisateur remplit le formulaire d'inscription spécifique à son rôle
3. L'utilisateur soumet le formulaire
4. Le système crée l'utilisateur dans la base de données
5. Le système crée le profil spécifique au rôle (ClientProfile, DelivererProfile, etc.)
6. Le système envoie un email de vérification
7. L'utilisateur clique sur le lien de vérification
8. Le système vérifie l'adresse email et active le compte
9. L'utilisateur peut maintenant se connecter

## Modèles de Données

### User
- id: string
- name: string
- email: string (unique)
- password: string (hashed)
- role: UserRole
- emailVerified: Date?
- createdAt: Date
- updatedAt: Date

### ClientProfile
- id: string
- userId: string (unique)
- phone: string?
- createdAt: Date
- updatedAt: Date

### DelivererProfile
- id: string
- userId: string (unique)
- vehicleType: string
- licenseNumber: string
- idCardNumber: string
- address: string
- city: string
- postalCode: string
- availability: string[]
- isVerified: boolean
- createdAt: Date
- updatedAt: Date

### Store (pour les commerçants)
- id: string
- merchantId: string
- name: string
- description: string
- type: string
- address: string
- city: string
- postalCode: string
- phoneNumber: string
- siret: string?
- status: StoreStatus
- createdAt: Date
- updatedAt: Date

### ServiceProvider
- id: string
- userId: string (unique)
- serviceType: string
- experience: string?
- hourlyRate: string?
- address: string
- city: string
- postalCode: string
- serviceArea: number?
- description: string?
- siret: string?
- isVerified: boolean
- createdAt: Date
- updatedAt: Date

## Sécurité

- Les mots de passe sont hashés avec bcrypt
- Les emails doivent être vérifiés avant la connexion
- Les tokens de vérification et réinitialisation expirent après un délai
- Les formulaires sont validés côté client et côté serveur avec Zod 