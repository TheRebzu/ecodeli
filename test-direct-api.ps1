# Test direct de l'API session
Write-Host "Test direct API session..." -ForegroundColor Green

# 1. Se connecter d'abord
Write-Host "`n1. Connexion client-complete@test.com..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"client-complete@test.com","password":"Test123!"}' `
    -SessionVariable session

Write-Host "Connexion réussie, token: $($loginResponse.token)" -ForegroundColor Green

# 2. Récupérer la session avec debug
Write-Host "`n2. Test API get-session..." -ForegroundColor Yellow
$sessionResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/get-session" `
    -Method GET `
    -WebSession $session

Write-Host "Session utilisateur:" -ForegroundColor Blue
Write-Host "- ID: $($sessionResponse.user.id)" -ForegroundColor Gray
Write-Host "- Email: $($sessionResponse.user.email)" -ForegroundColor Gray
Write-Host "- Role: $($sessionResponse.user.role)" -ForegroundColor Cyan
Write-Host "- Active: $($sessionResponse.user.isActive)" -ForegroundColor Gray
Write-Host "- Validation: $($sessionResponse.user.validationStatus)" -ForegroundColor Gray

# 3. Headers de la requête
Write-Host "`n3. Headers de session:" -ForegroundColor Yellow
$session.Headers | Format-Table -AutoSize

Write-Host "`nTest termine" -ForegroundColor Green 