# Test EcoDeli Workflow
# Script de test pour le workflow complet EcoDeli

$baseUrl = "http://172.30.80.1:3000"
$cookieContainer = @{}

function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [string]$ContentType = "application/json"
    )
    
    try {
        $params = @{
            Method = $Method
            Uri = $Uri
            Headers = $Headers
            ContentType = $ContentType
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "URI: $Uri" -ForegroundColor Yellow
        if ($_.Exception.Response) {
            Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        }
        return $null
    }
}

function Test-Authentication {
    param([string]$email, [string]$password, [string]$role)
    
    Write-Host "🔐 Test authentification $role : $email" -ForegroundColor Cyan
    
    $loginData = @{
        email = $email
        password = $password
    } | ConvertTo-Json
    
    $response = Invoke-ApiRequest -Method "POST" -Uri "$baseUrl/api/auth/login" -Body $loginData
    
    if ($response) {
        Write-Host "✅ Authentification réussie pour $role" -ForegroundColor Green
        return $response
    } else {
        Write-Host "❌ Échec authentification $role" -ForegroundColor Red
        return $null
    }
}

function Test-ClientAnnouncement {
    param([hashtable]$authHeaders)
    
    Write-Host "📦 Test création annonce client" -ForegroundColor Cyan
    
    $announcementData = @{
        title = "Livraison courses Marseille"
        description = "Livraison de courses alimentaires depuis Carrefour"
        type = "PACKAGE"
        pickupAddress = "Avenue du Prado, 13006 Marseille"
        deliveryAddress = "Rue Saint-Ferréol, 13001 Marseille"
        scheduledPickupDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        scheduledDeliveryDate = (Get-Date).AddDays(1).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        price = 15.00
        urgentMode = $false
        packageDetails = @{
            weight = 2.5
            dimensions = "30x20x15"
            fragile = $false
        }
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-ApiRequest -Method "POST" -Uri "$baseUrl/api/client/announcements" -Headers $authHeaders -Body $announcementData
    
    if ($response -and $response.id) {
        Write-Host "✅ Annonce créée avec ID: $($response.id)" -ForegroundColor Green
        return $response.id
    } else {
        Write-Host "❌ Échec création annonce" -ForegroundColor Red
        return $null
    }
}

function Test-DelivererOpportunities {
    param([hashtable]$authHeaders)
    
    Write-Host "🚚 Test récupération opportunités livreur" -ForegroundColor Cyan
    
    $response = Invoke-ApiRequest -Method "GET" -Uri "$baseUrl/api/deliverer/opportunities" -Headers $authHeaders
    
    if ($response -and $response.length -gt 0) {
        Write-Host "✅ $($response.length) opportunités trouvées" -ForegroundColor Green
        return $response[0].id
    } else {
        Write-Host "❌ Aucune opportunité trouvée" -ForegroundColor Red
        return $null
    }
}

function Test-AcceptOpportunity {
    param([hashtable]$authHeaders, [string]$opportunityId)
    
    Write-Host "✋ Test acceptation opportunité: $opportunityId" -ForegroundColor Cyan
    
    $response = Invoke-ApiRequest -Method "POST" -Uri "$baseUrl/api/deliverer/opportunities/$opportunityId/accept" -Headers $authHeaders
    
    if ($response) {
        Write-Host "✅ Opportunité acceptée" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Échec acceptation opportunité" -ForegroundColor Red
        return $false
    }
}

function Test-DeliveryValidation {
    param([hashtable]$authHeaders, [string]$deliveryId)
    
    Write-Host "📋 Test validation livraison: $deliveryId" -ForegroundColor Cyan
    
    $validationData = @{
        validationCode = "123456"
        photos = @()
        notes = "Livraison effectuée sans problème"
    } | ConvertTo-Json
    
    $response = Invoke-ApiRequest -Method "POST" -Uri "$baseUrl/api/deliverer/deliveries/$deliveryId/validate" -Headers $authHeaders -Body $validationData
    
    if ($response) {
        Write-Host "✅ Livraison validée" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Échec validation livraison" -ForegroundColor Red
        return $false
    }
}

function Test-PaymentProcessing {
    param([hashtable]$authHeaders, [string]$announcementId)
    
    Write-Host "💳 Test traitement paiement: $announcementId" -ForegroundColor Cyan
    
    $response = Invoke-ApiRequest -Method "POST" -Uri "$baseUrl/api/client/announcements/$announcementId/pay-from-wallet" -Headers $authHeaders
    
    if ($response) {
        Write-Host "✅ Paiement traité" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Échec traitement paiement" -ForegroundColor Red
        return $false
    }
}

function Test-ProviderBilling {
    param([hashtable]$authHeaders)
    
    Write-Host "📊 Test facturation prestataire" -ForegroundColor Cyan
    
    $response = Invoke-ApiRequest -Method "GET" -Uri "$baseUrl/api/provider/earnings" -Headers $authHeaders
    
    if ($response) {
        Write-Host "✅ Données facturation récupérées" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Échec récupération facturation" -ForegroundColor Red
        return $false
    }
}

function Test-AdminMonitoring {
    param([hashtable]$authHeaders)
    
    Write-Host "🔍 Test monitoring admin" -ForegroundColor Cyan
    
    $response = Invoke-ApiRequest -Method "GET" -Uri "$baseUrl/api/admin/dashboard" -Headers $authHeaders
    
    if ($response) {
        Write-Host "✅ Dashboard admin accessible" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Échec accès dashboard admin" -ForegroundColor Red
        return $false
    }
}

# Début du test workflow
Write-Host "🚀 Démarrage test workflow EcoDeli" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Yellow

# Test authentification pour chaque rôle
$clientAuth = Test-Authentication -email "marie.dubois@test.com" -password "password123" -role "CLIENT"
$delivererAuth = Test-Authentication -email "thomas.moreau@test.com" -password "password123" -role "DELIVERER"
$providerAuth = Test-Authentication -email "jean.martin@test.com" -password "password123" -role "PROVIDER"
$adminAuth = Test-Authentication -email "admin@ecodeli.com" -password "admin123" -role "ADMIN"

if (-not $clientAuth -or -not $delivererAuth -or -not $providerAuth -or -not $adminAuth) {
    Write-Host "❌ Échec authentification - Arrêt du test" -ForegroundColor Red
    exit 1
}

# Headers d'authentification
$clientHeaders = @{ "Authorization" = "Bearer $($clientAuth.token)" }
$delivererHeaders = @{ "Authorization" = "Bearer $($delivererAuth.token)" }
$providerHeaders = @{ "Authorization" = "Bearer $($providerAuth.token)" }
$adminHeaders = @{ "Authorization" = "Bearer $($adminAuth.token)" }

# Test workflow complet
Write-Host "`n📋 Phase 1: Création annonce client" -ForegroundColor Yellow
$announcementId = Test-ClientAnnouncement -authHeaders $clientHeaders

if ($announcementId) {
    Write-Host "`n🚚 Phase 2: Récupération opportunités livreur" -ForegroundColor Yellow
    $opportunityId = Test-DelivererOpportunities -authHeaders $delivererHeaders
    
    if ($opportunityId) {
        Write-Host "`n✋ Phase 3: Acceptation opportunité" -ForegroundColor Yellow
        $accepted = Test-AcceptOpportunity -authHeaders $delivererHeaders -opportunityId $opportunityId
        
        if ($accepted) {
            Write-Host "`n📋 Phase 4: Validation livraison" -ForegroundColor Yellow
            $validated = Test-DeliveryValidation -authHeaders $delivererHeaders -deliveryId $opportunityId
            
            if ($validated) {
                Write-Host "`n💳 Phase 5: Traitement paiement" -ForegroundColor Yellow
                $paid = Test-PaymentProcessing -authHeaders $clientHeaders -announcementId $announcementId
                
                if ($paid) {
                    Write-Host "`n📊 Phase 6: Facturation prestataire" -ForegroundColor Yellow
                    Test-ProviderBilling -authHeaders $providerHeaders
                    
                    Write-Host "`n🔍 Phase 7: Monitoring admin" -ForegroundColor Yellow
                    Test-AdminMonitoring -authHeaders $adminHeaders
                }
            }
        }
    }
}

Write-Host "`n===========================================" -ForegroundColor Yellow
Write-Host "✅ Test workflow EcoDeli terminé" -ForegroundColor Green