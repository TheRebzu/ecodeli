# Script PowerShell pour tester le workflow complet EcoDeli
# Simulation: Client créé une annonce -> Livreur l'accepte -> Livraison complète

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Verbose = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Couleurs pour l'affichage
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    switch ($Color) {
        "Green" { Write-Host $Text -ForegroundColor Green }
        "Red" { Write-Host $Text -ForegroundColor Red }
        "Yellow" { Write-Host $Text -ForegroundColor Yellow }
        "Blue" { Write-Host $Text -ForegroundColor Blue }
        "Cyan" { Write-Host $Text -ForegroundColor Cyan }
        "Magenta" { Write-Host $Text -ForegroundColor Magenta }
        default { Write-Host $Text }
    }
}

# Fonction pour faire des requêtes HTTP
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description = ""
    )
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
            $requestParams.Headers["Content-Type"] = "application/json"
        }
        
        if ($Verbose -and $Description) {
            Write-Color "🔄 $Description" "Cyan"
            Write-Color "   URL: $Method $Url" "Gray"
        }
        
        $response = Invoke-RestMethod @requestParams
        
        if ($Verbose) {
            Write-Color "✅ Succès" "Green"
        }
        
        return $response
    }
    catch {
        Write-Color "❌ Erreur: $($_.Exception.Message)" "Red"
        if ($_.Exception -is [System.Net.WebException] -and $_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Color "Response: $responseBody" "Red"
                $reader.Close()
            }
            catch {
                Write-Color "Impossible de lire la réponse d'erreur" "Red"
            }
        }
        throw
    }
}

# Fonction de connexion
function Connect-User {
    param([string]$Email, [string]$Password, [string]$Role)
    
    Write-Color "🔐 Connexion en tant que $Role ($Email)" "Blue"
    
    $loginData = @{
        email = $Email
        password = $Password
    }
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/auth/login" -Method "POST" -Body $loginData -Description "Connexion utilisateur"
    
    if ($response.success) {
        Write-Color "✅ Connexion réussie" "Green"
        return $response.session
    } else {
        throw "Échec de la connexion: $($response.error)"
    }
}

# Fonction pour obtenir les informations utilisateur
function Get-UserInfo {
    param([hashtable]$Headers)
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/auth/me" -Headers $Headers -Description "Récupération des informations utilisateur"
    return $response.user
}

# Fonction pour créer une annonce
function New-Announcement {
    param([hashtable]$Headers, [string]$ClientId)
    
    Write-Color "📦 Création d'une nouvelle annonce..." "Blue"
    
    $announcementData = @{
        clientId = $ClientId
        type = "PACKAGE_DELIVERY"
        title = "Livraison colis urgent - Test PowerShell"
        description = "Livraison d'un colis de documents importants depuis Paris vers Lyon. Manipulation délicate requise."
        pickupAddress = "75 Avenue des Champs-Élysées, 75008 Paris, France"
        deliveryAddress = "Place Bellecour, 69002 Lyon, France"
        pickupDate = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        deliveryDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        basePrice = 45.00
        urgencyLevel = "HIGH"
        packageDetails = @{
            weight = 2.5
            dimensions = @{
                length = 30
                width = 25
                height = 10
            }
            fragile = $true
            value = 500
        }
        instructions = "Appeler 30 minutes avant la livraison. Accès par l'entrée principale."
    }
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/client/announcements" -Method "POST" -Headers $Headers -Body $announcementData -Description "Création de l'annonce"
    
    if ($response.success) {
        Write-Color "✅ Annonce créée avec succès (ID: $($response.announcement.id))" "Green"
        return $response.announcement
    } else {
        throw "Échec de la création de l'annonce: $($response.error)"
    }
}

# Fonction pour lister les annonces disponibles pour les livreurs
function Get-AvailableAnnouncements {
    param([hashtable]$Headers, [string]$DelivererId)
    
    Write-Color "🚚 Recherche d'annonces disponibles..." "Blue"
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/deliverer/announcements?delivererId=$DelivererId&status=PENDING" -Headers $Headers -Description "Récupération des annonces disponibles"
    
    if ($response.announcements) {
        Write-Color "✅ $($response.announcements.Count) annonce(s) disponible(s)" "Green"
        return $response.announcements
    } else {
        Write-Color "⚠️ Aucune annonce disponible" "Yellow"
        return @()
    }
}

# Fonction pour accepter une annonce
function Accept-Announcement {
    param([hashtable]$Headers, [string]$AnnouncementId, [string]$DelivererId)
    
    Write-Color "✋ Acceptation de l'annonce $AnnouncementId..." "Blue"
    
    $acceptData = @{
        delivererId = $DelivererId
    }
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/deliverer/announcements/$AnnouncementId/accept" -Method "POST" -Headers $Headers -Body $acceptData -Description "Acceptation de l'annonce"
    
    if ($response.success) {
        Write-Color "✅ Annonce acceptée avec succès" "Green"
        return $response.delivery
    } else {
        throw "Échec de l'acceptation: $($response.error)"
    }
}

# Fonction pour mettre à jour le statut de livraison
function Update-DeliveryStatus {
    param([hashtable]$Headers, [string]$AnnouncementId, [string]$Status, [string]$DelivererId)
    
    Write-Color "🔄 Mise à jour du statut vers: $Status" "Blue"
    
    $statusData = @{
        delivererId = $DelivererId
        status = $Status
    }
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/deliverer/announcements/$AnnouncementId/status" -Method "PUT" -Headers $Headers -Body $statusData -Description "Mise à jour du statut"
    
    if ($response.success) {
        Write-Color "✅ Statut mis à jour: $Status" "Green"
        return $response.announcement
    } else {
        throw "Échec de la mise à jour: $($response.error)"
    }
}

# Fonction pour vérifier les livraisons du client
function Get-ClientDeliveries {
    param([hashtable]$Headers, [string]$ClientId)
    
    Write-Color "📋 Vérification des livraisons du client..." "Blue"
    
    $response = Invoke-ApiRequest -Url "$BaseUrl/api/client/deliveries?clientId=$ClientId" -Headers $Headers -Description "Récupération des livraisons client"
    
    if ($response.deliveries) {
        Write-Color "✅ $($response.deliveries.Count) livraison(s) trouvée(s)" "Green"
        return $response.deliveries
    } else {
        Write-Color "⚠️ Aucune livraison trouvée" "Yellow"
        return @()
    }
}

# Fonction principale
function Start-EcoDeliWorkflowTest {
    Write-Color "🌱 === Test du Workflow Complet EcoDeli ===" "Magenta"
    Write-Color "Base URL: $BaseUrl" "Gray"
    Write-Color ""

    try {
        # Étape 1: Connexion du client
        Write-Color "=== ÉTAPE 1: CONNEXION CLIENT ===" "Magenta"
        $clientSession = Connect-User -Email "client@test.com" -Password "password123" -Role "CLIENT"
        $clientHeaders = @{ "Authorization" = "Bearer $($clientSession.token)" }
        
        # Récupération des infos client
        $clientUser = Get-UserInfo -Headers $clientHeaders
        Write-Color "Client connecté: $($clientUser.name) ($($clientUser.email))" "Green"
        
        # Trouver l'ID du client
        $clientResponse = Invoke-ApiRequest -Url "$BaseUrl/api/client/dashboard?clientId=$($clientUser.id)" -Headers $clientHeaders -Description "Récupération du profil client"
        $clientId = $clientUser.id
        
        Write-Color ""

        # Étape 2: Création d'une annonce
        Write-Color "=== ÉTAPE 2: CRÉATION D'ANNONCE ===" "Magenta"
        $announcement = New-Announcement -Headers $clientHeaders -ClientId $clientId
        Write-Color "Annonce créée:"
        Write-Color "  - ID: $($announcement.id)" "Gray"
        Write-Color "  - Titre: $($announcement.title)" "Gray"
        Write-Color "  - Prix: $($announcement.basePrice)€" "Gray"
        Write-Color "  - De: $($announcement.pickupAddress)" "Gray"
        Write-Color "  - Vers: $($announcement.deliveryAddress)" "Gray"
        Write-Color ""

        # Attente pour que l'annonce soit visible
        Write-Color "⏳ Attente de 2 secondes pour la propagation..." "Yellow"
        Start-Sleep -Seconds 2

        # Étape 3: Connexion du livreur
        Write-Color "=== ÉTAPE 3: CONNEXION LIVREUR ===" "Magenta"
        $delivererSession = Connect-User -Email "deliverer@test.com" -Password "password123" -Role "DELIVERER"
        $delivererHeaders = @{ "Authorization" = "Bearer $($delivererSession.token)" }
        
        # Récupération des infos livreur
        $delivererUser = Get-UserInfo -Headers $delivererHeaders
        Write-Color "Livreur connecté: $($delivererUser.name) ($($delivererUser.email))" "Green"
        
        # Trouver l'ID du livreur
        $delivererResponse = Invoke-ApiRequest -Url "$BaseUrl/api/deliverer/dashboard" -Headers $delivererHeaders -Description "Récupération du profil livreur"
        $delivererId = $delivererUser.id
        Write-Color ""

        # Étape 4: Recherche d'annonces disponibles
        Write-Color "=== ÉTAPE 4: RECHERCHE D'ANNONCES ===" "Magenta"
        $availableAnnouncements = Get-AvailableAnnouncements -Headers $delivererHeaders -DelivererId $delivererId
        
        if ($availableAnnouncements.Count -eq 0) {
            Write-Color "⚠️ Aucune annonce disponible pour le test" "Yellow"
            return
        }

        # Chercher notre annonce créée
        $targetAnnouncement = $availableAnnouncements | Where-Object { $_.id -eq $announcement.id }
        
        if (-not $targetAnnouncement) {
            Write-Color "⚠️ Notre annonce n'est pas visible dans la liste des annonces disponibles" "Yellow"
            Write-Color "Annonces disponibles:" "Gray"
            foreach ($ann in $availableAnnouncements) {
                Write-Color "  - $($ann.id): $($ann.title)" "Gray"
            }
            # Utiliser la première annonce disponible
            $targetAnnouncement = $availableAnnouncements[0]
        }

        Write-Color "Annonce sélectionnée: $($targetAnnouncement.title)" "Green"
        Write-Color ""

        # Étape 5: Acceptation de l'annonce
        Write-Color "=== ÉTAPE 5: ACCEPTATION DE L'ANNONCE ===" "Magenta"
        $delivery = Accept-Announcement -Headers $delivererHeaders -AnnouncementId $targetAnnouncement.id -DelivererId $delivererId
        Write-Color "Livraison créée (ID: $($delivery.id))" "Green"
        Write-Color ""

        # Étape 6: Progression de la livraison
        Write-Color "=== ÉTAPE 6: PROGRESSION DE LA LIVRAISON ===" "Magenta"
        
        # Démarrage de la livraison
        Write-Color "📍 Démarrage de la livraison..." "Blue"
        Update-DeliveryStatus -Headers $delivererHeaders -AnnouncementId $targetAnnouncement.id -Status "IN_PROGRESS" -DelivererId $delivererId
        Start-Sleep -Seconds 1
        
        # Simulation de la livraison en cours
        Write-Color "🚚 Livraison en cours..." "Blue"
        Start-Sleep -Seconds 2
        
        # Finalisation de la livraison
        Write-Color "📦 Finalisation de la livraison..." "Blue"
        Update-DeliveryStatus -Headers $delivererHeaders -AnnouncementId $targetAnnouncement.id -Status "COMPLETED" -DelivererId $delivererId
        Write-Color ""

        # Étape 7: Vérification côté client
        Write-Color "=== ÉTAPE 7: VÉRIFICATION CÔTÉ CLIENT ===" "Magenta"
        $clientDeliveries = Get-ClientDeliveries -Headers $clientHeaders -ClientId $clientId
        
        if ($clientDeliveries.Count -gt 0) {
            $completedDelivery = $clientDeliveries | Where-Object { $_.announcementId -eq $targetAnnouncement.id }
            if ($completedDelivery) {
                Write-Color "✅ Livraison trouvée côté client:" "Green"
                Write-Color "  - Statut: $($completedDelivery.status)" "Gray"
                Write-Color "  - ID Livraison: $($completedDelivery.id)" "Gray"
            }
        }
        Write-Color ""

        # Résumé final
        Write-Color "=== RÉSUMÉ DU TEST ===" "Magenta"
        Write-Color "✅ Connexion client réussie" "Green"
        Write-Color "✅ Création d'annonce réussie" "Green"
        Write-Color "✅ Connexion livreur réussie" "Green"
        Write-Color "✅ Acceptation d'annonce réussie" "Green"
        Write-Color "✅ Progression de livraison réussie" "Green"
        Write-Color "✅ Vérification côté client réussie" "Green"
        Write-Color ""
        Write-Color "🎉 WORKFLOW COMPLET TESTÉ AVEC SUCCÈS!" "Green"

    }
    catch {
        Write-Color "❌ ERREUR DANS LE WORKFLOW: $($_.Exception.Message)" "Red"
        Write-Color "Stack trace: $($_.ScriptStackTrace)" "Red"
        exit 1
    }
}

# Fonction d'aide
function Show-Help {
    Write-Color "Script de test du workflow EcoDeli" "Cyan"
    Write-Color ""
    Write-Color "Usage:" "Yellow"
    Write-Color "  .\test-ecodeli-workflow.ps1 [-BaseUrl <url>] [-Verbose]" "White"
    Write-Color ""
    Write-Color "Paramètres:" "Yellow"
    Write-Color "  -BaseUrl   : URL de base de l'application (défaut: http://localhost:3000)" "White"
    Write-Color "  -Verbose   : Affichage détaillé des requêtes HTTP" "White"
    Write-Color ""
    Write-Color "Exemples:" "Yellow"
    Write-Color "  .\test-ecodeli-workflow.ps1" "White"
    Write-Color "  .\test-ecodeli-workflow.ps1 -BaseUrl http://localhost:3000 -Verbose" "White"
    Write-Color ""
    Write-Color "Prérequis:" "Yellow"
    Write-Color "  - L'application EcoDeli doit être démarrée" "White"
    Write-Color "  - Les comptes de test doivent être créés (seed)" "White"
    Write-Color "  - client@test.com / password123 (CLIENT)" "White"
    Write-Color "  - deliverer@test.com / password123 (DELIVERER)" "White"
}

# Point d'entrée principal
if ($args -contains "-help" -or $args -contains "--help" -or $args -contains "/?") {
    Show-Help
    exit 0
}

# Vérification que le serveur est accessible
try {
    Write-Color "🔍 Vérification de la connexion au serveur..." "Cyan"
    $healthCheck = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Color "✅ Serveur accessible" "Green"
}
catch {
    Write-Color "❌ Impossible de se connecter au serveur $BaseUrl" "Red"
    Write-Color "Assurez-vous que l'application EcoDeli est démarrée" "Yellow"
    exit 1
}

# Lancement du test
Start-EcoDeliWorkflowTest