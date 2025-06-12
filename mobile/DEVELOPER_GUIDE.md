# Guide du Développeur - EcoDeli Android

## 🚀 Démarrage rapide

### 1. Configuration de l'environnement
```bash
# Cloner le repository
git clone https://github.com/ecodeli/ecodeli.git
cd ecodeli/apps/mobile

# Installer les dépendances (automatique avec Gradle)
./gradlew --version

# Build et installation
./scripts/build.sh debug
```

### 2. Configuration de l'API
Créer un fichier `local.properties` :
```properties
# API Configuration
api.base.url=http://10.0.2.2:3000
onesignal.app.id=your_onesignal_app_id

# Google Maps (optionnel)
google.maps.api.key=your_google_maps_key

# Keystore (pour release)
keystore.file=../keystore.jks
keystore.password=your_keystore_password
key.alias=ecodeli
key.password=your_key_password
```

## 📁 Structure du projet

```
app/src/main/java/com/ecodeli/
├── data/                           # Couche de données
│   ├── api/                        # Configuration API et tRPC
│   │   ├── TrpcClient.kt          # Interface Retrofit pour tRPC
│   │   ├── AuthInterceptor.kt     # Intercepteur d'authentification
│   │   ├── TokenAuthenticator.kt  # Rafraîchissement automatique des tokens
│   │   ├── NetworkModule.kt       # Configuration Hilt pour Retrofit
│   │   └── Result.kt              # Wrapper pour les résultats API
│   ├── models/                     # Modèles de données
│   │   ├── Auth.kt                # Modèles d'authentification
│   │   ├── Delivery.kt            # Modèles de livraison
│   │   ├── Service.kt             # Modèles de prestation
│   │   └── Payment.kt             # Modèles de paiement
│   └── repositories/               # Repositories
│       ├── AuthRepository.kt      # Gestion de l'authentification
│       ├── DeliveryRepository.kt  # Gestion des livraisons
│       ├── ServiceRepository.kt   # Gestion des prestations
│       └── PaymentRepository.kt   # Gestion des paiements
├── domain/                         # Logique métier
│   ├── entities/                   # Entités métier (à implémenter)
│   └── usecases/                   # Cas d'usage
│       ├── auth/                   # Use cases d'authentification
│       └── delivery/               # Use cases de livraison
├── presentation/                   # Interface utilisateur
│   ├── ui/                         # Écrans Compose
│   │   ├── auth/                   # Écrans d'authentification
│   │   ├── home/                   # Dashboard et écran principal
│   │   ├── delivery/               # Écrans de livraison
│   │   ├── service/                # Écrans de prestation
│   │   ├── profile/                # Écrans de profil
│   │   ├── common/                 # Composants communs
│   │   └── theme/                  # Thème et styles
│   ├── viewmodels/                 # ViewModels
│   └── navigation/                 # Navigation
├── utils/                          # Utilitaires
│   ├── nfc/                        # Gestion NFC
│   └── notifications/              # Gestion des notifications
└── EcoDeliApp.kt                   # Classe Application principale
```

## 🎨 Développement UI avec Jetpack Compose

### Thème et couleurs
```kotlin
// Utilisation du thème EcoDeli
@Composable
fun MonEcran() {
    EcoDeliTheme {
        Surface(
            color = MaterialTheme.colorScheme.background
        ) {
            // Contenu de l'écran
        }
    }
}

// Couleurs disponibles
MaterialTheme.colorScheme.primary        // Vert EcoDeli
MaterialTheme.colorScheme.secondary      // Bleu secondaire
MaterialTheme.colorScheme.error          // Rouge d'erreur
```

### Composants réutilisables
```kotlin
// Écran de chargement
LoadingScreen(message = "Chargement des données...")

// Composant NFC
NfcReaderCard(
    isActive = true,
    onNfcValidated = { result -> /* ... */ }
)

// États de chargement en ligne
InlineLoading(message = "Synchronisation...")
```

### Navigation
```kotlin
// Navigation vers un écran
navController.navigate(Routes.DELIVERY_DETAIL + "/$deliveryId")

// Navigation avec popUpTo
navController.navigate(Routes.HOME) {
    popUpTo(Routes.LOGIN) { inclusive = true }
}
```

## 🔄 Architecture MVVM

### ViewModel exemple
```kotlin
@HiltViewModel
class MonViewModel @Inject constructor(
    private val repository: MonRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(MonUiState())
    val uiState: StateFlow<MonUiState> = _uiState.asStateFlow()
    
    fun action() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            when (val result = repository.getData()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        data = result.data,
                        isLoading = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        error = result.exception.message,
                        isLoading = false
                    )
                }
            }
        }
    }
}

data class MonUiState(
    val data: List<Item> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)
```

### Repository exemple
```kotlin
@Singleton
class MonRepository @Inject constructor(
    private val apiClient: TrpcClient
) {
    suspend fun getData(): Result<List<Item>> {
        return try {
            val response = apiClient.getData(TrpcRequest(Unit))
            Result.Success(response.result.data)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
```

## 🔌 Intégration API tRPC

### Structure des requêtes
```kotlin
// Requête tRPC
data class TrpcRequest<T>(
    @Json(name = "0") val input: T
)

// Réponse tRPC
data class TrpcResponse<T>(
    val result: TrpcResult<T>
)

data class TrpcResult<T>(
    val data: T
)
```

### Appel API
```kotlin
// Dans un repository
suspend fun login(email: String, password: String): Result<LoginOutput> {
    return try {
        val response = trpcClient.login(
            TrpcRequest(LoginInput(email, password))
        )
        Result.Success(response.result.data)
    } catch (e: Exception) {
        Result.Error(e)
    }
}
```

### Gestion des erreurs
```kotlin
// Dans un ViewModel
when (val result = repository.getData()) {
    is Result.Success -> {
        // Succès
        updateUiState { it.copy(data = result.data, isLoading = false) }
    }
    is Result.Error -> {
        // Erreur
        updateUiState { 
            it.copy(
                error = result.exception.message ?: "Erreur inconnue",
                isLoading = false
            ) 
        }
    }
    is Result.Loading -> {
        // Chargement
        updateUiState { it.copy(isLoading = true) }
    }
}
```

## 📱 Gestion NFC

### Initialisation
```kotlin
class MainActivity : ComponentActivity() {
    @Inject lateinit var nfcManager: NfcManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        nfcManager.initialize(this)
        nfcManager.setOnNfcTagReadListener { nfcData ->
            // Traiter les données NFC
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent?.action) {
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            tag?.let { 
                lifecycleScope.launch {
                    nfcManager.handleNfcTag(it)
                }
            }
        }
    }
}
```

### Validation NFC
```kotlin
// Dans un ViewModel
fun validateWithNfc(nfcData: NfcTagData) {
    viewModelScope.launch {
        val validationResult = nfcManager.validateDelivererTag(nfcData)
        
        when (validationResult) {
            is ValidationResult.Success -> {
                // Valider la livraison avec l'API
                validateDeliveryUseCase.validateWithNfc(
                    deliveryId,
                    validationResult.delivererId,
                    validationResult.signature
                )
            }
            is ValidationResult.InvalidTag -> {
                _uiState.value = _uiState.value.copy(
                    error = "Tag NFC invalide: ${validationResult.reason}"
                )
            }
            is ValidationResult.Error -> {
                _uiState.value = _uiState.value.copy(
                    error = "Erreur NFC: ${validationResult.message}"
                )
            }
        }
    }
}
```

## 🔔 Notifications OneSignal

### Configuration
```kotlin
// Dans EcoDeliApp.kt
class EcoDeliApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialiser OneSignal
        OneSignal.initWithContext(this, BuildConfig.ONESIGNAL_APP_ID)
        
        // Demander la permission
        CoroutineScope(Dispatchers.IO).launch {
            OneSignal.Notifications.requestPermission(true)
        }
    }
}
```

### Gestion des notifications
```kotlin
// Écouter les notifications
OneSignal.Notifications.addForegroundLifecycleListener { event ->
    // Notification reçue en premier plan
    val notification = event.notification
    
    // Traiter la notification personnalisée
    handleCustomNotification(notification)
}

OneSignal.Notifications.addClickListener { result ->
    // Notification cliquée
    val notification = result.notification
    
    // Navigation basée sur les données de la notification
    navigateFromNotification(notification.additionalData)
}
```

## 🧪 Tests

### Tests unitaires
```kotlin
@ExperimentalCoroutinesTest
class LoginViewModelTest {
    
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()
    
    @Mock
    private lateinit var loginUseCase: LoginUseCase
    
    private lateinit var viewModel: LoginViewModel
    
    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        viewModel = LoginViewModel(loginUseCase)
    }
    
    @Test
    fun `login success updates ui state correctly`() = runTest {
        // Given
        val loginOutput = LoginOutput(/* ... */)
        whenever(loginUseCase("test@test.com", "password"))
            .thenReturn(Result.Success(loginOutput))
        
        // When
        viewModel.login()
        
        // Then
        val uiState = viewModel.uiState.value
        assertTrue(uiState.loginSuccess)
        assertFalse(uiState.isLoading)
        assertNull(uiState.error)
    }
}
```

### Tests UI
```kotlin
@ExperimentalComposeUiApi
class LoginScreenTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    @Test
    fun `login screen displays correctly`() {
        composeTestRule.setContent {
            EcoDeliTheme {
                LoginScreen(
                    onLoginSuccess = {},
                    onNavigateToRegister = {}
                )
            }
        }
        
        composeTestRule
            .onNodeWithText("Se connecter")
            .assertIsDisplayed()
            
        composeTestRule
            .onNodeWithText("Email")
            .assertIsDisplayed()
    }
}
```

## 🎯 Conseils de développement

### Performance
- Utiliser `remember` pour éviter les recompositions inutiles
- Préférer `LazyColumn` pour les listes longues
- Optimiser les images avec Coil

### Sécurité
- Ne jamais logger de données sensibles
- Utiliser EncryptedSharedPreferences pour les tokens
- Valider toutes les entrées utilisateur

### Architecture
- Respecter la séparation des couches
- Utiliser les Use Cases pour la logique métier complexe
- Préférer l'injection de dépendance avec Hilt

### Git
```bash
# Branches
git checkout -b feature/nouvelle-fonctionnalite
git checkout -b bugfix/correction-bug
git checkout -b hotfix/correction-urgente

# Commits
git commit -m "feat: ajouter validation NFC"
git commit -m "fix: corriger crash au login"
git commit -m "refactor: simplifier LoginViewModel"
```

## 🚀 Déploiement

### Build local
```bash
# Debug
./scripts/build.sh debug

# Release
./scripts/build.sh release
```

### CI/CD
Le projet utilise GitHub Actions pour :
- Tests automatiques sur PR
- Build et déploiement automatique
- Analyse de la qualité du code

### Variables d'environnement nécessaires
```bash
# Pour la release
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=ecodeli
KEY_PASSWORD=your_key_password

# Pour les notifications (optionnel)
SLACK_WEBHOOK_URL=your_slack_webhook

# Pour le Play Store (optionnel)
PLAY_CONSOLE_KEY=your_play_console_service_account_key
```

## 🐛 Debugging

### Logs utiles
```kotlin
// Dans le code
Log.d("EcoDeli", "Debug message")
Log.e("EcoDeli", "Error message", exception)

// Logs spécifiques
Log.d("EcoDeli-NFC", "NFC tag detected: $tagId")
Log.d("EcoDeli-API", "API call: ${response.status}")
```

### ADB Commands
```bash
# Logs de l'application
adb logcat | grep EcoDeli

# Installer APK
adb install -r app-debug.apk

# Effacer les données de l'app
adb shell pm clear com.ecodeli
```

---

Happy coding! 🚀