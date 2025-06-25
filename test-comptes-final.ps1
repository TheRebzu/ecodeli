# Test final des comptes EcoDeli
Write-Host "🎯 Test final des comptes EcoDeli" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

$accounts = @(
    @{ email = "client-complete@test.com"; role = "CLIENT"; icon = "👤" },
    @{ email = "deliverer-complete@test.com"; role = "DELIVERER"; icon = "🚚" },
    @{ email = "merchant-complete@test.com"; role = "MERCHANT"; icon = "🏪" },
    @{ email = "provider-complete@test.com"; role = "PROVIDER"; icon = "🔧" },
    @{ email = "admin-complete@test.com"; role = "ADMIN"; icon = "⚙️" }
)

$successCount = 0
$errorCount = 0

foreach($account in $accounts) {
    Write-Host "`n$($account.icon) Test $($account.role)..." -ForegroundColor Cyan
    
    $loginData = @{ 
        email = $account.email
        password = "Test123!" 
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login-simple" -Method POST -ContentType "application/json" -Body $loginData
        Write-Host "   ✅ Connexion réussie" -ForegroundColor Green
        Write-Host "   📧 Email: $($result.user.email)" -ForegroundColor Gray
        Write-Host "   🎭 Rôle: $($result.user.role)" -ForegroundColor Gray
        Write-Host "   🔗 Redirect: $($result.redirectTo)" -ForegroundColor Gray
        $successCount++
    } catch {
        Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n🎉 Test terminé!" -ForegroundColor Green
Write-Host "✅ Succès: $successCount/5" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "❌ Erreurs: $errorCount" -ForegroundColor Red
}

Write-Host "`n🌐 Interface web:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/login" -ForegroundColor Blue
Write-Host "`n💡 Les comptes de test sont visibles sur la page de connexion en mode développement" -ForegroundColor Yellow 