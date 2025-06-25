# Script PowerShell pour configurer la base de données EcoDeli avec Docker
# Compatible WSL et Windows

Write-Host "🐳 Configuration de la base de données EcoDeli avec Docker..." -ForegroundColor Cyan

# Vérifier si Docker est installé
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker détecté: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas installé ou pas accessible" -ForegroundColor Red
    Write-Host "Veuillez installer Docker Desktop ou Docker Engine" -ForegroundColor Yellow
    exit 1
}

# Vérifier si Docker Compose est installé
try {
    $composeVersion = docker compose version
    Write-Host "✅ Docker Compose détecté: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose n'est pas installé" -ForegroundColor Red
    exit 1
}

# Arrêter les conteneurs existants s'ils existent
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker compose down

# Supprimer les volumes si demandé
$removeVolumes = Read-Host "Voulez-vous supprimer les données existantes ? (y/N)"
if ($removeVolumes -eq "y" -or $removeVolumes -eq "Y") {
    Write-Host "🗑️ Suppression des volumes..." -ForegroundColor Yellow
    docker compose down -v
    docker volume prune -f
}

# Démarrer les services
Write-Host "🚀 Démarrage des services PostgreSQL..." -ForegroundColor Cyan
docker compose up -d

# Attendre que PostgreSQL soit prêt
Write-Host "⏳ Attente de la disponibilité de PostgreSQL..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    Start-Sleep -Seconds 2
    
    $result = docker exec ecodeli_postgres pg_isready -U postgres -d ecodeli 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL est prêt!" -ForegroundColor Green
        break
    }
    
    if ($attempt -eq $maxAttempts) {
        Write-Host "❌ Timeout: PostgreSQL n'est pas disponible après $maxAttempts tentatives" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "⏳ Tentative $attempt/$maxAttempts..." -ForegroundColor Yellow
} while ($true)

# Afficher les informations de connexion
Write-Host "`n🎉 Base de données EcoDeli configurée avec succès!" -ForegroundColor Green
Write-Host "`n📊 Informations de connexion:" -ForegroundColor Cyan
Write-Host "  🔗 Host: localhost" -ForegroundColor White
Write-Host "  🔢 Port: 5432" -ForegroundColor White
Write-Host "  🗄️ Database: ecodeli" -ForegroundColor White
Write-Host "  👤 Username: postgres" -ForegroundColor White
Write-Host "  🔑 Password: password" -ForegroundColor White
Write-Host "  📄 Connection String: postgresql://postgres:password@localhost:5432/ecodeli?schema=public" -ForegroundColor White

Write-Host "`n🌐 pgAdmin (Interface Web):" -ForegroundColor Cyan
Write-Host "  🔗 URL: http://localhost:8080" -ForegroundColor White
Write-Host "  📧 Email: admin@ecodeli.com" -ForegroundColor White
Write-Host "  🔑 Password: admin123" -ForegroundColor White

Write-Host "`n📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Exécuter: npx prisma migrate dev" -ForegroundColor White
Write-Host "  2. Exécuter: npx prisma db seed" -ForegroundColor White
Write-Host "  3. Redémarrer le serveur Next.js" -ForegroundColor White

Write-Host "`n🐳 Commandes utiles:" -ForegroundColor Cyan
Write-Host "  • Voir les logs: docker compose logs -f" -ForegroundColor White
Write-Host "  • Arrêter: docker compose down" -ForegroundColor White
Write-Host "  • Redémarrer: docker compose restart" -ForegroundColor White
Write-Host "  • Accès PostgreSQL: docker exec -it ecodeli_postgres psql -U postgres -d ecodeli" -ForegroundColor White 