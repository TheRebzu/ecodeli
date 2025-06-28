# 🧪 Guide de test de l'API EcoDeli

Ce guide vous aide à tester l'implémentation complète de la fonctionnalité d'annonces EcoDeli.

## 🚀 Démarrage rapide

### 1. Prérequis
```bash
# Démarrer la base de données
docker-compose up -d postgres

# Appliquer les migrations
npm run db:push

# Démarrer le serveur de développement  
npm run dev
```

### 2. Créer les utilisateurs de test
```bash
# Créer tous les comptes de test nécessaires
npm run setup-test-users

# Ou nettoyer et recréer
npm run setup-test-users:clean
```

### 3. Tests disponibles

#### Test rapide de connectivité
```bash
npm run test:quick
```

#### Test complet des endpoints
```bash
npm run test:api:verbose
```

#### Test du workflow complet
```bash
npm run test:workflow
```

## 🔧 Résolution des problèmes

### Erreur d'authentification (Status 500)

1. **Diagnostic des problèmes d'auth** :
```bash
node debug-auth.js
```

2. **Vérifier la base de données** :
```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps

# Appliquer les migrations si nécessaire
npm run db:push
```

3. **Recréer les utilisateurs de test** :
```bash
npm run setup-test-users:clean
```

4. **Vérifier les variables d'environnement** :
```bash
# Dans .env.local
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
```

### Timeouts ou erreurs 403/401

1. **Vérifier le serveur** :
```bash
# S'assurer que le serveur est démarré sur le port 3000
npm run dev
```

2. **Vérifier les tokens** :
```bash
# Utiliser le diagnostic d'authentification
node debug-auth.js
```

## 📋 Comptes de test disponibles

Après avoir exécuté `npm run setup-test-users`, ces comptes sont disponibles :

| Rôle | Email | Mot de passe | Description |
|------|-------|--------------|-------------|
| CLIENT | client-complete@test.com | Test123! | Client avec abonnement Premium |
| DELIVERER | deliverer-complete@test.com | Test123! | Livreur avec documents validés |
| ADMIN | admin-complete@test.com | Test123! | Administrateur avec tous droits |
| MERCHANT | merchant-complete@test.com | Test123! | Commerçant avec contrat signé |
| PROVIDER | provider-complete@test.com | Test123! | Prestataire actif |

## 🔍 Ce qui est testé

### Fonctionnalités principales
- ✅ Authentification Better-Auth
- ✅ Création d'annonces avec géocodage
- ✅ Paiement Stripe avec escrow
- ✅ Workflow complet de livraison
- ✅ Système de validation 6-chiffres
- ✅ Génération automatique de factures PDF
- ✅ Tracking en temps réel avec Leaflet
- ✅ Fonctionnalité d'annulation

### Endpoints API testés
```
POST /api/auth/login
POST /api/client/announcements
POST /api/client/announcements/[id]/payment
PUT  /api/client/announcements/[id]/payment
GET  /api/client/announcements/[id]/tracking
GET  /api/client/announcements/[id]/validation-code
POST /api/client/announcements/[id]/validate
POST /api/client/announcements/[id]/cancel
GET  /api/client/announcements/[id]/invoice
```

## 📊 Interprétation des résultats

### Succès attendu
```
✅ Passed: 13
❌ Failed: 0
🎉 All tests passed! EcoDeli API is working correctly.
```

### Erreurs communes

**Status 500 - Erreur serveur**
- Problème de configuration Better-Auth
- Base de données non accessible
- Migration manquante

**Status 401/403 - Non autorisé**
- Utilisateurs de test manquants
- Token d'authentification invalide
- Problème de session

**Timeout**
- Serveur non démarré
- Base de données lente à répondre
- Problème réseau

## 🛠️ Scripts utiles

```bash
# Configuration initiale complète
npm run db:push && npm run setup-test-users && npm run test:quick

# Test complet après changements
npm run test:api:verbose

# Debug en cas de problème
node debug-auth.js

# Nettoyer et recommencer
npm run setup-test-users:clean && npm run test:quick

# Voir les données en base
npm run db:studio
```

## 📱 Test manuel via interface

Après avoir créé les utilisateurs de test :

1. Allez sur http://localhost:3000
2. Connectez-vous avec `client-complete@test.com` / `Test123!`
3. Créez une annonce
4. Testez le paiement (mode test Stripe)
5. Suivez le workflow jusqu'à la validation

## 🔗 APIs externes utilisées

- **Nominatim** : Géocodage d'adresses (OpenStreetMap)
- **OSRM** : Calcul de routes optimisées
- **Stripe** : Paiements avec escrow (mode test)
- **Better-Auth** : Authentification et sessions

## 📞 Support

Si les tests échouent encore après avoir suivi ce guide :

1. Vérifiez que toutes les dépendances sont installées : `npm install`
2. Vérifiez que PostgreSQL est accessible et les tables créées
3. Consultez les logs du serveur Next.js pour plus de détails
4. Utilisez le script de diagnostic : `node debug-auth.js`

L'implémentation est complète et testée - les erreurs sont généralement liées à la configuration de l'environnement de développement.