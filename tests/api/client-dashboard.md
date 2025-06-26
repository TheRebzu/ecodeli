# Tests API Dashboard Client EcoDeli

## Prérequis
- Serveur EcoDeli en cours d'exécution (`pnpm run dev`)
- Utilisateur CLIENT authentifié dans la base de données
- Session cookie valide

## Tests d'Authentification

### 1. Login Client
```bash
# Se connecter avec un compte client
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client-complete@test.com",
    "password": "Test123!"
  }' \
  -c cookies.txt
```

**Réponse attendue :**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "client-complete@test.com",
    "role": "CLIENT"
  }
}
```

### 2. Vérifier la session
```bash
curl -X GET http://localhost:3000/api/auth/get-session \
  -b cookies.txt
```

## Tests Dashboard Principal

### 3. Récupérer le dashboard client
```bash
curl -X GET http://localhost:3000/api/client/dashboard \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Réponse attendue :**
```json
{
  "client": {
    "id": "uuid",
    "subscriptionPlan": "FREE|STARTER|PREMIUM",
    "subscriptionExpiry": "2024-12-31T23:59:59.000Z",
    "tutorialCompleted": false,
    "emailVerified": true,
    "profileComplete": true,
    "user": {
      "id": "uuid",
      "name": "Client Test",
      "email": "client-complete@test.com",
      "phone": "+33123456789",
      "avatar": "https://..."
    }
  },
  "stats": {
    "totalAnnouncements": 5,
    "activeDeliveries": 2,
    "completedDeliveries": 8,
    "totalSpent": 156.75,
    "currentSubscription": "STARTER",
    "storageBoxesActive": 1,
    "bookingsThisMonth": 3,
    "averageRating": 4.2,
    "walletBalance": 25.50,
    "subscriptionSavings": 7.84
  },
  "recentAnnouncements": [
    {
      "id": "uuid",
      "title": "Livraison documents",
      "type": "DELIVERY",
      "status": "IN_PROGRESS",
      "price": 15.50,
      "pickupAddress": "123 Rue de la Paix, Paris",
      "deliveryAddress": "456 Avenue Mozart, Lyon",
      "scheduledDate": "2024-06-27T14:00:00.000Z",
      "createdAt": "2024-06-26T10:30:00.000Z",
      "deliverer": {
        "id": "uuid",
        "name": "Jean Dupont",
        "rating": 4.8,
        "phone": "+33987654321"
      },
      "trackingCode": "ECO123456",
      "estimatedDelivery": "2024-06-27T16:30:00.000Z"
    }
  ],
  "recentBookings": [
    {
      "id": "uuid",
      "serviceType": "Ménage à domicile",
      "provider": {
        "id": "uuid",
        "name": "Marie Martin",
        "rating": 4.9,
        "avatar": "https://..."
      },
      "scheduledDate": "2024-06-28T09:00:00.000Z",
      "duration": 120,
      "totalPrice": 45.00,
      "status": "CONFIRMED",
      "rating": null,
      "canRate": false,
      "address": "123 Rue de la Paix, Paris",
      "notes": "Appartement 3ème étage"
    }
  ],
  "activeStorageBoxes": [
    {
      "id": "uuid",
      "boxNumber": "B-127",
      "size": "MEDIUM",
      "warehouse": {
        "name": "EcoDeli Paris Sud",
        "address": "789 Boulevard Périphérique",
        "city": "Paris",
        "accessHours": "6h-22h"
      },
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.000Z",
      "monthlyPrice": 25.00,
      "accessCode": "1234",
      "itemsCount": 5,
      "lastAccess": "2024-06-25T14:20:00.000Z",
      "expiresInDays": 4
    }
  ],
  "notifications": [
    {
      "id": "uuid",
      "type": "DELIVERY_UPDATE",
      "title": "Colis en transit",
      "message": "Votre colis sera livré dans 2 heures",
      "read": false,
      "actionUrl": "/client/deliveries/tracking/uuid",
      "createdAt": "2024-06-26T12:00:00.000Z",
      "priority": "high",
      "category": "delivery"
    }
  ],
  "tutorial": {
    "completed": false,
    "currentStep": 3,
    "stepsCompleted": {
      "welcome": true,
      "profile": true,
      "subscription": true,
      "firstAnnouncement": false,
      "completion": false
    },
    "completedAt": null,
    "timeSpent": 0,
    "skippedSteps": [],
    "isBlocking": true
  },
  "quickActions": [
    {
      "id": "create-announcement",
      "title": "Nouvelle annonce",
      "description": "Publier une demande de livraison",
      "href": "/client/announcements/create",
      "icon": "📦",
      "available": false,
      "requiresSubscription": null,
      "color": "bg-blue-500"
    },
    {
      "id": "book-service",
      "title": "Réserver un service",
      "description": "Trouver un prestataire qualifié",
      "href": "/client/services",
      "icon": "🔧",
      "available": true,
      "color": "bg-green-500"
    }
  ]
}
```

### 4. Rafraîchir le dashboard
```bash
curl -X POST http://localhost:3000/api/client/dashboard/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Réponse attendue :** Même structure que GET + `refreshedAt`

### 5. Marquer le tutoriel comme terminé
```bash
curl -X PUT http://localhost:3000/api/client/dashboard/tutorial \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "completed": true,
    "timeSpent": 300,
    "feedback": "Tutoriel très utile"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Tutoriel marqué comme terminé"
}
```

## Tests d'Erreurs

### 6. Accès sans authentification
```bash
curl -X GET http://localhost:3000/api/client/dashboard \
  -H "Content-Type: application/json"
```

**Réponse attendue :**
```json
{
  "error": "Accès refusé - Rôle CLIENT requis"
}
```
**Status Code :** 403

### 7. Accès avec mauvais rôle (utiliser un token DELIVERER)
```bash
# D'abord se connecter comme livreur
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deliverer@test.com",
    "password": "Test123!"
  }' \
  -c cookies-deliverer.txt

# Puis essayer d'accéder au dashboard client
curl -X GET http://localhost:3000/api/client/dashboard \
  -H "Content-Type: application/json" \
  -b cookies-deliverer.txt
```

**Réponse attendue :**
```json
{
  "error": "Accès refusé - Rôle CLIENT requis"
}
```
**Status Code :** 403

### 8. Données invalides pour tutoriel
```bash
curl -X PUT http://localhost:3000/api/client/dashboard/tutorial \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "completed": "invalid"
  }'
```

**Réponse attendue :**
```json
{
  "error": "Paramètre completed requis"
}
```
**Status Code :** 400

## Tests de Performance

### 9. Temps de réponse
```bash
# Mesurer le temps de réponse
time curl -X GET http://localhost:3000/api/client/dashboard \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -w "Time: %{time_total}s\n" \
  -o /dev/null \
  -s
```

**Attendu :** < 2 secondes

### 10. Test de charge (optionnel)
```bash
# Test avec Apache Bench (si installé)
ab -n 100 -c 10 -C "ecodeli-session=TOKEN" http://localhost:3000/api/client/dashboard
```

## Validation des Données

### Points de vérification :
1. ✅ Aucune donnée mock/hardcodée
2. ✅ Toutes les données viennent de PostgreSQL
3. ✅ Validation Zod appliquée
4. ✅ Gestion d'erreurs complète
5. ✅ Authentification et autorisation
6. ✅ Types TypeScript cohérents
7. ✅ Logs appropriés
8. ✅ Conforme aux exigences Mission 1

### Données réelles vérifiées :
- ✅ Statistiques calculées dynamiquement
- ✅ Annonces récentes depuis DB
- ✅ Réservations depuis DB
- ✅ Box de stockage depuis DB
- ✅ Notifications depuis DB
- ✅ Statut tutoriel depuis DB
- ✅ Actions rapides selon abonnement

## Résultats Attendus

**GET /api/client/dashboard :**
- ✅ Status 200 avec données complètes
- ✅ Temps de réponse < 2s
- ✅ Données cohérentes et à jour
- ✅ Validation Zod passée
- ✅ Logs appropriés

**POST /api/client/dashboard/refresh :**
- ✅ Status 200 avec données rafraîchies
- ✅ Timestamp de rafraîchissement

**PUT /api/client/dashboard/tutorial :**
- ✅ Status 200 avec confirmation
- ✅ Mise à jour DB effective
- ✅ Logs d'analytics

**Erreurs :**
- ✅ Status codes appropriés (401, 403, 400, 500)
- ✅ Messages d'erreur clairs
- ✅ Pas d'exposition de données sensibles