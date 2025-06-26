# Test de création d'un nouvel utilisateur client
Write-Host "🆕 Test création nouvel utilisateur client..." -ForegroundColor Green

# 1. Créer un nouvel utilisateur
$email = "test-client-$(Get-Random)@test.com"
Write-Host "`n1. Création utilisateur: $email" -ForegroundColor Yellow

$registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-up/email" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        email = $email
        password = "Test123!"
        name = "Test Client"
        role = "CLIENT"
    } | ConvertTo-Json) `
    -SessionVariable session

Write-Host "Résultat inscription:" -ForegroundColor Blue
$registerResponse | ConvertTo-Json -Depth 3

# 2. Se connecter
Write-Host "`n2. Connexion avec le nouveau compte..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        email = $email
        password = "Test123!"
    } | ConvertTo-Json) `
    -WebSession $session

Write-Host "Connexion réussie" -ForegroundColor Green

# 3. Test API dashboard
Write-Host "`n3. Test API dashboard client..." -ForegroundColor Yellow
try {
    $dashboardResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/client/dashboard" `
        -Method GET `
        -WebSession $session
    
    Write-Host "Dashboard client:" -ForegroundColor Blue
    $dashboardResponse | ConvertTo-Json -Depth 3
    
    if ($dashboardResponse.client) {
        Write-Host "`n✅ Profil CLIENT créé automatiquement!" -ForegroundColor Green
        Write-Host "   - ID: $($dashboardResponse.client.id)" -ForegroundColor Gray
        Write-Host "   - Plan: $($dashboardResponse.client.subscriptionPlan)" -ForegroundColor Gray
        Write-Host "   - Tutoriel complété: $($dashboardResponse.client.tutorialCompleted)" -ForegroundColor Gray
    } else {
        Write-Host "`n❌ Profil CLIENT non trouvé!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur API dashboard: $_" -ForegroundColor Red
}

Write-Host "`n✅ Test terminé" -ForegroundColor Green 