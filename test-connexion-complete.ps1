# Test complet : Connexion + Accès aux pages EcoDeli
Write-Host "Test complet EcoDeli" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green

$accounts = @(
    @{ email = "client-complete@test.com"; role = "CLIENT"; url = "/fr/client" },
    @{ email = "deliverer-complete@test.com"; role = "DELIVERER"; url = "/fr/deliverer" },
    @{ email = "merchant-complete@test.com"; role = "MERCHANT"; url = "/fr/merchant" },
    @{ email = "provider-complete@test.com"; role = "PROVIDER"; url = "/fr/provider" },
    @{ email = "admin-complete@test.com"; role = "ADMIN"; url = "/fr/admin" }
)

$loginSuccess = 0
$pageSuccess = 0
$totalTests = $accounts.Count

foreach($account in $accounts) {
    Write-Host "`nTest $($account.role)..." -ForegroundColor Cyan
    
    # Test 1: Connexion API
    $loginData = @{ 
        email = $account.email
        password = "Test123!" 
    } | ConvertTo-Json
    
    try {
        $loginResult = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login-simple" -Method POST -ContentType "application/json" -Body $loginData
        Write-Host "  Connexion: OK" -ForegroundColor Green
        $loginSuccess++
        
        # Test 2: Accès à la page
        try {
            $pageResult = Invoke-WebRequest -Uri "http://localhost:3000$($account.url)" -Method GET
            if ($pageResult.StatusCode -eq 200) {
                Write-Host "  Page: OK (Status $($pageResult.StatusCode))" -ForegroundColor Green
                $pageSuccess++
            } else {
                Write-Host "  Page: ERREUR (Status $($pageResult.StatusCode))" -ForegroundColor Red
            }
        } catch {
            Write-Host "  Page: ERREUR - $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "  Connexion: ERREUR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nResultats:" -ForegroundColor Green
Write-Host "  Connexions: $loginSuccess/$totalTests" -ForegroundColor White
Write-Host "  Pages: $pageSuccess/$totalTests" -ForegroundColor White

if ($loginSuccess -eq $totalTests -and $pageSuccess -eq $totalTests) {
    Write-Host "`nTOUT FONCTIONNE!" -ForegroundColor Green
} else {
    Write-Host "`nProblemes detectes" -ForegroundColor Yellow
}

Write-Host "`nInterface web: http://localhost:3000/login" -ForegroundColor Cyan 