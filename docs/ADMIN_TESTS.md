# EcoDeli - Section Tests du Backoffice

## Vue d'ensemble

La section **Tests** du backoffice permet aux administrateurs de tester et diagnostiquer les services critiques de la plateforme EcoDeli :
- **Emails** : Test des templates et de l'envoi d'emails
- **Notifications** : Test des notifications push OneSignal
- **APIs** : Test des endpoints de l'application

## Accès

**URL** : `http://localhost:3000/fr/admin/tests`

**Permissions** : Administrateurs uniquement

## Structure des Composants

### 1. TestsDashboard (Composant Principal)

**Fichier** : `src/features/admin/components/tests/tests-dashboard.tsx`

**Fonctionnalités** :
- Affichage du status général des services
- Navigation par onglets entre les différents types de tests
- Interface unifiée pour tous les tests

**Composants enfants** :
- `EmailTests` : Tests d'emails
- `NotificationTests` : Tests de notifications
- `ApiTests` : Tests d'APIs

### 2. EmailTests

**Fichier** : `src/features/admin/components/tests/email-tests.tsx`

**Fonctionnalités** :
- Sélection du type d'email à tester
- Configuration de l'adresse de destination
- Templates prédéfinis (bienvenue, vérification, etc.)
- Email personnalisé avec sujet et contenu
- Historique des résultats de tests

**Types d'emails supportés** :
- `welcome` : Email de bienvenue
- `verification` : Vérification de compte
- `password-reset` : Réinitialisation mot de passe
- `delivery-confirmation` : Confirmation de livraison
- `payment-success` : Confirmation de paiement
- `document-approved` : Validation de document
- `custom` : Email personnalisé

### 3. NotificationTests

**Fichier** : `src/features/admin/components/tests/notification-tests.tsx`

**Fonctionnalités** :
- Configuration du titre et message
- Ciblage des notifications (tous, par rôle, utilisateur spécifique, segment)
- Support des images dans les notifications
- Historique des résultats

**Types de ciblage** :
- `all` : Tous les utilisateurs
- `role` : Utilisateurs d'un rôle spécifique
- `user` : Utilisateur spécifique par email
- `segment` : Segment OneSignal personnalisé

### 4. ApiTests

**Fichier** : `src/features/admin/components/tests/api-tests.tsx`

**Fonctionnalités** :
- Tests d'endpoints prédéfinis
- Tests d'endpoints personnalisés
- Mesure des temps de réponse
- Affichage des codes de statut HTTP
- Visualisation des réponses JSON

**Endpoints prédéfinis** :
- `/api/health` : Health check
- `/api/auth/me` : Informations utilisateur
- `/api/admin/users` : Gestion utilisateurs
- `/api/admin/announcements` : Gestion annonces
- `/api/admin/deliveries` : Gestion livraisons
- `/api/admin/payments` : Gestion paiements
- `/api/admin/settings` : Paramètres système
- `/api/admin/dashboard` : Dashboard admin
- `/api/admin/verifications` : Vérifications admin

## Services Backend

### TestsService

**Fichier** : `src/features/admin/services/tests.service.ts`

**Méthodes principales** :

#### `sendTestEmail(data: EmailTestRequest)`
Envoie un email de test avec validation et logging.

**Paramètres** :
```typescript
interface EmailTestRequest {
  email: string
  type: string
  subject?: string
  message?: string
}
```

#### `sendTestNotification(data: NotificationTestRequest)`
Envoie une notification de test via OneSignal.

**Paramètres** :
```typescript
interface NotificationTestRequest {
  title: string
  message: string
  targetType: string
  targetValue?: string
  includeImage?: boolean
  imageUrl?: string
}
```

#### `getTestLogs(limit: number)`
Récupère les logs de tests récents.

#### `checkServicesStatus()`
Vérifie l'état des services critiques.

## Routes API

### 1. Tests Emails

**Endpoint** : `POST /api/admin/tests/email`

**Corps de la requête** :
```json
{
  "email": "test@example.com",
  "type": "welcome",
  "subject": "Sujet personnalisé",
  "message": "Message personnalisé"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Email de test envoyé avec succès à test@example.com",
  "data": {
    "type": "welcome",
    "subject": "Bienvenue sur EcoDeli"
  }
}
```

**Endpoint** : `GET /api/admin/tests/email`

**Réponse** :
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "count": 5
  }
}
```

### 2. Tests Notifications

**Endpoint** : `POST /api/admin/tests/notification`

**Corps de la requête** :
```json
{
  "title": "Test Notification",
  "message": "Ceci est un test",
  "targetType": "all",
  "includeImage": false,
  "imageUrl": "https://example.com/image.jpg"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Notification de test envoyée avec succès",
  "data": {
    "notificationId": "notification-id",
    "targetType": "all"
  }
}
```

**Endpoint** : `GET /api/admin/tests/notification`

**Réponse** :
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "count": 3
  }
}
```

## Base de Données

### Table SystemLog

**Schéma** :
```sql
CREATE TABLE "SystemLog" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);
```

**Catégories de logs** :
- `TEST_EMAIL` : Logs des tests d'emails
- `TEST_NOTIFICATION` : Logs des tests de notifications
- `TEST_API` : Logs des tests d'APIs

**Niveaux de logs** :
- `INFO` : Informations générales
- `WARNING` : Avertissements
- `ERROR` : Erreurs
- `DEBUG` : Informations de débogage

## Scripts d'Initialisation

### Script d'Initialisation

**Fichier** : `scripts/init-test-services.js`

**Fonctionnalités** :
- Vérification de la connexion à la base de données
- Création d'utilisateurs de test
- Création de logs de test
- Vérification des variables d'environnement

**Exécution** :
```bash
node scripts/init-test-services.js
```

## Variables d'Environnement Requises

### Emails
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### Notifications OneSignal
```env
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

### Base de Données
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecodeli
```

### Authentification
```env
NEXTAUTH_SECRET=your-secret-key
```

## Utilisation

### 1. Test d'Email

1. Accédez à l'onglet "Tests Emails"
2. Saisissez une adresse email de destination
3. Sélectionnez le type d'email à tester
4. Cliquez sur "Envoyer Email de Test"
5. Vérifiez les résultats dans l'historique

### 2. Test de Notification

1. Accédez à l'onglet "Tests Notifications"
2. Configurez le titre et le message
3. Sélectionnez le type de ciblage
4. Optionnel : ajoutez une image
5. Cliquez sur "Envoyer Notification de Test"
6. Vérifiez les résultats dans l'historique

### 3. Test d'API

1. Accédez à l'onglet "Tests APIs"
2. Sélectionnez un endpoint prédéfini ou saisissez une URL personnalisée
3. Cliquez sur "Tester cet Endpoint"
4. Vérifiez les résultats (statut, temps de réponse, réponse)

## Sécurité

### Authentification
- Toutes les routes de test nécessitent une authentification admin
- Vérification des permissions par rôle
- Logs de toutes les actions de test

### Validation
- Validation des données d'entrée avec Zod
- Sanitisation des URLs et contenus
- Protection contre les injections

### Limitation
- Limitation du nombre de tests par minute
- Quotas pour les emails et notifications
- Monitoring des abus

## Monitoring et Logs

### Logs Automatiques
- Tous les tests sont loggés dans la base de données
- Métadonnées détaillées pour chaque test
- Historique conservé pour audit

### Métriques
- Taux de succès des tests
- Temps de réponse des APIs
- Statut des services externes

### Alertes
- Alertes en cas d'échec répété
- Notification des administrateurs
- Monitoring en temps réel

## Dépannage

### Problèmes Courants

#### Emails non reçus
1. Vérifiez la configuration SMTP
2. Vérifiez le dossier spam
3. Testez avec une adresse email différente

#### Notifications non reçues
1. Vérifiez la configuration OneSignal
2. Vérifiez que l'utilisateur a autorisé les notifications
3. Testez avec un utilisateur différent

#### Erreurs d'API
1. Vérifiez la connexion à la base de données
2. Vérifiez les logs du serveur
3. Testez l'endpoint directement

### Logs de Débogage

**Activation** :
```env
DEBUG=true
LOG_LEVEL=debug
```

**Consultation** :
```bash
# Logs de l'application
tail -f logs/app.log

# Logs de la base de données
tail -f logs/db.log

# Logs des tests
tail -f logs/tests.log
```

## Évolutions Futures

### Fonctionnalités Prévues
- Tests de performance automatisés
- Tests de charge
- Tests de sécurité
- Intégration avec des outils de monitoring externes
- Rapports de tests automatisés
- Tests de régression

### Améliorations Techniques
- Interface plus intuitive
- Tests en parallèle
- Résultats en temps réel
- Export des résultats
- Intégration CI/CD

## Support

Pour toute question ou problème :
1. Consultez les logs de l'application
2. Vérifiez la documentation technique
3. Contactez l'équipe de développement
4. Ouvrez un ticket de support

---

**Dernière mise à jour** : Janvier 2025
**Version** : 1.0.0 