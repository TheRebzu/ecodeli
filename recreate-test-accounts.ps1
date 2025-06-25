# Script pour recréer les comptes de test EcoDeli
Write-Host "🔄 Recréation des comptes de test EcoDeli" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3000"
$testAccounts = @(
    @{
        email = "client-complete@test.com"
        password = "Test123!"
        confirmPassword = "Test123!"
        role = "CLIENT"
        firstName = "Jean"
        lastName = "Client"
        phone = "0123456789"
    },
    @{
        email = "deliverer-complete@test.com"
        password = "Test123!"
        confirmPassword = "Test123!"
        role = "DELIVERER"
        firstName = "Marc"
        lastName = "Livreur"
        phone = "0123456790"
    },
    @{
        email = "merchant-complete@test.com"
        password = "Test123!"
        confirmPassword = "Test123!"
        role = "MERCHANT"
        firstName = "Sophie"
        lastName = "Commerçant"
        phone = "0123456791"
    },
    @{
        email = "provider-complete@test.com"
        password = "Test123!"
        confirmPassword = "Test123!"
        role = "PROVIDER"
        firstName = "Pierre"
        lastName = "Prestataire"
        phone = "0123456792"
    },
    @{
        email = "admin-complete@test.com"
        password = "Test123!"
        confirmPassword = "Test123!"
        role = "ADMIN"
        firstName = "Admin"
        lastName = "EcoDeli"
        phone = "0123456793"
    }
)

# Test de santé de l'API
Write-Host "`n1. Vérification de l'API..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ API disponible: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API non disponible. Vérifiez que le serveur Next.js est démarré." -ForegroundColor Red
    exit 1
}

# Création des comptes
Write-Host "`n2. Création des comptes de test..." -ForegroundColor Yellow
$successCount = 0
$errorCount = 0

foreach ($account in $testAccounts) {
    Write-Host "`n   Création compte $($account.role)..." -ForegroundColor Cyan
    
    $body = $account | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $body
        Write-Host "   ✅ $($account.role): $($account.email)" -ForegroundColor Green
        $successCount++
    } catch {
        $errorDetails = ""
        if ($_.ErrorDetails.Message) {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorObj.error -eq "Un compte existe déjà avec cet email") {
                Write-Host "   ⚠️  $($account.role): Compte déjà existant" -ForegroundColor Yellow
            } else {
                Write-Host "   ❌ $($account.role): $($errorObj.error)" -ForegroundColor Red
                $errorCount++
            }
        } else {
            Write-Host "   ❌ $($account.role): $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
}

# Test de connexion
Write-Host "`n3. Test de connexion..." -ForegroundColor Yellow
$testLogin = @{
    email = "client-complete@test.com"
    password = "Test123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $testLogin
    Write-Host "✅ Connexion CLIENT réussie" -ForegroundColor Green
    Write-Host "   Utilisateur: $($loginResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Rôle: $($loginResponse.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Échec de connexion CLIENT" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Erreur: $($errorObj.error)" -ForegroundColor Gray
    }
}

# Résumé
Write-Host "`n🎉 Recréation terminée!" -ForegroundColor Green
Write-Host "✅ Comptes créés: $successCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "❌ Erreurs: $errorCount" -ForegroundColor Red
}

Write-Host "`n📋 Comptes disponibles:" -ForegroundColor Cyan
foreach ($account in $testAccounts) {
    Write-Host "   $($account.role): $($account.email)" -ForegroundColor White
}
Write-Host "   🔑 Mot de passe: Test123!" -ForegroundColor Yellow

Write-Host "`n🌐 Connexion:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/login" -ForegroundColor Blue 