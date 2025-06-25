# Test complet des inscriptions EcoDeli - Tous les rôles
Write-Host "=== Test des Inscriptions EcoDeli ===" -ForegroundColor Cyan

$roles = @(
    @{ role = "CLIENT"; email = "client@test.com" },
    @{ role = "DELIVERER"; email = "livreur@test.com" },
    @{ role = "MERCHANT"; email = "commercant@test.com" },
    @{ role = "PROVIDER"; email = "prestataire@test.com" }
)

$headers = @{
    "Content-Type" = "application/json"
}

foreach ($userRole in $roles) {
    $body = @{
        email = $userRole.email
        password = "Test123!"
        confirmPassword = "Test123!"
        firstName = "Test"
        lastName = $userRole.role
        role = $userRole.role
    } | ConvertTo-Json

    try {
        Write-Host "`nTest inscription $($userRole.role)..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -Headers $headers
        Write-Host "✅ $($userRole.role) inscrit avec succès" -ForegroundColor Green
        Write-Host "   ID: $($response.user.id)" -ForegroundColor Gray
        Write-Host "   Email: $($response.user.email)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Erreur $($userRole.role):" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Tests Terminés ===" -ForegroundColor Cyan 