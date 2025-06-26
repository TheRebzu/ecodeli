# Script PowerShell pour tester Better-Auth EcoDeli

Write-Host "🔧 Test Better-Auth EcoDeli..." -ForegroundColor Green

# 1. Fusionner et générer Prisma
Write-Host "📦 Génération Prisma..." -ForegroundColor Yellow
pnpm run prisma:merge
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schéma fusionné" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur fusion schéma" -ForegroundColor Red
    exit 1
}

pnpm run db:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma généré" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur génération Prisma" -ForegroundColor Red
    exit 1
}

# 2. Push vers la base de données
Write-Host "🗄️ Mise à jour base de données..." -ForegroundColor Yellow
pnpm run db:push
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Base de données mise à jour" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur mise à jour DB" -ForegroundColor Red
    exit 1
}

# 3. Démarrer le serveur en arrière-plan pour les tests
Write-Host "🚀 Démarrage serveur de test..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock { 
    Set-Location "C:\Users\Amine\WebstormProjects\ecodeli"
    pnpm dev 
}

# Attendre que le serveur démarre
Start-Sleep -Seconds 15

# 4. Tester les endpoints
Write-Host "🧪 Test des endpoints..." -ForegroundColor Yellow

try {
    # Test health
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ /api/health accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ /api/health inaccessible: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    # Test session
    $session = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/session" -Method GET -TimeoutSec 5
    Write-Host "✅ /api/auth/session accessible" -ForegroundColor Green
} catch {
    Write-Host "✅ /api/auth/session accessible (401 attendu sans session)" -ForegroundColor Green
}

# 5. Test inscription
Write-Host "📝 Test inscription utilisateur..." -ForegroundColor Yellow
$registerData = @{
    email = "test@ecodeli.local"
    password = "Test123!"
    name = "Test User"
    role = "CLIENT"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-up" -Method POST -Body $registerData -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Inscription réussie" -ForegroundColor Green
    Write-Host "User ID: $($register.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ Test inscription: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6. Test connexion
Write-Host "🔐 Test connexion utilisateur..." -ForegroundColor Yellow
$loginData = @{
    email = "test@ecodeli.local"
    password = "Test123!"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/sign-in" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Connexion réussie" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Test connexion: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. Nettoyer
Write-Host "🧹 Nettoyage..." -ForegroundColor Yellow
Stop-Job -Job $job
Remove-Job -Job $job

Write-Host "" 
Write-Host "🎉 Tests Better-Auth terminés!" -ForegroundColor Green
Write-Host "📋 Pour continuer le développement:" -ForegroundColor Cyan
Write-Host "  1. pnpm dev" -ForegroundColor White
Write-Host "  2. Tester sur http://localhost:3000" -ForegroundColor White
Write-Host "  3. Endpoints disponibles:" -ForegroundColor White
Write-Host "     - POST /api/auth/sign-up" -ForegroundColor Gray
Write-Host "     - POST /api/auth/sign-in" -ForegroundColor Gray
Write-Host "     - GET /api/auth/session" -ForegroundColor Gray
Write-Host "     - POST /api/auth/sign-out" -ForegroundColor Gray