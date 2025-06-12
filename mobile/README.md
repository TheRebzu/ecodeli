# EcoDeli Android App

Application mobile Android native pour la plateforme de crowdshipping EcoDeli.

## 📱 Fonctionnalités

### ✅ Implémentées
- **Authentification** : Connexion, inscription, 2FA
- **Dashboard** : Vue d'ensemble des activités
- **Livraisons** : Liste, détails, validation par code/NFC
- **Navigation** : Bottom navigation avec 5 onglets
- **Thème** : Material Design 3 avec couleurs EcoDeli
- **API** : Intégration complète avec l'API tRPC

### 🚧 En développement
- **Services** : Réservation de prestations
- **Portefeuille** : Gestion des paiements Stripe
- **Profil** : Modification des informations utilisateur
- **Notifications** : OneSignal pour les notifications push

## 🏗️ Architecture

L'application suit l'architecture MVVM (Model-View-ViewModel) avec :

- **Jetpack Compose** pour l'interface utilisateur
- **Hilt** pour l'injection de dépendance
- **Retrofit + tRPC** pour les appels API
- **DataStore** pour les préférences utilisateur
- **Coroutines + Flow** pour la programmation asynchrone

```
app/
├── data/              # Couche de données
│   ├── api/           # Clients API et intercepteurs
│   ├── models/        # Modèles de données
│   └── repositories/  # Repositories
├── domain/            # Logique métier
│   ├── entities/      # Entités métier
│   └── usecases/      # Cas d'usage
├── presentation/      # Interface utilisateur
│   ├── ui/            # Écrans Compose
│   ├── viewmodels/    # ViewModels
│   └── navigation/    # Navigation
└── utils/             # Utilitaires (NFC, notifications)
```

## 🚀 Installation et Build

### Prérequis
- Android Studio Arctic Fox ou plus récent
- JDK 17
- Android SDK 34
- Kotlin 1.9.22

### Configuration
1. Cloner le repository
2. Ouvrir le projet dans Android Studio
3. Configurer les variables d'environnement :
   ```bash
   # .env ou dans build.gradle.kts
   API_BASE_URL=https://api.ecodeli.me
   ONESIGNAL_APP_ID=your_onesignal_app_id
   ```

### Build avec les scripts
```bash
# Build debug
./scripts/build.sh debug

# Build release
./scripts/build.sh release

# Tests
./scripts/test.sh all

# Déploiement staging
./scripts/deploy.sh staging

# Déploiement production
./scripts/deploy.sh production
```

### Build manuel
```bash
# Debug
./gradlew assembleDebug

# Release
./gradlew assembleRelease

# Tests
./gradlew testDebugUnitTest
./gradlew connectedDebugAndroidTest
```

## 🔧 Configuration

### API Backend
L'application se connecte à l'API tRPC EcoDeli. Configurez l'URL dans :
- `build.gradle.kts` : `buildConfigField("String", "API_BASE_URL", "...")`
- Pour le développement local : `http://10.0.2.2:3000`

### OneSignal (Notifications)
1. Créer un projet sur [OneSignal](https://onesignal.com)
2. Ajouter l'App ID dans `build.gradle.kts`
3. Configurer les certificats FCM

### Google Maps (Optionnel)
1. Créer une clé API Google Maps
2. L'ajouter dans `AndroidManifest.xml`

## 📱 Fonctionnalités NFC

L'application utilise la technologie NFC pour valider les livraisons :

### Activation NFC
- L'utilisateur doit activer le NFC dans les paramètres Android
- L'application détecte automatiquement la disponibilité NFC

### Validation de livraison
1. Scanner la carte NFC du livreur
2. Vérification de l'authenticité
3. Validation automatique de la livraison

### Format des tags NFC
- Préfixe : `ECODELI_DELIVERER:`
- Format : `ECODELI_DELIVERER:{deliverer_id}`
- Signature cryptographique pour la sécurité

## 🧪 Tests

### Tests unitaires
```bash
./gradlew testDebugUnitTest
```

### Tests d'interface (UI)
```bash
./gradlew connectedDebugAndroidTest
```

### Analyse statique
```bash
./gradlew lintDebug
```

### Couverture de code
```bash
./gradlew jacocoTestReport
```

## 🔒 Sécurité

### Network Security
- Certificate pinning en production
- Chiffrement TLS 1.3
- Validation des certificats SSL

### Stockage sécurisé
- EncryptedSharedPreferences pour les tokens
- DataStore pour les préférences
- Aucune donnée sensible en stockage local

### Obfuscation
- ProGuard/R8 pour la release
- Obfuscation du code et des ressources
- Suppression du code inutilisé

## 🌍 Internationalisation

L'application supporte plusieurs langues :
- 🇫🇷 Français (par défaut)
- 🇬🇧 Anglais
- 🇪🇸 Espagnol (à venir)
- 🇩🇪 Allemand (à venir)

Fichiers de traduction dans `res/values-{lang}/strings.xml`

## 📊 Analytics et Monitoring

### OneSignal
- Notifications push
- Segmentation des utilisateurs
- Analytics des notifications

### Crash Reporting
- Intégration Firebase Crashlytics (optionnel)
- Logs d'erreur détaillés

## 🚀 Déploiement

### Environnements
- **Development** : `http://localhost:3000`
- **Staging** : Firebase App Distribution
- **Production** : Google Play Store

### CI/CD
GitHub Actions pour :
- Build automatique
- Tests unitaires
- Analyse statique
- Déploiement staging/production

## 📈 Performance

### Optimisations
- ProGuard/R8 pour réduire la taille
- Compression des images avec WebP
- Lazy loading des listes
- Mise en cache intelligente

### Monitoring
- Android Vitals
- Métriques de performance
- Analyse de la batterie

## 🐛 Dépannage

### Problèmes courants

#### Build échoue
```bash
# Nettoyer le projet
./gradlew clean

# Vérifier les versions
./gradlew --version
```

#### Erreur NFC
- Vérifier que l'appareil supporte NFC
- Activer NFC dans les paramètres Android
- Vérifier les permissions dans AndroidManifest.xml

#### Erreur API
- Vérifier l'URL de l'API
- Contrôler la connectivité réseau
- Examiner les logs avec Logcat

### Logs
```bash
# Afficher les logs de l'application
adb logcat | grep EcoDeli

# Logs spécifiques NFC
adb logcat | grep NfcManager
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push sur la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

### Standards de code
- Kotlin Coding Conventions
- Material Design Guidelines
- Clean Architecture
- Tests unitaires obligatoires

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

- 📧 Email : support@ecodeli.me
- 📖 Documentation : [docs.ecodeli.me](https://docs.ecodeli.me)
- 🐛 Issues : [GitHub Issues](https://github.com/ecodeli/mobile/issues)

---

Développé avec ❤️ par l'équipe EcoDeli