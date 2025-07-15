# 🚀 Configuration Mobile pour Localhost

## Configuration mise à jour pour localhost:3000

Les fichiers suivants ont été modifiés pour utiliser localhost au lieu de ecodeli.me :

### 1. **local.properties.example**
```properties
API_BASE_URL=http://10.0.2.2:3000/
WEB_BASE_URL=http://10.0.2.2:3000/
```

### 2. **AppConfig.kt**
```kotlin
const val API_BASE_URL = "http://10.0.2.2:3000/"
const val WEB_BASE_URL = "http://10.0.2.2:3000/"
```

### 3. **ApiConfig.kt**
```kotlin
const val BASE_URL = "http://10.0.2.2:3000/"
const val WS_URL = "ws://10.0.2.2:3000/ws"
val currentEnvironment = Environment.DEV
```

### 4. **NetworkModule.kt**
```kotlin
private const val BASE_URL = "http://10.0.2.2:3000/"
```

## 📱 Commandes pour compiler et tester

### Prérequis
1. Démarrer votre serveur local Next.js sur le port 3000
2. Créer le fichier `local.properties` à partir de `local.properties.example`

### Compilation
```bash
cd mobile

# Nettoyer le projet
./gradlew clean

# Compiler en mode debug
./gradlew assembleDebug

# Installer sur émulateur/appareil
./gradlew installDebug

# Lancer l'app
adb shell am start -n com.ecodeli.mobile/.MainActivity
```

### Tests
```bash
# Tests unitaires
./gradlew test

# Tests UI
./gradlew connectedAndroidTest

# Build complet avec tests
./gradlew build
```

### Vérification de la connexion
```bash
# Depuis votre machine hôte
curl -X GET "http://localhost:3000/api/public/status"

# Depuis l'émulateur Android
adb shell curl -X GET "http://10.0.2.2:3000/api/public/status"
```

### Debug
```bash
# Logs de l'application
adb logcat | grep -i ecodeli

# Logs réseau
adb logcat | grep -i "okhttp\|retrofit"
```

## ⚠️ Notes importantes

- **10.0.2.2** est l'adresse spéciale pour accéder à localhost depuis l'émulateur Android
- Pour un appareil physique, utilisez l'IP de votre machine (ex: 192.168.1.x:3000)
- Assurez-vous que votre serveur Next.js accepte les connexions externes si vous utilisez un appareil physique

## 🔧 Configuration pour appareil physique

Si vous utilisez un appareil physique au lieu de l'émulateur :

1. Trouvez l'IP de votre machine : `ipconfig` (Windows) ou `ifconfig` (Linux/Mac)
2. Remplacez `10.0.2.2` par votre IP locale dans tous les fichiers
3. Assurez-vous que votre firewall autorise les connexions sur le port 3000
4. Votre appareil et votre machine doivent être sur le même réseau