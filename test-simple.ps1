# Test simple des comptes EcoDeli
Write-Host "Test des comptes EcoDeli" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

$accounts = @(
    @{ email = "client-complete@test.com"; role = "CLIENT" },
    @{ email = "deliverer-complete@test.com"; role = "DELIVERER" },
    @{ email = "merchant-complete@test.com"; role = "MERCHANT" },
    @{ email = "provider-complete@test.com"; role = "PROVIDER" },
    @{ email = "admin-complete@test.com"; role = "ADMIN" }
)

$successCount = 0

foreach($account in $accounts) {
    Write-Host "`nTest $($account.role)..." -ForegroundColor Cyan
    
    $loginData = @{ 
        email = $account.email
        password = "Test123!" 
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login-simple" -Method POST -ContentType "application/json" -Body $loginData
        Write-Host "  OK - $($result.user.role): $($result.user.email)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nResultat: $successCount/5 comptes fonctionnels" -ForegroundColor Green
Write-Host "`nConnexion web: http://localhost:3000/login" -ForegroundColor Cyan 