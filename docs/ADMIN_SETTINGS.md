# Page d'Administration des Paramètres - EcoDeli

## Vue d'ensemble

La page d'administration des paramètres (`/fr/admin/settings`) permet aux administrateurs de configurer tous les aspects de la plateforme EcoDeli. Cette interface centralisée offre un contrôle complet sur le comportement de l'application.

## Accès

- **URL** : `http://localhost:3000/fr/admin/settings`
- **Rôle requis** : `ADMIN`
- **Authentification** : Obligatoire

## Structure de la Page

### 1. Header avec Actions
- **Titre** : Configuration Système
- **Badge de modifications** : Indique s'il y a des changements non sauvegardés
- **Boutons** :
  - **Réinitialiser** : Annule les modifications en cours
  - **Sauvegarder** : Enregistre les modifications (actif uniquement s'il y a des changements)

### 2. Status du Système
Cartes d'état en temps réel :
- **Système** : Opérationnel/En maintenance
- **Base de données** : Connectée/Déconnectée
- **Paiements** : Stripe actif/Inactif
- **Notifications** : OneSignal OK/Erreur

### 3. Onglets de Configuration

#### 3.1 Onglet Général
**Paramètres de base de l'application :**

- **Informations de Base**
  - Nom de l'application
  - Nom de l'entreprise
  - Description
  - Email, téléphone, adresse de contact

- **Configuration Géographique**
  - Pays par défaut (France, Belgique, Suisse)
  - Devise par défaut (EUR, USD, CHF)
  - Fuseau horaire (Europe/Paris, etc.)

- **Limites et Quotas**
  - Annonces max par utilisateur
  - Livraisons max par jour
  - Taille max des fichiers
  - Utilisateurs max par entrepôt

- **Fonctionnalités**
  - Tutoriel obligatoire (première connexion)
  - Notifications push
  - Programme de parrainage
  - Assurances livraison
  - Mode maintenance

#### 3.2 Onglet Sécurité
**Configuration de la sécurité :**

- **Authentification**
  - Timeout de session (heures)
  - Tentatives de connexion max
  - Durée de verrouillage
  - Vérification email/téléphone
  - Authentification à deux facteurs

- **Politique des Mots de Passe**
  - Longueur minimale
  - Expiration (jours)
  - Exigences : majuscules, minuscules, chiffres, caractères spéciaux

- **Sécurité Réseau**
  - Limitation de débit (rate limiting)
  - CORS (Cross-Origin Resource Sharing)
  - Liste blanche IP
  - Rétention des logs

- **Protection contre les Attaques**
  - Protection CSRF
  - Protection XSS
  - Protection injection SQL
  - Protection force brute

#### 3.3 Onglet Paiements
**Configuration des paiements :**

- **Configuration Stripe**
  - Activation/désactivation
  - Clés API (publique, secrète, webhook)
  - Devise

- **Plans d'Abonnement**
  - Prix des plans Free, Starter, Premium

- **Commissions**
  - Commission livraison (%)
  - Commission services (%)
  - Commission lâcher de chariot (%)

- **Frais et Taxes**
  - Frais de plateforme (%)
  - Taux de TVA (%)
  - Limites de retrait (min/max)

- **Configuration des Paiements**
  - Paiements automatiques
  - Remboursements (complets/partiels)
  - Fenêtre de remboursement

- **Sécurité des Paiements**
  - 3D Secure
  - CVV obligatoire
  - Détection de fraude

#### 3.4 Onglet Notifications
**Configuration des notifications :**

- **Configuration OneSignal**
  - Activation/désactivation
  - App ID, API Key, REST API Key

- **Types de Notifications**
  - Opportunités de livraison
  - Mises à jour de livraison
  - Paiements reçus
  - Validation de documents
  - Confirmation de réservation
  - Maintenance système

- **Configuration Email**
  - Fournisseur (Resend, SendGrid, etc.)
  - Adresse d'expédition
  - Nom d'expédition
  - Adresse de réponse

- **Configuration SMS**
  - Activation/désactivation
  - Fournisseur (Twilio, etc.)
  - Numéro d'expédition

- **Templates de Notifications**
  - Messages personnalisables
  - Support des variables ({{firstName}}, {{amount}}, etc.)

- **Paramètres Généraux**
  - Heures silencieuses
  - Notifications max par jour
  - Notifications enrichies

- **Localisation**
  - Langue par défaut
  - Langues supportées

#### 3.5 Onglet Système
**Configuration système avancée :**

- **Configuration Base de Données**
  - Connexions max
  - Timeout de connexion/requête
  - Logs de base de données
  - Cache des requêtes

- **Configuration Cache**
  - Activation/désactivation
  - Fournisseur (Redis, Mémoire, Fichier)
  - TTL (Time To Live)
  - Bouton "Vider le cache"

- **Configuration Serveur**
  - Port
  - CORS
  - Compression

- **Mode Maintenance**
  - Activation/désactivation
  - Message personnalisable
  - IPs autorisées
  - Maintenance programmée

- **Configuration Logs**
  - Niveau de log (Error, Warning, Info, Debug)
  - Logs d'audit

- **Sauvegarde**
  - Activation/désactivation
  - Fréquence (horaire, quotidienne, etc.)
  - Rétention (jours)
  - Bouton "Sauvegarde manuelle"

## API Endpoints

### GET /api/admin/settings
Récupérer les paramètres :
- `GET /api/admin/settings` - Tous les paramètres
- `GET /api/admin/settings?category=app` - Par catégorie
- `GET /api/admin/settings?key=app.name` - Paramètre spécifique

### POST /api/admin/settings
Créer un paramètre :
```json
{
  "key": "app.name",
  "value": "EcoDeli",
  "description": "Nom de l'application"
}
```

### Actions spéciales POST :
- `POST /api/admin/settings?action=initialize` - Initialiser les paramètres par défaut
- `POST /api/admin/settings?action=batch` - Mise à jour en lot
- `POST /api/admin/settings?action=export` - Exporter les paramètres
- `POST /api/admin/settings?action=import` - Importer les paramètres

### PUT /api/admin/settings?key=app.name
Mettre à jour un paramètre :
```json
{
  "value": "Nouveau nom",
  "description": "Nouvelle description"
}
```

### DELETE /api/admin/settings?key=app.name
Supprimer (désactiver) un paramètre

## Service Backend

### SettingsService
Classe utilitaire pour gérer les paramètres :

```typescript
// Récupérer tous les paramètres
const settings = await SettingsService.getAllSettings()

// Récupérer par clé
const setting = await SettingsService.getSettingByKey('app.name')

// Créer un paramètre
const newSetting = await SettingsService.createSetting({
  key: 'app.name',
  value: 'EcoDeli',
  description: 'Nom de l\'application'
})

// Mettre à jour
const updatedSetting = await SettingsService.updateSetting('app.name', {
  value: 'Nouveau nom'
})

// Supprimer
await SettingsService.deleteSetting('app.name')

// Mise à jour en lot
await SettingsService.batchUpdateSettings([
  { key: 'app.name', value: 'Nouveau nom' },
  { key: 'app.email', value: 'nouveau@email.com' }
])
```

## Base de Données

### Table Settings
```sql
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL UNIQUE,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
```

### Index
- `key` - Recherche rapide par clé
- `isActive` - Filtrage des paramètres actifs

## Scripts Utilitaires

### Initialisation des Paramètres
```bash
node scripts/init-settings.js
```

Ce script :
- Crée les paramètres par défaut s'ils n'existent pas
- Met à jour les valeurs si elles ont changé
- Affiche un rapport des opérations effectuées

## Bonnes Pratiques

### 1. Nommage des Clés
Utiliser une structure hiérarchique :
- `app.name` - Paramètres de l'application
- `security.sessionTimeout` - Paramètres de sécurité
- `payments.stripe.enabled` - Paramètres de paiement
- `notifications.email.enabled` - Paramètres de notifications
- `system.maintenance.enabled` - Paramètres système

### 2. Types de Valeurs
- **String** : Textes, emails, URLs
- **Number** : Limites, timeouts, pourcentages
- **Boolean** : Activation/désactivation
- **Object** : Configurations complexes
- **Array** : Listes de valeurs

### 3. Sécurité
- Toutes les clés sensibles (API keys) sont masquées dans l'interface
- Validation des données avec Zod
- Authentification obligatoire pour toutes les opérations
- Logs d'audit pour toutes les modifications

### 4. Performance
- Cache des paramètres fréquemment utilisés
- Mise à jour en lot pour les modifications multiples
- Index sur les clés pour les recherches rapides

## Dépannage

### Problèmes Courants

1. **Page ne se charge pas**
   - Vérifier l'authentification admin
   - Vérifier les permissions utilisateur

2. **Modifications non sauvegardées**
   - Vérifier la connexion à la base de données
   - Vérifier les logs d'erreur

3. **Paramètres non trouvés**
   - Exécuter le script d'initialisation
   - Vérifier la structure de la base de données

4. **Erreurs de validation**
   - Vérifier le format des données
   - Consulter les messages d'erreur détaillés

### Logs Utiles
```bash
# Logs de l'application
tail -f logs/app.log

# Logs de la base de données
tail -f logs/db.log

# Logs d'audit
tail -f logs/audit.log
```

## Évolutions Futures

### Fonctionnalités Prévues
- **Import/Export** : Interface graphique pour importer/exporter des configurations
- **Historique** : Suivi des modifications avec possibilité de rollback
- **Environnements** : Gestion de configurations par environnement (dev, staging, prod)
- **Templates** : Modèles de configuration prédéfinis
- **API publique** : Endpoints pour récupérer les paramètres publics
- **Notifications** : Alertes lors de modifications critiques
- **Backup automatique** : Sauvegarde automatique avant modifications

### Intégrations
- **Monitoring** : Intégration avec les outils de monitoring
- **CI/CD** : Déploiement automatique des configurations
- **Audit** : Intégration avec les systèmes d'audit externes
- **Compliance** : Vérification automatique de conformité RGPD 