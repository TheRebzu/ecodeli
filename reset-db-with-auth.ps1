# Script PowerShell pour réinitialiser la base avec NextAuth
Write-Host "🔄 Réinitialisation de la base de données avec NextAuth..." -ForegroundColor Cyan

try {
    # 1. Reset Prisma
    Write-Host "📋 Réinitialisation de la base..." -ForegroundColor Yellow
    npx prisma migrate reset --force
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors du reset Prisma" -ForegroundColor Red
        exit 1
    }

    # 2. Appliquer les migrations
    Write-Host "🔧 Application des migrations..." -ForegroundColor Yellow
    npx prisma migrate deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors des migrations" -ForegroundColor Red
        exit 1
    }

    # 3. Générer le client Prisma
    Write-Host "⚡ Génération du client Prisma..." -ForegroundColor Yellow
    npx prisma generate
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la génération du client" -ForegroundColor Red
        exit 1
    }

    # 4. Exécuter les seeds
    Write-Host "🌱 Exécution des seeds..." -ForegroundColor Yellow
    npx prisma db seed
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors du seeding" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Base de données réinitialisée avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Comptes de test disponibles:" -ForegroundColor Cyan
    Write-Host "   CLIENT: client1@test.com / Test123!" -ForegroundColor White
    Write-Host "   DELIVERER: livreur1@test.com / Test123!" -ForegroundColor White
    Write-Host "   MERCHANT: commercant1@test.com / Test123!" -ForegroundColor White
    Write-Host "   PROVIDER: prestataire1@test.com / Test123!" -ForegroundColor White
    Write-Host "   ADMIN: admin1@test.com / Test123!" -ForegroundColor White

} catch {
    Write-Host "❌ Erreur lors de la réinitialisation: $_" -ForegroundColor Red
    exit 1
}