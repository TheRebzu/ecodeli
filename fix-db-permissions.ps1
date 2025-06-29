# Script PowerShell pour corriger les permissions de la base de données EcoDeli

Write-Host "🔧 Correction des permissions de la base de données EcoDeli..." -ForegroundColor Yellow

# 1. Réinitialiser complètement la base
Write-Host "📦 Réinitialisation complète de la base de données..." -ForegroundColor Cyan

try {
    # Supprimer et recréer la base avec les bonnes permissions
    Write-Host "Suppression de l'ancienne base..." -ForegroundColor Yellow
    npx prisma migrate reset --force --skip-seed
    
    Write-Host "✅ Base de données supprimée" -ForegroundColor Green
    
    # 2. Fusionner les schémas
    Write-Host "📝 Fusion des schémas Prisma..." -ForegroundColor Cyan
    npm run prisma:merge
    
    # 3. Générer le client Prisma
    Write-Host "🏗️ Génération du client Prisma..." -ForegroundColor Cyan
    npx prisma generate
    
    # 4. Pousser le schéma vers la base
    Write-Host "📤 Application du schéma à la base de données..." -ForegroundColor Cyan
    npx prisma db push
    
    Write-Host "✅ Schéma appliqué avec succès" -ForegroundColor Green
    
    # 5. Lancer le seed
    Write-Host "🌱 Création des données de test..." -ForegroundColor Cyan
    npx prisma db seed
    
    Write-Host "✅ Données de test créées" -ForegroundColor Green
    
    # 6. Vérifier la connexion
    Write-Host "`n🔍 Vérification de la connexion à la base..." -ForegroundColor Cyan
    npx prisma db execute --schema prisma/schema.prisma --stdin "SELECT 1"
    
    Write-Host "`n🎉 Base de données EcoDeli configurée avec succès !" -ForegroundColor Green
    Write-Host "`n📊 Comptes de test disponibles :" -ForegroundColor Yellow
    Write-Host "   Client : client1@test.com / Test123!" -ForegroundColor White
    Write-Host "   Livreur : deliverer1@test.com / Test123!" -ForegroundColor White
    Write-Host "   Admin : admin@test.com / Test123!" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Erreur lors de la configuration : $_" -ForegroundColor Red
    Write-Host "`n💡 Conseils de dépannage :" -ForegroundColor Yellow
    Write-Host "   1. Vérifiez que PostgreSQL est en cours d'exécution" -ForegroundColor White
    Write-Host "   2. Vérifiez les variables d'environnement dans .env" -ForegroundColor White
    Write-Host "   3. Assurez-vous que l'utilisateur a les permissions CREATE/DROP" -ForegroundColor White
}

Read-Host "`nAppuyez sur Entrée pour terminer..."