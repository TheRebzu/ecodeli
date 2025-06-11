# fix-imports.ps1
# Script pour corriger automatiquement tous les imports après la réorganisation

param(
    [switch]$DryRun = $false,
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# Couleurs pour l'affichage
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Cyan"

# Fonction pour afficher des messages colorés
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Mapping des anciens chemins vers les nouveaux
$importMappings = @{
    # Auth
    '@/components/auth/login-form' = '@/components/auth/login/login-form'
    '@/components/auth/forgot-password' = '@/components/auth/login/forgot-password-form'
    '@/components/auth/register-forms/client-register-form' = '@/components/auth/register/client-register-form'
    '@/components/auth/register-forms/deliverer-register-form' = '@/components/auth/register/deliverer-register-form'
    '@/components/auth/register-forms/merchant-register-form' = '@/components/auth/register/merchant-register-form'
    '@/components/auth/register-forms/provider-register-form' = '@/components/auth/register/provider-register-form'
    '@/components/auth/email-verification' = '@/components/auth/verification/email-verification'
    '@/components/auth/two-factor-setup' = '@/components/auth/verification/two-factor-auth'
    
    # Storage
    '@/components/storage/(.*)' = '@/components/client/storage/$1'
    
    # Services
    '@/components/services/service-search-form' = '@/components/client/services/service-search-form'
    '@/components/services/service-booking' = '@/components/client/services/service-booking'
    '@/components/services/service-card' = '@/components/shared/services/service-card'
    '@/components/services/service-detail' = '@/components/shared/services/service-detail'
    '@/components/services/service-filter' = '@/components/shared/services/service-filter'
    '@/components/services/provider-calendar' = '@/components/provider/availability/provider-calendar'
    '@/components/services/booking-confirmation' = '@/components/provider/bookings/booking-confirmation'
    '@/components/services/rating-stars' = '@/components/shared/ui/rating-stars'
    
    # Announcements
    '@/components/announcements/announcement-card' = '@/components/shared/announcements/announcement-card'
    '@/components/announcements/announcement-filter' = '@/components/shared/announcements/announcement-filters'
    '@/components/announcements/announcement-map' = '@/components/shared/announcements/announcement-map-view'
    '@/components/announcements/address-map-picker' = '@/components/shared/announcements/address-map-picker'
    '@/components/announcements/photo-upload' = '@/components/shared/announcements/photo-upload'
    
    # Deliveries
    '@/components/deliveries/delivery-card' = '@/components/shared/deliveries/delivery-card'
    '@/components/deliveries/delivery-status' = '@/components/shared/deliveries/delivery-status'
    '@/components/deliveries/delivery-timeline' = '@/components/shared/deliveries/delivery-timeline'
    '@/components/deliveries/delivery-map' = '@/components/shared/deliveries/delivery-map'
    
    # Messaging
    '@/components/messaging/chat-interface' = '@/components/shared/messaging/chat-interface'
    '@/components/messaging/conversation-list' = '@/components/shared/messaging/conversation-list'
    '@/components/messaging/message-bubble' = '@/components/shared/messaging/message-bubble'
    '@/components/messaging/message-input' = '@/components/shared/messaging/message-input'
    
    # Notifications
    '@/components/notifications/notification-center' = '@/components/shared/messaging/notification-center'
    '@/components/notifications/notification-badge' = '@/components/shared/notifications/notification-badge'
    '@/components/notifications/notification-dropdown' = '@/components/shared/notifications/notification-dropdown'
    '@/components/notifications/notification-toast' = '@/components/shared/notifications/notification-toast'
    
    # Maps
    '@/components/maps/(.*)' = '@/components/shared/maps/$1'
    
    # Payments
    '@/components/payments/payment-form' = '@/components/shared/payments/payment-form'
    '@/components/payments/stripe-elements' = '@/components/shared/payments/stripe-elements'
    '@/components/payments/payment-history' = '@/components/client/payments/payment-history'
    '@/components/payments/wallet-balance' = '@/components/shared/payments/wallet-balance'
    '@/components/payments/withdrawal-form' = '@/components/deliverer/wallet/withdrawal-form'
    
    # Dashboard
    '@/components/dashboard/widgets/(.*)' = '@/components/shared/dashboard/widgets/$1'
    '@/components/dashboard/stats-card' = '@/components/shared/dashboard/stats-card'
    '@/components/dashboard/quick-actions' = '@/components/shared/dashboard/quick-actions'
    '@/components/dashboard/role-specific/(.*)' = '@/components/shared/dashboard/role-specific/$1'
    
    # Onboarding
    '@/components/onboarding/(.*)' = '@/components/shared/onboarding/$1'
    
    # Profile
    '@/components/profile/profile-header' = '@/components/shared/profile/profile-header'
    '@/components/profile/profile-picture' = '@/components/shared/profile/profile-picture'
    '@/components/profile/client/client-profile-form' = '@/components/client/profile/client-profile-form'
    '@/components/profile/deliverer/deliverer-profile-form' = '@/components/deliverer/profile/deliverer-profile-form'
    '@/components/profile/merchant/merchant-profile-form' = '@/components/merchant/profile/merchant-profile-form'
    '@/components/profile/provider/provider-profile-form' = '@/components/provider/profile/provider-profile-form'
    
    # Layout
    '@/components/layout/public-header' = '@/components/layout/public/public-header'
    '@/components/layout/public-footer' = '@/components/layout/public/public-footer'
    '@/components/layout/protected-header' = '@/components/layout/protected/dashboard-header'
    '@/components/shared/language-switcher' = '@/components/layout/common/language-switcher'
}

# Fonction pour créer une sauvegarde
function Create-ImportBackup {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupDir = "backup-imports-$timestamp"
    
    Write-ColorMessage "📸 Création d'une sauvegarde dans: $backupDir" $InfoColor
    
    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        
        # Sauvegarder tous les fichiers TS/TSX
        Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse | ForEach-Object {
            $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
            $destPath = Join-Path $backupDir $relativePath
            $destDir = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            }
            
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
    }
    
    Write-ColorMessage "✅ Sauvegarde créée avec succès" $SuccessColor
    return $backupDir
}

# Fonction pour analyser et corriger les imports d'un fichier
function Fix-FileImports {
    param(
        [string]$FilePath
    )
    
    # Vérifier que le fichier existe
    if (-not (Test-Path $FilePath)) {
        if ($Verbose) {
            Write-ColorMessage "  ⚠️  Fichier non trouvé: $FilePath" $WarningColor
        }
        return $false
    }
    
    try {
        $content = Get-Content -Path $FilePath -Raw -ErrorAction Stop
        
        # Vérifier que le contenu n'est pas vide ou null
        if ([string]::IsNullOrEmpty($content)) {
            if ($Verbose) {
                Write-ColorMessage "  ⚠️  Fichier vide: $FilePath" $WarningColor
            }
            return $false
        }
        
        $originalContent = $content
        $hasChanges = $false
    }
    catch {
        if ($Verbose) {
            Write-ColorMessage "  ❌ Erreur de lecture: $FilePath - $($_.Exception.Message)" $ErrorColor
        }
        return $false
    }
    
    # Pattern pour capturer les imports
    $importPattern = "(?m)^import\s+(?:{[^}]+}|[^;]+)\s+from\s+['""]([^'""]+)['""]"
    
    # Trouver tous les imports
    $matches = [regex]::Matches($content, $importPattern)
    
    foreach ($match in $matches) {
        $fullMatch = $match.Value
        $importPath = $match.Groups[1].Value
        
        # Vérifier si c'est un import de composant
        if ($importPath -like "*@/components/*") {
            $newPath = $importPath
            
            # Appliquer les mappings
            foreach ($mapping in $importMappings.GetEnumerator()) {
                $pattern = $mapping.Key
                $replacement = $mapping.Value
                
                if ($pattern -like "*(*)*") {
                    # Pattern avec regex
                    $regexPattern = $pattern -replace '\(', '(' -replace '\)', ')' -replace '\*', '.*'
                    if ($importPath -match $regexPattern) {
                        $newPath = $importPath -replace $regexPattern, $replacement
                        break
                    }
                } else {
                    # Mapping exact
                    if ($importPath -eq $pattern) {
                        $newPath = $replacement
                        break
                    }
                }
            }
            
            # Si le chemin a changé, remplacer
            if ($newPath -ne $importPath) {
                $newImport = $fullMatch -replace [regex]::Escape($importPath), $newPath
                $content = $content -replace [regex]::Escape($fullMatch), $newImport
                $hasChanges = $true
                
                if ($Verbose) {
                    Write-ColorMessage "  📝 $importPath → $newPath" $InfoColor
                }
            }
        }
    }
    
    # Corriger les imports relatifs
    $relativeImportPattern = "(?m)^import\s+(?:{[^}]+}|[^;]+)\s+from\s+['""](\.\./[^'""]+)['""]"
    $relativeMatches = [regex]::Matches($content, $relativeImportPattern)
    
    foreach ($match in $relativeMatches) {
        $relativePath = $match.Groups[1].Value
        
        # Vérifier si le chemin relatif pointe vers un ancien emplacement
        if ($relativePath -match "\.\./(storage|services|announcements|deliveries|messaging|notifications|maps|payments|dashboard|onboarding|profile)/") {
            $hasChanges = $true
            
            if ($Verbose) {
                Write-ColorMessage "  ⚠️  Import relatif obsolète détecté: $relativePath" $WarningColor
            }
        }
    }
    
    # Sauvegarder si des changements ont été effectués
    if ($hasChanges) {
        if (-not $DryRun) {
            Set-Content -Path $FilePath -Value $content -NoNewline
        }
        return $true
    }
    
    return $false
}

# Fonction pour créer/mettre à jour les barrel exports
function Update-BarrelExports {
    Write-ColorMessage "`n📦 Mise à jour des barrel exports (index.ts)..." $InfoColor
    
    $barrelLocations = @(
        "src/components/shared",
        "src/components/shared/documents",
        "src/components/shared/payments",
        "src/components/admin",
        "src/components/client",
        "src/components/deliverer",
        "src/components/merchant",
        "src/components/provider"
    )
    
    foreach ($location in $barrelLocations) {
        if (Test-Path $location) {
            $indexPath = Join-Path $location "index.ts"
            
            # Obtenir tous les fichiers .tsx dans le dossier (non récursif)
            $files = Get-ChildItem -Path $location -Filter "*.tsx" -File | 
                     Where-Object { $_.Name -ne "index.tsx" } |
                     Sort-Object Name
            
            if ($files.Count -gt 0) {
                $exports = @()
                
                foreach ($file in $files) {
                    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                    $exports += "export * from './$baseName';"
                }
                
                $content = $exports -join "`n"
                
                if ($DryRun) {
                    Write-ColorMessage "🔍 [DRY RUN] Créerait barrel export: $indexPath" $InfoColor
                } else {
                    $content | Out-File -FilePath $indexPath -Encoding utf8
                    Write-ColorMessage "✅ Barrel export créé/mis à jour: $indexPath" $SuccessColor
                }
            }
        }
    }
}

# Fonction pour analyser les imports cassés
function Find-BrokenImports {
    param(
        [string]$RootPath = "src"
    )
    
    Write-ColorMessage "`n🔍 Recherche des imports potentiellement cassés..." $InfoColor
    
    $brokenImports = @()
    $files = Get-ChildItem -Path $RootPath -Include "*.ts","*.tsx" -Recurse | Where-Object { Test-Path $_.FullName }
    
    foreach ($file in $files) {
        # Vérifier que le fichier existe
        if (-not (Test-Path $file.FullName)) {
            continue
        }
        
        try {
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            
            # Vérifier que le contenu n'est pas vide ou null
            if ([string]::IsNullOrEmpty($content)) {
                continue
            }
            
            $importPattern = "(?m)^import\s+(?:{[^}]+}|[^;]+)\s+from\s+['""]([^'""]+)['""]"
            $matches = [regex]::Matches($content, $importPattern)
        }
        catch {
            if ($Verbose) {
                Write-ColorMessage "  ❌ Erreur de lecture: $($file.FullName) - $($_.Exception.Message)" $ErrorColor
            }
            continue
        }
        
        foreach ($match in $matches) {
            $importPath = $match.Groups[1].Value
            
            # Vérifier les imports de composants
            if ($importPath -like "@/components/*") {
                $componentPath = $importPath -replace "@/components/", ""
                $fullPath = Join-Path "src/components" "$componentPath.tsx"
                $fullPathTS = Join-Path "src/components" "$componentPath.ts"
                $indexPath = Join-Path "src/components" $componentPath "index.ts"
                
                if (-not (Test-Path $fullPath) -and -not (Test-Path $fullPathTS) -and -not (Test-Path $indexPath)) {
                    $brokenImports += @{
                        File = $file.FullName
                        Import = $importPath
                        Line = ($content.Substring(0, $match.Index).Split("`n").Count)
                    }
                }
            }
        }
    }
    
    if ($brokenImports.Count -gt 0) {
        Write-ColorMessage "`n⚠️  Imports cassés détectés:" $WarningColor
        
        foreach ($broken in $brokenImports | Select-Object -First 10) {
            $relativePath = $broken.File.Substring((Get-Location).Path.Length + 1)
            Write-ColorMessage "  $relativePath (ligne $($broken.Line)): $($broken.Import)" $WarningColor
        }
        
        if ($brokenImports.Count -gt 10) {
            Write-ColorMessage "  ... et $($brokenImports.Count - 10) autres" $WarningColor
        }
    } else {
        Write-ColorMessage "✅ Aucun import cassé détecté!" $SuccessColor
    }
    
    return $brokenImports
}

# Script principal
Write-ColorMessage @"
╔══════════════════════════════════════════════════════════════╗
║        CORRECTION DES IMPORTS APRÈS RÉORGANISATION           ║
╚══════════════════════════════════════════════════════════════╝
"@ $InfoColor

if ($DryRun) {
    Write-ColorMessage "`n🔍 MODE DRY RUN - Aucune modification ne sera effectuée" $WarningColor
}

if (-not $Force -and -not $DryRun) {
    Write-ColorMessage "`n⚠️  Ce script va corriger tous les imports dans votre projet" $WarningColor
    Write-ColorMessage "Une sauvegarde sera créée automatiquement." $InfoColor
    
    $confirmation = Read-Host "`nVoulez-vous continuer? (O/N)"
    if ($confirmation -ne 'O' -and $confirmation -ne 'o') {
        Write-ColorMessage "Opération annulée." $ErrorColor
        exit 0
    }
}

try {
    # Étape 1: Créer une sauvegarde
    $backupDir = $null
    if (-not $DryRun) {
        Write-ColorMessage "`n📸 Étape 1: Création d'une sauvegarde..." $InfoColor
        $backupDir = Create-ImportBackup
    }
    
    # Étape 2: Analyser les imports cassés avant correction
    Write-ColorMessage "`n🔍 Étape 2: Analyse des imports cassés..." $InfoColor
    $brokenBefore = Find-BrokenImports
    
    # Étape 3: Corriger les imports
    Write-ColorMessage "`n📝 Étape 3: Correction des imports..." $InfoColor
    
    $files = Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse | Where-Object { Test-Path $_.FullName }
    $totalFiles = $files.Count
    $modifiedCount = 0
    $currentFile = 0
    
    foreach ($file in $files) {
        $currentFile++
        $percent = [int](($currentFile / $totalFiles) * 100)
        
        if ($currentFile % 10 -eq 0 -or $Verbose) {
            Write-Progress -Activity "Correction des imports" -Status "$currentFile/$totalFiles fichiers" -PercentComplete $percent
        }
        
        $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
        
        if ($Verbose) {
            Write-ColorMessage "`n📄 Analyse: $relativePath" $InfoColor
        }
        
        # Vérifier que le fichier existe avant d'essayer de le corriger
        if (Test-Path $file.FullName) {
            if (Fix-FileImports -FilePath $file.FullName) {
                $modifiedCount++
                if (-not $Verbose) {
                    Write-ColorMessage "✅ Modifié: $relativePath" $SuccessColor
                }
            }
        } else {
            if ($Verbose) {
                Write-ColorMessage "  ⚠️  Fichier introuvable: $relativePath" $WarningColor
            }
        }
    }
    
    Write-Progress -Activity "Correction des imports" -Completed
    
    # Étape 4: Mettre à jour les barrel exports
    Write-ColorMessage "`n📦 Étape 4: Mise à jour des barrel exports..." $InfoColor
    Update-BarrelExports
    
    # Étape 5: Vérifier les imports après correction
    Write-ColorMessage "`n🔍 Étape 5: Vérification finale..." $InfoColor
    $brokenAfter = Find-BrokenImports
    
    # Résumé
    Write-ColorMessage "`n📊 Résumé:" $InfoColor
    Write-ColorMessage "  📄 Fichiers analysés: $totalFiles" $InfoColor
    Write-ColorMessage "  ✏️  Fichiers modifiés: $modifiedCount" $InfoColor
    Write-ColorMessage "  ❌ Imports cassés avant: $($brokenBefore.Count)" $InfoColor
    Write-ColorMessage "  ❌ Imports cassés après: $($brokenAfter.Count)" $SuccessColor
    
    if ($DryRun) {
        Write-ColorMessage "`n🔍 Simulation terminée! Utilisez sans -DryRun pour appliquer." $WarningColor
    } else {
        Write-ColorMessage "`n✨ Correction des imports terminée!" $SuccessColor
        
        if ($brokenAfter.Count -gt 0) {
            Write-ColorMessage "`n⚠️  Il reste des imports à corriger manuellement." $WarningColor
            Write-ColorMessage "Vérifiez les imports cassés listés ci-dessus." $WarningColor
        }
        
        if ($backupDir) {
            Write-ColorMessage "`n💾 Sauvegarde disponible dans: $backupDir" $InfoColor
        }
    }
    
    Write-ColorMessage "`n📋 Prochaines étapes:" $InfoColor
    Write-ColorMessage "1. Exécuter 'pnpm run typecheck' pour vérifier les types" $InfoColor
    Write-ColorMessage "2. Exécuter 'pnpm run build' pour vérifier la compilation" $InfoColor
    Write-ColorMessage "3. Corriger manuellement les imports restants si nécessaire" $InfoColor
    Write-ColorMessage "4. Tester l'application" $InfoColor
    
} catch {
    Write-ColorMessage "`n❌ Erreur lors de l'exécution:" $ErrorColor
    Write-ColorMessage $_.Exception.Message $ErrorColor
    exit 1
}