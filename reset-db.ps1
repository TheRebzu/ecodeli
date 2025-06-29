# Script PowerShell pour réinitialiser complètement la base de données EcoDeli

Write-Host "🔄 Réinitialisation complète de la base de données EcoDeli..." -ForegroundColor Yellow

# 1. Supprimer et recréer la base
Write-Host "📦 Suppression et recréation de la base de données..." -ForegroundColor Cyan

try {
    # Supprimer toutes les tables en cascade
    npx prisma migrate reset --force --skip-seed
    
    Write-Host "✅ Base de données réinitialisée" -ForegroundColor Green
    
    # 2. Appliquer le schéma
    Write-Host "📝 Application du schéma Prisma..." -ForegroundColor Cyan
    npx prisma db push
    
    Write-Host "✅ Schéma appliqué" -ForegroundColor Green
    
    # 3. Lancer le seed
    Write-Host "🌱 Création des données de test..." -ForegroundColor Cyan
    npx prisma db seed
    
    Write-Host "✅ Données de test créées" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 Base de données EcoDeli réinitialisée avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Comptes de test disponibles :" -ForegroundColor Yellow
    Write-Host "   Client : client1@test.com / Test123!" -ForegroundColor White
    Write-Host "   Livreur : livreur1@test.com / Test123!" -ForegroundColor White
    Write-Host "   Admin : admin1@test.com / Test123!" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Erreur lors de la réinitialisation : $_" -ForegroundColor Red
}

Read-Host "Appuyez sur Entrée pour terminer..."