# Test de l'authentification EcoDeli avec comptes seeds
Write-Host "🔄 Test de l'authentification EcoDeli..." -ForegroundColor Green

# 1. Test de connexion client
Write-Host "`n1. Connexion client-complete@test.com..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"client-complete@test.com","password":"Test123!"}' `
    -SessionVariable session

Write-Host "Réponse connexion:" -ForegroundColor Blue
$loginResponse | ConvertTo-Json -Depth 3

# 2. Test de récupération de session
Write-Host "`n2. Récupération de la session..." -ForegroundColor Yellow
$sessionResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/get-session" `
    -Method GET `
    -WebSession $session

Write-Host "Session récupérée:" -ForegroundColor Blue
$sessionResponse | ConvertTo-Json -Depth 3

# 3. Test API client dashboard
Write-Host "`n3. Test API client dashboard..." -ForegroundColor Yellow
$dashboardResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/client/dashboard" `
    -Method GET `
    -WebSession $session

Write-Host "Dashboard client:" -ForegroundColor Blue
$dashboardResponse | ConvertTo-Json -Depth 3

Write-Host "`n✅ Tests terminés" -ForegroundColor Green 