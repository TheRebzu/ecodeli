# Test d'inscription EcoDeli - PowerShell
$body = @{
    email = "client@test.com"
    password = "Test123!"
    confirmPassword = "Test123!"
    firstName = "Test"
    lastName = "Client"
    role = "CLIENT"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "Test d'inscription CLIENT..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -Headers $headers
    Write-Host "✅ Inscription réussie:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erreur inscription:" -ForegroundColor Red
    $_.Exception.Message
    if ($_.Exception.Response) {
        $_.Exception.Response.StatusCode
    }
} 