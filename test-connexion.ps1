# Script de test de connexion EcoDeli
Write-Host "🧪 Test de connexion EcoDeli" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Test de santé de l'API
Write-Host "`n1. Test de santé de l'API..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Host "✅ API Health: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "   Message: $($healthResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur API Health: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test de connexion CLIENT
Write-Host "`n2. Test de connexion CLIENT..." -ForegroundColor Yellow
$loginData = @{
    email = "client-complete@test.com"
    password = "Test123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    Write-Host "✅ Connexion CLIENT réussie" -ForegroundColor Green
    Write-Host "   Utilisateur: $($loginResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Rôle: $($loginResponse.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur connexion CLIENT: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Détails: $($_.ErrorDetails.Message)" -ForegroundColor Gray
}

# Test de connexion ADMIN
Write-Host "`n3. Test de connexion ADMIN..." -ForegroundColor Yellow
$adminLoginData = @{
    email = "admin-complete@test.com"
    password = "Test123!"
} | ConvertTo-Json

try {
    $adminLoginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $adminLoginData
    Write-Host "✅ Connexion ADMIN réussie" -ForegroundColor Green
    Write-Host "   Utilisateur: $($adminLoginResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Rôle: $($adminLoginResponse.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur connexion ADMIN: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Détails: $($_.ErrorDetails.Message)" -ForegroundColor Gray
}

Write-Host "`n🎉 Tests terminés!" -ForegroundColor Green
Write-Host "`n📋 Comptes disponibles:" -ForegroundColor Cyan
Write-Host "   👤 CLIENT: client-complete@test.com" -ForegroundColor White
Write-Host "   🚚 DELIVERER: deliverer-complete@test.com" -ForegroundColor White
Write-Host "   🏪 MERCHANT: merchant-complete@test.com" -ForegroundColor White
Write-Host "   🔧 PROVIDER: provider-complete@test.com" -ForegroundColor White
Write-Host "   ⚙️ ADMIN: admin-complete@test.com" -ForegroundColor White
Write-Host "   🔑 Mot de passe: Test123!" -ForegroundColor Yellow

Write-Host "`n🌐 Ouvrez votre navigateur sur:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/login" -ForegroundColor Blue 