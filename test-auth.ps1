# Script de test d'authentification EcoDeli
Write-Host "🧪 Test d'authentification EcoDeli" -ForegroundColor Cyan

# Test 1: Santé de l'API
Write-Host "`n1. Test de santé de l'API..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Host "✅ API Status: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur API Health: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Connexion client test
Write-Host "`n2. Test de connexion client..." -ForegroundColor Yellow
$loginData = @{
    email = "client-complete@test.com"
    password = "Test123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Connexion réussie!" -ForegroundColor Green
    Write-Host "User: $($loginResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    
    # Si compte n'existe pas, exécuter les seeds
    if ($_.Exception.Message -like "*user*not*found*" -or $_.Exception.Message -like "*404*") {
        Write-Host "`n🌱 Exécution des seeds..." -ForegroundColor Yellow
        npx prisma db seed
        
        # Retry connexion
        Write-Host "`n🔄 Retry connexion..." -ForegroundColor Yellow
        try {
            $retryResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" -Method POST -Body $loginData -ContentType "application/json"
            Write-Host "✅ Connexion réussie après seed!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Échec après seeds: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Test 3: Test des autres comptes
$testAccounts = @(
    @{ email = "deliverer-complete@test.com"; password = "Test123!"; role = "DELIVERER" },
    @{ email = "merchant-complete@test.com"; password = "Test123!"; role = "MERCHANT" },
    @{ email = "provider-complete@test.com"; password = "Test123!"; role = "PROVIDER" },
    @{ email = "admin-complete@test.com"; password = "Test123!"; role = "ADMIN" }
)

Write-Host "`n3. Test des autres comptes..." -ForegroundColor Yellow
foreach ($account in $testAccounts) {
    $accountData = @{
        email = $account.email
        password = $account.password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" -Method POST -Body $accountData -ContentType "application/json"
        Write-Host "✅ $($account.role): $($account.email)" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($account.role): $($account.email) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🏁 Tests terminés!" -ForegroundColor Cyan 