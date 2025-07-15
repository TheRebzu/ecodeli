# EcoDeli Mobile App

Application mobile Android pour EcoDeli - Plateforme de livraison éco-responsable

## 🚀 Fonctionnalités

### Authentification
- Connexion/Inscription multi-rôles (Client, Livreur, Commerçant, Prestataire)
- Gestion des sessions sécurisées
- Validation des comptes

### Clients
- Création et gestion d'annonces de livraison
- Suivi en temps réel des livraisons
- Validation des livraisons via NFC ou code
- Gestion des paiements (Stripe)
- Notifications push

### Livreurs
- Visualisation des opportunités de livraison
- Acceptation d'annonces
- Gestion des livraisons actives
- Génération de codes de validation
- Carte NFC pour identification

### Fonctionnalités NFC
- Reconnaissance des cartes NFC livreurs
- Validation sécurisée des livraisons
- Lecture/écriture des données livreur

### Notifications
- Notifications push via OneSignal
- Notifications personnalisées selon le type
- Gestion des préférences de notification

## 🛠 Stack Technique

### Core
- **Kotlin** - Langage principal
- **Jetpack Compose** - Interface utilisateur moderne
- **Architecture MVVM** - Séparation des responsabilités
- **Hilt** - Injection de dépendances
- **Coroutines** - Programmation asynchrone

### Networking
- **Retrofit** - Client HTTP
- **OkHttp** - Gestion des requêtes
- **Gson** - Sérialisation JSON

### Storage
- **DataStore** - Stockage des préférences
- **Room** - Base de données locale

### Services
- **OneSignal** - Notifications push
- **Stripe** - Paiements
- **Google Maps** - Cartes et localisation

### NFC
- **Android NFC API** - Gestion NFC native
- **NDEF** - Format de données NFC

## 📱 Architecture

```
app/
├── core/
│   ├── data/
│   │   ├── local/          # DataStore, Room
│   │   ├── remote/         # API, Interceptors
│   │   ├── models/         # Modèles de données
│   │   └── repository/     # Repositories
│   ├── di/                 # Injection de dépendances
│   ├── navigation/         # Navigation Compose
│   ├── theme/              # Thème et couleurs
│   └── utils/              # Utilitaires
├── features/
│   ├── auth/               # Authentification
│   ├── client/             # Fonctionnalités client
│   ├── deliverer/          # Fonctionnalités livreur
│   ├── delivery/           # Suivi livraisons
│   ├── nfc/                # Gestion NFC
│   └── splash/             # Écran de démarrage
└── services/               # Services système
```

## 🔧 Configuration

### Prérequis
- Android Studio Arctic Fox+
- SDK Android 24+
- Kotlin 1.9.20+
- Gradle 8.0+

### Variables d'environnement
Créer un fichier `local.properties` avec :
```properties
MAPS_API_KEY=your_google_maps_api_key
STRIPE_PUBLIC_KEY=your_stripe_public_key
ONESIGNAL_APP_ID=your_onesignal_app_id
API_BASE_URL=http://your-api-url.com
```

### Installation
1. Cloner le repository
2. Ouvrir dans Android Studio
3. Sync Gradle
4. Configurer les clés API
5. Build et run

## 🎯 Utilisation

### Client
1. S'inscrire/Se connecter
2. Créer une annonce de livraison
3. Attendre l'acceptation d'un livreur
4. Suivre la livraison en temps réel
5. Valider la réception avec NFC ou code

### Livreur
1. S'inscrire/Se connecter
2. Parcourir les opportunités
3. Accepter une annonce
4. Effectuer la livraison
5. Générer un code de validation
6. Utiliser la carte NFC pour validation

## 📡 API Integration

L'application s'intègre avec l'API REST EcoDeli existante :
- Authentification via JWT
- Endpoints pour annonces, livraisons, paiements
- WebSocket pour le suivi temps réel
- Notifications push

## 🔐 Sécurité

- Chiffrement des données sensibles
- Validation côté client et serveur
- Gestion sécurisée des tokens
- Protection NFC contre les attaques

## 📱 Permissions

- **NFC** : Lecture/écriture cartes NFC
- **LOCATION** : Géolocalisation livraisons
- **CAMERA** : Scan codes QR/photos
- **NOTIFICATIONS** : Notifications push
- **INTERNET** : Communication API

## 🧪 Tests

```bash
# Tests unitaires
./gradlew test

# Tests UI
./gradlew connectedAndroidTest

# Tests NFC (nécessite device physique)
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.ecodeli.mobile.nfc.NfcTests
```

## 📚 Documentation

- [Architecture MVVM](docs/architecture.md)
- [Intégration NFC](docs/nfc.md)
- [Guide notifications](docs/notifications.md)
- [API Documentation](docs/api.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔄 Roadmap

- [ ] Mode hors ligne
- [ ] Chat en temps réel
- [ ] Réalité augmentée pour navigation
- [ ] Intégration IoT boîtes stockage
- [ ] Mode sombre complet
- [ ] Accessibilité avancée

## 🐛 Bugs connus

- Problème NFC sur certains Samsung Galaxy
- Délai notifications sur Android 12+
- Crash rare lors du changement d'orientation

## 💡 Contributions

Développé dans le cadre du projet annuel ESGI 2024-2025 pour EcoDeli.

### Équipe
- Développement mobile Android
- Architecture MVVM
- Intégration NFC
- Interface utilisateur Compose