# Test de connexion EcoDeli - PowerShell
$body = @{
    email = "client@test.com"
    password = "Test123!"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "Test de connexion..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -Headers $headers
    Write-Host "✅ Connexion réussie:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erreur connexion:" -ForegroundColor Red
    $_.Exception.Message
    if ($_.Exception.Response) {
        $_.Exception.Response.StatusCode
    }
} 