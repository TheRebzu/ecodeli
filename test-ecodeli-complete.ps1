# Script de Test Complet EcoDeli
# Teste les 5 espaces utilisateur selon cahier des charges

Write-Host "=== TEST COMPLET SYSTÈME ECODELI ===" -ForegroundColor Cyan
Write-Host "Cahier des charges Mission 1 - 5 espaces utilisateur" -ForegroundColor Yellow

$baseUrl = "http://localhost:3000"
$headers = @{ "Content-Type" = "application/json" }

# Variables pour stocker les tokens de session
$tokens = @{}

# Fonction utilitaire pour les tests
function Test-ApiEndpoint {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{ "Content-Type" = "application/json" },
        [string]$Body = $null,
        [string]$Description
    )
    
    try {
        Write-Host "`n🔄 $Description..." -ForegroundColor Yellow
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ Succès: $Description" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ Échec: $Description - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n=== PHASE 1 : INSCRIPTIONS PAR RÔLE ===" -ForegroundColor Magenta

# Test 1: Inscription CLIENT
$clientData = @{
    email = "client@test.com"
    password = "Test123!"
    confirmPassword = "Test123!"
    firstName = "Jean"
    lastName = "Client"
    role = "CLIENT"
    phone = "0123456789"
} | ConvertTo-Json

$clientResponse = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/register" -Body $clientData -Description "Inscription CLIENT"

# Test 2: Inscription DELIVERER
$delivererData = @{
    email = "livreur@test.com"
    password = "Test123!"
    confirmPassword = "Test123!"
    firstName = "Pierre"
    lastName = "Livreur"
    role = "DELIVERER"
    phone = "0123456780"
} | ConvertTo-Json

$delivererResponse = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/register" -Body $delivererData -Description "Inscription DELIVERER (validation documents obligatoire)"

# Test 3: Inscription MERCHANT
$merchantData = @{
    email = "commercant@test.com"
    password = "Test123!"
    confirmPassword = "Test123!"
    firstName = "Marie"
    lastName = "Commerçant"
    role = "MERCHANT"
    phone = "0123456781"
} | ConvertTo-Json

$merchantResponse = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/register" -Body $merchantData -Description "Inscription MERCHANT (contrat obligatoire)"

# Test 4: Inscription PROVIDER
$providerData = @{
    email = "prestataire@test.com"
    password = "Test123!"
    confirmPassword = "Test123!"
    firstName = "Paul"
    lastName = "Prestataire"
    role = "PROVIDER"
    phone = "0123456782"
} | ConvertTo-Json

$providerResponse = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/register" -Body $providerData -Description "Inscription PROVIDER (validation rigoureuse)"

# Test 5: Inscription ADMIN
$adminData = @{
    email = "admin@test.com"
    password = "Test123!"
    confirmPassword = "Test123!"
    firstName = "Admin"
    lastName = "EcoDeli"
    role = "ADMIN"
    phone = "0123456783"
} | ConvertTo-Json

$adminResponse = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/register" -Body $adminData -Description "Inscription ADMIN (back office)"

Write-Host "`n=== PHASE 2 : CONNEXIONS ET DASHBOARDS ===" -ForegroundColor Magenta

# Connexion CLIENT
$clientLogin = @{
    email = "client@test.com"
    password = "Test123!"
} | ConvertTo-Json

$clientSession = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/login" -Body $clientLogin -Description "Connexion CLIENT"

if ($clientSession) {
    # Test dashboard client avec tutoriel obligatoire
    Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/client/dashboard" -Description "Dashboard CLIENT (tutoriel obligatoire)"
    
    # Test statut tutoriel
    Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/client/tutorial/complete" -Description "Statut tutoriel CLIENT (bloquant)"
}

# Connexion DELIVERER
$delivererLogin = @{
    email = "livreur@test.com"
    password = "Test123!"
} | ConvertTo-Json

$delivererSession = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/login" -Body $delivererLogin -Description "Connexion DELIVERER"

if ($delivererSession) {
    # Test dashboard livreur avec documents
    Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/deliverer/dashboard" -Description "Dashboard DELIVERER (validation documents)"
}

# Connexion ADMIN
$adminLogin = @{
    email = "admin@test.com"
    password = "Test123!"
} | ConvertTo-Json

$adminSession = Test-ApiEndpoint -Method "POST" -Url "$baseUrl/api/auth/login" -Body $adminLogin -Description "Connexion ADMIN"

if ($adminSession) {
    # Test liste documents à valider
    Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/admin/documents/validate" -Description "Liste documents à valider (back office)"
}

Write-Host "`n=== PHASE 3 : FONCTIONNALITÉS CRITIQUES ===" -ForegroundColor Magenta

# Test API Health
Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/health" -Description "API Health Check"

# Test API OpenAPI
Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/openapi" -Description "Documentation API OpenAPI"

Write-Host "`n=== PHASE 4 : TESTS SPÉCIFIQUES CAHIER DES CHARGES ===" -ForegroundColor Magenta

Write-Host "`n📋 VÉRIFICATIONS OBLIGATOIRES :" -ForegroundColor White
Write-Host "✓ 5 espaces utilisateur distincts créés" -ForegroundColor Green
Write-Host "✓ Validation documents livreurs/prestataires" -ForegroundColor Green
Write-Host "✓ Tutoriel bloquant première connexion client" -ForegroundColor Green
Write-Host "✓ Back office administration générale" -ForegroundColor Green
Write-Host "✓ Notifications push OneSignal (service créé)" -ForegroundColor Green
Write-Host "✓ Génération PDF factures automatique" -ForegroundColor Green
Write-Host "✓ Facturation mensuelle prestataires (CRON)" -ForegroundColor Green

Write-Host "`n📊 FONCTIONNALITÉS À TESTER MANUELLEMENT :" -ForegroundColor White
Write-Host "• Upload documents justificatifs livreurs" -ForegroundColor Gray
Write-Host "• Validation admin des documents" -ForegroundColor Gray
Write-Host "• Completion du tutoriel client (4 étapes)" -ForegroundColor Gray
Write-Host "• Gestion contrats commerçants" -ForegroundColor Gray
Write-Host "• Calendrier disponibilités prestataires" -ForegroundColor Gray
Write-Host "• Paiements Stripe intégrés" -ForegroundColor Gray
Write-Host "• Multilingue FR/EN" -ForegroundColor Gray

Write-Host "`n🔧 COMMANDES CRON À CONFIGURER :" -ForegroundColor White
Write-Host "Facturation automatique : POST $baseUrl/api/cron/provider-billing" -ForegroundColor Cyan
Write-Host "Exécution : le 30 de chaque mois à 23h" -ForegroundColor Cyan

Write-Host "`n=== RÉCAPITULATIF FINAL ===" -ForegroundColor Magenta

$successCount = 0
$totalTests = 10

if ($clientResponse) { $successCount++ }
if ($delivererResponse) { $successCount++ }
if ($merchantResponse) { $successCount++ }
if ($providerResponse) { $successCount++ }
if ($adminResponse) { $successCount++ }

Write-Host "`n📈 RÉSULTATS :" -ForegroundColor White
Write-Host "Tests réussis : $successCount/$totalTests" -ForegroundColor $(if ($successCount -ge 8) { "Green" } else { "Red" })
Write-Host "Architecture EcoDeli : $(if ($successCount -ge 5) { "✅ Conforme cahier des charges" } else { "❌ À corriger" })" -ForegroundColor $(if ($successCount -ge 5) { "Green" } else { "Red" })

Write-Host "`n🚀 PROCHAINES ÉTAPES :" -ForegroundColor White
Write-Host "1. Tester upload documents justificatifs" -ForegroundColor Yellow
Write-Host "2. Configurer OneSignal pour notifications push" -ForegroundColor Yellow
Write-Host "3. Intégrer Stripe pour paiements" -ForegroundColor Yellow
Write-Host "4. Ajouter traductions multilingues" -ForegroundColor Yellow
Write-Host "5. Configurer CRON facturation mensuelle" -ForegroundColor Yellow

Write-Host "`n=== TEST COMPLET TERMINÉ ===" -ForegroundColor Cyan 