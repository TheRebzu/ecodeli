# Script PowerShell pour tester l'API Client Announcements
# Usage: .\test-api-powershell.ps1

Write-Host "🧪 Test API Client Announcements avec PowerShell" -ForegroundColor Cyan
Write-Host "================================================="

try {
    # 1. Connexion
    Write-Host "1️⃣ Connexion avec client-complete@test.com..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = "client-complete@test.com"
        password = "Test123!"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in/email" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    
    Write-Host "✅ Connexion réussie!" -ForegroundColor Green
    
    # 2. Test GET announcements
    Write-Host ""
    Write-Host "2️⃣ Test GET /api/client/announcements..." -ForegroundColor Yellow
    
    $getResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/client/announcements" -Method GET -WebSession $session
    
    Write-Host "✅ GET réussi - Total annonces: $($getResponse.announcements.Count)" -ForegroundColor Green
    
    # 3. Test POST nouvelle annonce avec packageDetails complets
    Write-Host ""
    Write-Host "3️⃣ Test POST annonce complète avec packageDetails..." -ForegroundColor Yellow
    
    $announcementBody = @{
        title = "Test Livraison Paris-Lyon"
        description = "Besoin de livrer un colis important de Paris vers Lyon dans les meilleurs délais"
        type = "PACKAGE_DELIVERY"
        startLocation = @{
            address = "123 Rue de Rivoli, 75001 Paris"
            city = "Paris"
            postalCode = "75001"
            country = "FR"
        }
        endLocation = @{
            address = "456 Rue de la République, 69002 Lyon"
            city = "Lyon"
            postalCode = "69002"
            country = "FR"
        }
        desiredDate = "2025-06-30T14:00:00.000Z"
        price = 45.50
        currency = "EUR"
        urgent = $false
        packageDetails = @{
            weight = 2.5
            length = 30
            width = 20
            height = 15
            fragile = $true
            requiresInsurance = $true
            insuredValue = 200
            content = "Documents importants et produits électroniques"
            specialHandling = "Manipuler avec précaution"
        }
    } | ConvertTo-Json -Depth 10
    
    $postResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/client/announcements" -Method POST -Body $announcementBody -ContentType "application/json" -WebSession $session
    
    Write-Host "✅ POST réussi - ID annonce: $($postResponse.announcement.id)" -ForegroundColor Green
    
    # 4. Test GET pour vérifier la création
    Write-Host ""
    Write-Host "4️⃣ Vérification - GET après création..." -ForegroundColor Yellow
    
    $verifyResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/client/announcements" -Method GET -WebSession $session
    
    Write-Host "✅ Vérification réussie - Total annonces: $($verifyResponse.announcements.Count)" -ForegroundColor Green
    
    if ($verifyResponse.announcements.Count -gt 0) {
        $lastAnnouncement = $verifyResponse.announcements[0]
        Write-Host "📦 Dernière annonce: $($lastAnnouncement.title)" -ForegroundColor Cyan
        Write-Host "📍 De: $($lastAnnouncement.startLocation.city) vers $($lastAnnouncement.endLocation.city)" -ForegroundColor Cyan
        Write-Host "💰 Prix: $($lastAnnouncement.price)€" -ForegroundColor Cyan
    }

} catch {
    Write-Host ""
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Détails: " -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "💡 COMPTES DE TEST DISPONIBLES:" -ForegroundColor Magenta
Write-Host "👤 client-complete@test.com" -ForegroundColor White
Write-Host "🚚 deliverer@test.com" -ForegroundColor White  
Write-Host "🏪 merchant@test.com" -ForegroundColor White
Write-Host "🔧 provider@test.com" -ForegroundColor White
Write-Host "👨‍💼 admin@test.com" -ForegroundColor White
Write-Host "🔑 Mot de passe pour tous: Test123!" -ForegroundColor Yellow 