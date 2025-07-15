# 🔧 Configuration EcoDeli Mobile

## 🚀 Configuration Rapide

### 1. **Créer le fichier local.properties**
```bash
cp local.properties.example local.properties
```

### 2. **Configurer les URLs**
```properties
# URLs EcoDeli
API_BASE_URL=https://ecodeli.me/
WEB_BASE_URL=https://ecodeli.me/

# Services externes
GOOGLE_MAPS_API_KEY=votre_cle_google_maps
STRIPE_PUBLIC_KEY=pk_live_51...
ONESIGNAL_APP_ID=votre-onesignal-app-id
```

### 3. **Vérifier la connexion API**
```bash
# Tester la connexion
curl -X GET "https://ecodeli.me/api/public/status"

# Vérifier les endpoints principaux
curl -X GET "https://ecodeli.me/api/public/zones"
```

## 📱 Endpoints Utilisés

### **Authentification**
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `GET /api/auth/session` - Session actuelle
- `POST /api/auth/logout` - Déconnexion

### **Client**
- `GET /api/client/announcements` - Annonces client
- `POST /api/client/announcements` - Créer annonce
- `GET /api/client/deliveries` - Livraisons client
- `POST /api/client/deliveries/{id}/validate` - Valider livraison
- `GET /api/client/notifications` - Notifications
- `GET /api/client/wallet` - Portefeuille

### **Livreur**
- `GET /api/deliverer/announcements` - Opportunités
- `POST /api/deliverer/announcements/{id}/accept` - Accepter
- `GET /api/deliverer/deliveries` - Livraisons actives
- `POST /api/deliverer/deliveries/{id}/pickup` - Confirmer récupération
- `POST /api/deliverer/deliveries/{id}/generate-code` - Générer code
- `POST /api/deliverer/deliveries/{id}/validate` - Compléter livraison

### **Paiements**
- `POST /api/client/announcements/{id}/create-payment-intent` - Stripe
- `GET /api/client/payments` - Historique paiements
- `POST /api/client/wallet/recharge` - Recharger portefeuille

### **Notifications**
- `POST /api/push/subscribe` - S'abonner aux notifications
- `POST /api/push/unsubscribe` - Se désabonner
- `POST /api/client/notifications/{id}/read` - Marquer comme lu

## 🔐 Authentification

### **JWT Bearer Token**
```kotlin
// L'app utilise le même système d'auth que le web
headers["Authorization"] = "Bearer ${token}"
```

### **Gestion des Sessions**
- Token stocké dans DataStore
- Refresh automatique
- Déconnexion automatique si 401

## 📊 Modèles de Données

### **User**
```kotlin
data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: UserRole, // CLIENT, DELIVERER, MERCHANT, PROVIDER
    val isValidated: Boolean
)
```

### **Announcement**
```kotlin
data class Announcement(
    val id: String,
    val title: String,
    val type: AnnouncementType, // PACKAGE, PERSON_TRANSPORT, etc.
    val status: AnnouncementStatus,
    val pickupAddress: Address,
    val deliveryAddress: Address,
    val price: Double
)
```

### **Delivery**
```kotlin
data class Delivery(
    val id: String,
    val status: DeliveryStatus,
    val trackingCode: String,
    val validationCode: String?,
    val steps: List<DeliveryStep>
)
```

## 🔧 Configuration Avancée

### **Variables d'Environnement**
```kotlin
// AppConfig.kt
object AppConfig {
    const val API_BASE_URL = "https://ecodeli.me/"
    const val WEB_BASE_URL = "https://ecodeli.me/"
    
    object ExternalServices {
        const val STRIPE_PUBLIC_KEY = BuildConfig.STRIPE_PUBLIC_KEY
        const val ONESIGNAL_APP_ID = BuildConfig.ONESIGNAL_APP_ID
        const val GOOGLE_MAPS_API_KEY = BuildConfig.GOOGLE_MAPS_API_KEY
    }
}
```

### **Network Configuration**
```kotlin
// NetworkModule.kt
@Provides
@Singleton
fun provideRetrofit(): Retrofit = Retrofit.Builder()
    .baseUrl("https://ecodeli.me/")
    .addConverterFactory(GsonConverterFactory.create())
    .build()
```

## 🛠 Build et Déploiement

### **Build Commands**
```bash
# Development build
./gradlew assembleDebug

# Production build
./gradlew assembleRelease

# Avec configuration custom
./gradlew assembleRelease -PAPI_BASE_URL=https://ecodeli.me/
```

### **Configuration Build Types**
```kotlin
// build.gradle.kts
buildTypes {
    debug {
        buildConfigField("String", "API_BASE_URL", "\"https://ecodeli.me/\"")
        buildConfigField("String", "STRIPE_PUBLIC_KEY", "\"${project.findProperty("STRIPE_PUBLIC_KEY")}\"")
    }
    release {
        buildConfigField("String", "API_BASE_URL", "\"https://ecodeli.me/\"")
        buildConfigField("String", "STRIPE_PUBLIC_KEY", "\"${project.findProperty("STRIPE_PUBLIC_KEY")}\"")
        isMinifyEnabled = true
        proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
}
```

## 🔍 Debug et Tests

### **Test de Connexion**
```bash
# Vérifier que l'API est accessible
curl -I https://ecodeli.me/api/public/status

# Test avec logs
adb logcat | grep -i ecodeli
```

### **Variables de Debug**
```properties
# Dans local.properties
ENABLE_DEBUG_LOGGING=true
ENABLE_NETWORK_LOGGING=true
API_BASE_URL=https://ecodeli.me/
```

## 🔄 Synchronisation avec le Web

### **Base de Données Partagée**
- Même Prisma schema
- Même structure de données
- Synchronisation automatique

### **Notifications Cross-Platform**
- OneSignal unifié
- Notifications web + mobile
- Segmentation par rôle

### **Paiements Unifiés**
- Même compte Stripe
- Portefeuille synchronisé
- Historique unifié

## 🚨 Troubleshooting

### **Erreurs Communes**
```bash
# Erreur de connexion
# Vérifier : https://ecodeli.me/api/public/status

# Erreur 401
# Vérifier le token JWT dans les headers

# Erreur NFC
# Vérifier que NFC est activé sur l'appareil
```

### **Logs Utiles**
```bash
# Logs réseau
adb logcat | grep -i "okhttp\|retrofit"

# Logs NFC
adb logcat | grep -i nfc

# Logs app
adb logcat | grep -i ecodeli
```

## ✅ Checklist Final

- [ ] URL API configurée : `https://ecodeli.me/`
- [ ] Clés Stripe configurées
- [ ] OneSignal configuré
- [ ] Google Maps configuré
- [ ] Permissions NFC activées
- [ ] Tests de connexion passés
- [ ] Build release fonctionnel

L'application est maintenant parfaitement configurée pour **ecodeli.me** ! 🎉