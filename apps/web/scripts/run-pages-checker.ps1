# Script PowerShell pour vérifier toutes les pages du projet EcoDeli
# Utilisation: .\scripts\run-pages-checker.ps1 [options]

param(
    [string[]]$Arguments = @()
)

Write-Host "🚀 ECODELI - VÉRIFICATEUR DE PAGES" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Vérifier si tsx est disponible
try {
    $null = Get-Command tsx -ErrorAction Stop
    Write-Host "✅ tsx trouvé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: tsx n'est pas installé" -ForegroundColor Red
    Write-Host "   Installez-le avec: npm install -g tsx" -ForegroundColor Yellow
    exit 1
}

# Vérifier que l'instance de développement est en cours
Write-Host "🔍 Vérification de l'instance de développement..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Instance de développement détectée" -ForegroundColor Green
} catch {
    Write-Host "⚠️  ATTENTION: L'instance de développement n'est pas accessible sur http://localhost:3000" -ForegroundColor Yellow
    Write-Host "   Assurez-vous que 'pnpm run dev' est en cours d'exécution dans un autre terminal" -ForegroundColor Yellow
    $continue = Read-Host "   Voulez-vous continuer quand même ? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "❌ Annulation" -ForegroundColor Red
        exit 1
    }
}

# Variables d'environnement par défaut
if (-not $env:NEXT_PUBLIC_BASE_URL) {
    $env:NEXT_PUBLIC_BASE_URL = "http://localhost:3000"
}
if (-not $env:NEXTAUTH_SECRET) {
    $env:NEXTAUTH_SECRET = "your-secret-key"
}

# Exécuter le script principal
Write-Host "🎯 Lancement du vérificateur..." -ForegroundColor Cyan

$argumentString = $Arguments -join " "
if ($argumentString) {
    Invoke-Expression "tsx scripts/pages-checker.ts $argumentString"
} else {
    Invoke-Expression "tsx scripts/pages-checker.ts"
}

# Afficher les fichiers générés
Write-Host ""
Write-Host "📁 FICHIERS GÉNÉRÉS:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

if (Test-Path "pages-list.json") {
    Write-Host "✅ pages-list.json - Liste de toutes les pages trouvées" -ForegroundColor Green
    Write-Host "   📖 Voir: Get-Content pages-list.json | ConvertFrom-Json | Where-Object { `$_.isProtected -eq `$true }" -ForegroundColor Gray
}

if (Test-Path "pages-test-results.json") {
    Write-Host "✅ pages-test-results.json - Résultats des tests" -ForegroundColor Green
    Write-Host "   📖 Erreurs: Get-Content pages-test-results.json | ConvertFrom-Json | Where-Object { `$_.status -ge 400 }" -ForegroundColor Gray
    Write-Host "   📖 Succès: Get-Content pages-test-results.json | ConvertFrom-Json | Where-Object { `$_.status -eq 200 }" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔧 COMMANDES UTILES:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "# Voir les pages protégées:" -ForegroundColor Gray
Write-Host "`$pages = Get-Content pages-list.json | ConvertFrom-Json" -ForegroundColor White
Write-Host "`$pages | Where-Object { `$_.isProtected } | Select-Object route, requiredRole" -ForegroundColor White
Write-Host ""
Write-Host "# Voir les erreurs 404:" -ForegroundColor Gray
Write-Host "`$results = Get-Content pages-test-results.json | ConvertFrom-Json" -ForegroundColor White
Write-Host "`$results | Where-Object { `$_.status -eq 404 } | Select-Object route, role" -ForegroundColor White
Write-Host ""
Write-Host "# Voir les erreurs de permission:" -ForegroundColor Gray
Write-Host "`$results | Where-Object { `$_.status -eq 401 -or `$_.status -eq 403 } | Select-Object route, role, status" -ForegroundColor White
Write-Host ""
Write-Host "# Tester une page spécifique avec curl:" -ForegroundColor Gray
Write-Host "tsx scripts/pages-checker.ts --curl /fr/admin/users" -ForegroundColor White

Write-Host ""
Write-Host "✅ Vérification terminée" -ForegroundColor Green 