# Script PowerShell pour tester toutes les pages client avec les comptes seed
# Compatible Windows - Test exhaustif de toutes les pages

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Locale = "fr",
    [string]$OutputFile = "client-pages-test-results.html"
)

# Configuration
$ErrorActionPreference = "SilentlyContinue"

# Comptes client de test (seed)
$ClientAccounts = @(
    @{ Email = "client1@test.com"; Password = "Test123!"; Name = "Marie Dubois" }
    @{ Email = "client2@test.com"; Password = "Test123!"; Name = "Jean Martin" }
    @{ Email = "client3@test.com"; Password = "Test123!"; Name = "Sophie Bernard" }
    @{ Email = "client4@test.com"; Password = "Test123!"; Name = "Pierre Leroy" }
    @{ Email = "client5@test.com"; Password = "Test123!"; Name = "Emma Petit" }
)

# TOUTES les pages client frontend (exhaustif)
$ClientPages = @(
    "/client",
    "/client/announcements",
    "/client/announcements/create",
    "/client/bookings",
    "/client/deliveries", 
    "/client/payments",
    "/client/profile",
    "/client/services",
    "/client/storage",
    "/client/subscription",
    "/client/tracking",
    "/client/notifications",
    "/client/service-requests",
    "/client/tutorial"
)

# TOUS les endpoints API client (exhaustif)
$ApiEndpoints = @(
    # Dashboard & Profile
    "/api/client/dashboard",
    "/api/client/profile",
    
    # Announcements
    "/api/client/announcements",
    "/api/client/announcements/stats",
    
    # Bookings
    "/api/client/bookings",
    "/api/client/bookings/available-slots",
    
    # Deliveries
    "/api/client/deliveries",
    
    # Payments
    "/api/client/payments",
    "/api/client/payments/export",
    
    # Orders & Reviews
    "/api/client/orders",
    "/api/client/reviews",
    
    # Services
    "/api/client/services",
    "/api/client/service-requests",
    
    # Storage
    "/api/client/storage-boxes",
    "/api/client/storage-boxes/nearby",
    "/api/client/storage-boxes/rentals",
    
    # Subscription & Tutorial
    "/api/client/subscription",
    "/api/client/tutorial",
    "/api/client/tutorial/check",
    
    # Notifications
    "/api/client/notifications"
)

# Pages avec paramètres dynamiques (nécessitent des IDs)
$DynamicPages = @(
    @{ Path = "/client/announcements/[id]"; Description = "Voir annonce spécifique" }
    @{ Path = "/client/announcements/[id]/edit"; Description = "Modifier annonce" }
    @{ Path = "/client/announcements/[id]/payment"; Description = "Paiement annonce" }
    @{ Path = "/client/announcements/[id]/tracking"; Description = "Suivi annonce" }
    @{ Path = "/client/bookings/[id]"; Description = "Voir réservation" }
    @{ Path = "/client/deliveries/[id]/payment-success"; Description = "Succès paiement" }
    @{ Path = "/client/payments/[deliveryId]"; Description = "Paiement livraison" }
)

# APIs avec paramètres dynamiques
$DynamicApiEndpoints = @(
    @{ Path = "/api/client/announcements/[id]"; Description = "API annonce spécifique" }
    @{ Path = "/api/client/announcements/[id]/cancel"; Description = "Annuler annonce" }
    @{ Path = "/api/client/announcements/[id]/create-payment-intent"; Description = "Intent paiement" }
    @{ Path = "/api/client/announcements/[id]/invoice"; Description = "Facture annonce" }
    @{ Path = "/api/client/announcements/[id]/pay-from-wallet"; Description = "Paiement wallet" }
    @{ Path = "/api/client/announcements/[id]/payment"; Description = "Traitement paiement" }
    @{ Path = "/api/client/announcements/[id]/tracking"; Description = "API suivi" }
    @{ Path = "/api/client/announcements/[id]/validate"; Description = "Valider annonce" }
    @{ Path = "/api/client/announcements/[id]/validation-code"; Description = "Code validation" }
    @{ Path = "/api/client/bookings/[id]"; Description = "API réservation" }
    @{ Path = "/api/client/bookings/[id]/cancel"; Description = "Annuler réservation" }
    @{ Path = "/api/client/bookings/[id]/messages"; Description = "Messages réservation" }
    @{ Path = "/api/client/bookings/[id]/rate"; Description = "Noter réservation" }
    @{ Path = "/api/client/deliveries/[id]/cancel"; Description = "Annuler livraison" }
    @{ Path = "/api/client/deliveries/[id]/confirm"; Description = "Confirmer livraison" }
    @{ Path = "/api/client/deliveries/[id]/rate"; Description = "Noter livraison" }
    @{ Path = "/api/client/deliveries/[id]/tracking"; Description = "Suivi livraison" }
    @{ Path = "/api/client/storage-boxes/[id]"; Description = "Box stockage spécifique" }
    @{ Path = "/api/client/storage-boxes/rentals/[id]/extend"; Description = "Étendre location" }
)

# Variables globales pour les résultats
$TestResults = @()
$SessionData = @{}

# Fonction pour créer une session web
function New-WebSession {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    return $session
}

# Fonction pour se connecter et obtenir une session
function Connect-ClientAccount {
    param(
        [hashtable]$Account
    )
    
    Write-Host "🔐 Connexion à $($Account.Email)..." -ForegroundColor Yellow
    
    try {
        $loginData = @{
            email = $Account.Email
            password = $Account.Password
        } | ConvertTo-Json
        
        $session = New-WebSession
        
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -WebSession $session -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Connexion réussie pour $($Account.Email)" -ForegroundColor Green
            return $session
        } else {
            Write-Host "❌ Échec connexion $($Account.Email) - Status: $($response.StatusCode)" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ Erreur connexion $($Account.Email): $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour tester une URL
function Test-Url {
    param(
        [string]$Url,
        [object]$WebSession,
        [string]$AccountEmail,
        [string]$Type = "Page"
    )
    
    $startTime = Get-Date
    
    try {
        $response = Invoke-WebRequest -Uri $Url -WebSession $WebSession -UseBasicParsing -TimeoutSec 30
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $status = switch ($response.StatusCode) {
            200 { "✅ Succès" }
            302 { "🔄 Redirection" }
            401 { "🔒 Non autorisé" }
            403 { "🚫 Accès interdit" }
            404 { "🔍 Non trouvé" }
            500 { "💥 Erreur serveur" }
            default { "❓ Status $($response.StatusCode)" }
        }
        
        Write-Host "$status - $Url ($($duration)ms)" -ForegroundColor $(if ($response.StatusCode -eq 200) { "Green" } else { "Yellow" })
        
        return @{
            Url = $Url
            StatusCode = $response.StatusCode
            Status = $status
            Duration = $duration
            Size = $response.Content.Length
            Account = $AccountEmail
            Type = $Type
            Success = ($response.StatusCode -eq 200)
            Error = $null
        }
    }
    catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        
        Write-Host "❌ Erreur - $Url ($($duration)ms) - $($_.Exception.Message)" -ForegroundColor Red
        
        return @{
            Url = $Url
            StatusCode = $statusCode
            Status = "❌ Erreur"
            Duration = $duration
            Size = 0
            Account = $AccountEmail
            Type = $Type
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Fonction pour obtenir des IDs de test depuis l'API
function Get-TestIds {
    param(
        [object]$WebSession,
        [string]$AccountEmail
    )
    
    Write-Host "🔍 Récupération des IDs de test pour $AccountEmail..." -ForegroundColor Cyan
    
    $ids = @{
        AnnouncementId = $null
        BookingId = $null
        DeliveryId = $null
        StorageBoxId = $null
    }
    
    try {
        # Essayer de récupérer une annonce
        $announcements = Invoke-WebRequest -Uri "$BaseUrl/api/client/announcements" -WebSession $WebSession -UseBasicParsing
        if ($announcements.StatusCode -eq 200) {
            $announcementsData = $announcements.Content | ConvertFrom-Json
            if ($announcementsData.announcements -and $announcementsData.announcements.Count -gt 0) {
                $ids.AnnouncementId = $announcementsData.announcements[0].id
                Write-Host "  📝 Annonce ID: $($ids.AnnouncementId)" -ForegroundColor Gray
            }
        }
        
        # Essayer de récupérer une réservation
        $bookings = Invoke-WebRequest -Uri "$BaseUrl/api/client/bookings" -WebSession $WebSession -UseBasicParsing
        if ($bookings.StatusCode -eq 200) {
            $bookingsData = $bookings.Content | ConvertFrom-Json
            if ($bookingsData.bookings -and $bookingsData.bookings.Count -gt 0) {
                $ids.BookingId = $bookingsData.bookings[0].id
                Write-Host "  📅 Réservation ID: $($ids.BookingId)" -ForegroundColor Gray
            }
        }
        
        # Essayer de récupérer une livraison
        $deliveries = Invoke-WebRequest -Uri "$BaseUrl/api/client/deliveries" -WebSession $WebSession -UseBasicParsing
        if ($deliveries.StatusCode -eq 200) {
            $deliveriesData = $deliveries.Content | ConvertFrom-Json
            if ($deliveriesData.deliveries -and $deliveriesData.deliveries.Count -gt 0) {
                $ids.DeliveryId = $deliveriesData.deliveries[0].id
                Write-Host "  🚚 Livraison ID: $($ids.DeliveryId)" -ForegroundColor Gray
            }
        }
        
        # Essayer de récupérer une box de stockage
        $storageBoxes = Invoke-WebRequest -Uri "$BaseUrl/api/client/storage-boxes" -WebSession $WebSession -UseBasicParsing
        if ($storageBoxes.StatusCode -eq 200) {
            $storageBoxesData = $storageBoxes.Content | ConvertFrom-Json
            if ($storageBoxesData.storageBoxes -and $storageBoxesData.storageBoxes.Count -gt 0) {
                $ids.StorageBoxId = $storageBoxesData.storageBoxes[0].id
                Write-Host "  📦 Box stockage ID: $($ids.StorageBoxId)" -ForegroundColor Gray
            }
        }
    }
    catch {
        Write-Host "  ⚠️ Erreur lors de la récupération des IDs: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    return $ids
}

# Fonction pour tester les pages dynamiques
function Test-DynamicPages {
    param(
        [object]$WebSession,
        [string]$AccountEmail,
        [hashtable]$TestIds
    )
    
    Write-Host "🔗 Test des pages dynamiques pour $AccountEmail..." -ForegroundColor Cyan
    
    foreach ($page in $DynamicPages) {
        $testUrl = $null
        
        if ($page.Path -like "*announcements*" -and $TestIds.AnnouncementId) {
            $testUrl = $page.Path -replace "\[id\]", $TestIds.AnnouncementId
        }
        elseif ($page.Path -like "*bookings*" -and $TestIds.BookingId) {
            $testUrl = $page.Path -replace "\[id\]", $TestIds.BookingId
        }
        elseif ($page.Path -like "*deliveries*" -and $TestIds.DeliveryId) {
            $testUrl = $page.Path -replace "\[deliveryId\]|\[id\]", $TestIds.DeliveryId
        }
        elseif ($page.Path -like "*storage-boxes*" -and $TestIds.StorageBoxId) {
            $testUrl = $page.Path -replace "\[id\]", $TestIds.StorageBoxId
        }
        
        if ($testUrl) {
            $fullUrl = "$BaseUrl/$Locale$testUrl"
            $result = Test-Url -Url $fullUrl -WebSession $WebSession -AccountEmail $AccountEmail -Type "Page Dynamique"
            $TestResults += $result
        } else {
            Write-Host "  ⚠️ Impossible de tester $($page.Path) - ID manquant" -ForegroundColor Yellow
            $TestResults += @{
                Url = "$BaseUrl/$Locale$($page.Path)"
                StatusCode = 0
                Status = "⚠️ ID manquant"
                Duration = 0
                Size = 0
                Account = $AccountEmail
                Type = "Page Dynamique"
                Success = $false
                Error = "ID manquant pour le test"
            }
        }
    }
}

# Fonction pour tester les APIs dynamiques
function Test-DynamicApis {
    param(
        [object]$WebSession,
        [string]$AccountEmail,
        [hashtable]$TestIds
    )
    
    Write-Host "🔌 Test des APIs dynamiques pour $AccountEmail..." -ForegroundColor Cyan
    
    foreach ($api in $DynamicApiEndpoints) {
        $testUrl = $null
        
        if ($api.Path -like "*announcements*" -and $TestIds.AnnouncementId) {
            $testUrl = $api.Path -replace "\[id\]", $TestIds.AnnouncementId
        }
        elseif ($api.Path -like "*bookings*" -and $TestIds.BookingId) {
            $testUrl = $api.Path -replace "\[id\]", $TestIds.BookingId
        }
        elseif ($api.Path -like "*deliveries*" -and $TestIds.DeliveryId) {
            $testUrl = $api.Path -replace "\[deliveryId\]|\[id\]", $TestIds.DeliveryId
        }
        elseif ($api.Path -like "*storage-boxes*" -and $TestIds.StorageBoxId) {
            $testUrl = $api.Path -replace "\[id\]", $TestIds.StorageBoxId
        }
        
        if ($testUrl) {
            $fullUrl = "$BaseUrl$testUrl"
            $result = Test-Url -Url $fullUrl -WebSession $WebSession -AccountEmail $AccountEmail -Type "API Dynamique"
            $TestResults += $result
        } else {
            Write-Host "  ⚠️ Impossible de tester $($api.Path) - ID manquant" -ForegroundColor Yellow
            $TestResults += @{
                Url = "$BaseUrl$($api.Path)"
                StatusCode = 0
                Status = "⚠️ ID manquant"
                Duration = 0
                Size = 0
                Account = $AccountEmail
                Type = "API Dynamique"
                Success = $false
                Error = "ID manquant pour le test"
            }
        }
    }
}

# Fonction pour générer le rapport HTML
function Generate-HtmlReport {
    param(
        [array]$Results
    )
    
    $html = @"
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Test - Pages Client EcoDeli</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c5aa0; text-align: center; margin-bottom: 30px; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .status-success { color: #27ae60; font-weight: bold; }
        .status-error { color: #e74c3c; font-weight: bold; }
        .status-warning { color: #f39c12; font-weight: bold; }
        .account-section { margin: 40px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .filter-buttons { margin: 20px 0; }
        .filter-btn { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; background: #3498db; color: white; }
        .filter-btn.active { background: #2980b9; }
        .hidden { display: none; }
        .progress-bar { width: 100%; height: 6px; background: #ecf0f1; border-radius: 3px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #27ae60, #2ecc71); transition: width 0.3s; }
    </style>
    <script>
        function filterTable(type) {
            const rows = document.querySelectorAll('tbody tr');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            rows.forEach(row => {
                if (type === 'all' || row.dataset.type === type) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        
        function filterByStatus(status) {
            const rows = document.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (status === 'all' || row.dataset.success === status) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    </script>
</head>
<body>
    <div class="container">
        <h1>🚀 Rapport de Test - Pages Client EcoDeli</h1>
        <p style="text-align: center; color: #7f8c8d;">
            <strong>Date:</strong> $(Get-Date -Format "dd/MM/yyyy HH:mm:ss") | 
            <strong>URL:</strong> $BaseUrl | 
            <strong>Locale:</strong> $Locale
        </p>
"@

    # Statistiques générales
    $totalTests = $Results.Count
    $successCount = ($Results | Where-Object { $_.Success }).Count
    $errorCount = $totalTests - $successCount
    $avgDuration = if ($Results.Count -gt 0) { [math]::Round(($Results | Measure-Object -Property Duration -Average).Average, 2) } else { 0 }
    $successRate = if ($totalTests -gt 0) { [math]::Round(($successCount / $totalTests * 100), 1) } else { 0 }

    $html += @"
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">$totalTests</div>
                <div class="stat-label">Tests Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$successCount</div>
                <div class="stat-label">Succès</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$errorCount</div>
                <div class="stat-label">Erreurs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$successRate%</div>
                <div class="stat-label">Taux de Succès</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgDuration}ms</div>
                <div class="stat-label">Temps Moyen</div>
            </div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: $successRate%"></div>
        </div>
"@

    # Filtres
    $html += @"
        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterTable('all')">Tous</button>
            <button class="filter-btn" onclick="filterTable('Page')">Pages</button>
            <button class="filter-btn" onclick="filterTable('API')">API</button>
            <button class="filter-btn" onclick="filterTable('Page Dynamique')">Pages Dynamiques</button>
            <button class="filter-btn" onclick="filterTable('API Dynamique')">API Dynamiques</button>
            <button class="filter-btn" onclick="filterByStatus('true')">Succès</button>
            <button class="filter-btn" onclick="filterByStatus('false')">Erreurs</button>
        </div>
"@

    # Tableau des résultats
    $html += @"
        <h2>📊 Résultats Détaillés</h2>
        <table>
            <thead>
                <tr>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Code</th>
                    <th>Durée</th>
                    <th>Taille</th>
                    <th>Compte</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
"@

    foreach ($result in $Results) {
        $statusClass = if ($result.Success) { "status-success" } else { "status-error" }
        $sizeFormatted = if ($result.Size -gt 0) { "$([math]::Round($result.Size/1024, 1)) KB" } else { "-" }
        $durationFormatted = "$([math]::Round($result.Duration, 0))ms"
        
        $html += @"
                <tr data-type="$($result.Type)" data-success="$($result.Success.ToString().ToLower())">
                    <td style="font-family: monospace; font-size: 0.9em;">$($result.Url)</td>
                    <td class="$statusClass">$($result.Status)</td>
                    <td>$($result.StatusCode)</td>
                    <td>$durationFormatted</td>
                    <td>$sizeFormatted</td>
                    <td>$($result.Account)</td>
                    <td>$($result.Type)</td>
                </tr>
"@
    }

    $html += @"
            </tbody>
        </table>
    </div>
</body>
</html>
"@

    return $html
}

# DÉBUT DU SCRIPT PRINCIPAL
Write-Host "🚀 DÉBUT DES TESTS CLIENT - EcoDeli" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📅 Date: $(Get-Date)" -ForegroundColor Gray
Write-Host "🌐 URL: $BaseUrl" -ForegroundColor Gray
Write-Host "🗣️ Locale: $Locale" -ForegroundColor Gray
Write-Host "📊 Comptes à tester: $($ClientAccounts.Count)" -ForegroundColor Gray
Write-Host "📄 Pages statiques: $($ClientPages.Count)" -ForegroundColor Gray
Write-Host "🔌 APIs statiques: $($ApiEndpoints.Count)" -ForegroundColor Gray
Write-Host "🔗 Pages dynamiques: $($DynamicPages.Count)" -ForegroundColor Gray
Write-Host "⚡ APIs dynamiques: $($DynamicApiEndpoints.Count)" -ForegroundColor Gray
Write-Host "=" * 60 -ForegroundColor Cyan

# Test pour chaque compte client
foreach ($account in $ClientAccounts) {
    Write-Host ""
    Write-Host "👤 TESTS POUR: $($account.Name) ($($account.Email))" -ForegroundColor Magenta
    Write-Host "-" * 50 -ForegroundColor Magenta
    
    # Connexion
    $session = Connect-ClientAccount -Account $account
    
    if ($session) {
        # 1. Test des pages statiques
        Write-Host "🌐 Test des pages statiques..." -ForegroundColor Cyan
        foreach ($page in $ClientPages) {
            $fullUrl = "$BaseUrl/$Locale$page"
            $result = Test-Url -Url $fullUrl -WebSession $session -AccountEmail $account.Email -Type "Page"
            $TestResults += $result
        }
        
        # 2. Test des APIs statiques
        Write-Host "🔌 Test des APIs statiques..." -ForegroundColor Cyan
        foreach ($endpoint in $ApiEndpoints) {
            $fullUrl = "$BaseUrl$endpoint"
            $result = Test-Url -Url $fullUrl -WebSession $session -AccountEmail $account.Email -Type "API"
            $TestResults += $result
        }
        
        # 3. Récupération des IDs pour les tests dynamiques
        $testIds = Get-TestIds -WebSession $session -AccountEmail $account.Email
        
        # 4. Test des pages dynamiques
        Test-DynamicPages -WebSession $session -AccountEmail $account.Email -TestIds $testIds
        
        # 5. Test des APIs dynamiques
        Test-DynamicApis -WebSession $session -AccountEmail $account.Email -TestIds $testIds
        
        Write-Host "✅ Tests terminés pour $($account.Email)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Impossible de tester $($account.Email) - connexion échouée" -ForegroundColor Red
    }
}

# Génération du rapport final
Write-Host ""
Write-Host "📊 GÉNÉRATION DU RAPPORT..." -ForegroundColor Cyan
$htmlReport = Generate-HtmlReport -Results $TestResults
$htmlReport | Out-File -FilePath $OutputFile -Encoding UTF8

# Statistiques finales
Write-Host ""
Write-Host "✅ TESTS TERMINÉS!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
$totalTests = $TestResults.Count
$successCount = ($TestResults | Where-Object { $_.Success }).Count
$errorCount = $totalTests - $successCount
$successRate = if ($totalTests -gt 0) { [math]::Round(($successCount / $totalTests * 100), 1) } else { 0 }

Write-Host "📊 RÉSUMÉ FINAL:" -ForegroundColor Yellow
Write-Host "  • Tests total: $totalTests" -ForegroundColor White
Write-Host "  • Succès: $successCount" -ForegroundColor Green
Write-Host "  • Erreurs: $errorCount" -ForegroundColor Red
Write-Host "  • Taux de succès: $successRate%" -ForegroundColor $(if ($successRate -gt 80) { "Green" } else { "Yellow" })
Write-Host "  • Rapport HTML: $OutputFile" -ForegroundColor Cyan

# Détail par type de test
$pageResults = $TestResults | Where-Object { $_.Type -eq "Page" }
$apiResults = $TestResults | Where-Object { $_.Type -eq "API" }
$dynamicPageResults = $TestResults | Where-Object { $_.Type -eq "Page Dynamique" }
$dynamicApiResults = $TestResults | Where-Object { $_.Type -eq "API Dynamique" }

Write-Host ""
Write-Host "📈 DÉTAIL PAR TYPE:" -ForegroundColor Yellow
Write-Host "  • Pages statiques: $($pageResults.Count) tests, $(($pageResults | Where-Object { $_.Success }).Count) succès" -ForegroundColor White
Write-Host "  • APIs statiques: $($apiResults.Count) tests, $(($apiResults | Where-Object { $_.Success }).Count) succès" -ForegroundColor White
Write-Host "  • Pages dynamiques: $($dynamicPageResults.Count) tests, $(($dynamicPageResults | Where-Object { $_.Success }).Count) succès" -ForegroundColor White
Write-Host "  • APIs dynamiques: $($dynamicApiResults.Count) tests, $(($dynamicApiResults | Where-Object { $_.Success }).Count) succès" -ForegroundColor White

Write-Host ""
Write-Host "🌐 Ouvrir le rapport: $OutputFile" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Green

# Optionnel: ouvrir automatiquement le rapport
if (Test-Path $OutputFile) {
    $openReport = Read-Host "Voulez-vous ouvrir le rapport maintenant? (o/N)"
    if ($openReport -eq "o" -or $openReport -eq "O") {
        Start-Process $OutputFile
    }
}