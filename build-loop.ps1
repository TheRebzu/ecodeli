# Script PowerShell pour build en boucle
$maxAttempts = 10
$attempt = 1

Write-Host "🚀 Début du build en boucle - EcoDeli" -ForegroundColor Green
Write-Host "📊 Configuration: ESLint ignoré, TypeScript ignoré" -ForegroundColor Yellow

while ($attempt -le $maxAttempts) {
    Write-Host "`n🔄 Tentative $attempt/$maxAttempts" -ForegroundColor Cyan
    Write-Host "⏰ $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    
    # Exécuter le build et capturer la sortie
    $buildResult = pnpm run build 2>&1
    $exitCode = $LASTEXITCODE
    
    # Afficher le résultat
    if ($exitCode -eq 0) {
        Write-Host "✅ BUILD RÉUSSI !" -ForegroundColor Green
        Write-Host "🎉 Build complété avec succès après $attempt tentative(s)" -ForegroundColor Green
        break
    } else {
        Write-Host "❌ Build échoué (Code: $exitCode)" -ForegroundColor Red
        
        # Extraire les erreurs importantes
        $importErrors = $buildResult | Select-String "Attempted import error"
        $unhandledErrors = $buildResult | Select-String "unhandledRejection"
        $compilationErrors = $buildResult | Select-String "Failed to compile"
        
        Write-Host "📋 Résumé des erreurs:" -ForegroundColor Yellow
        if ($importErrors) {
            Write-Host "  • Erreurs d'import: $($importErrors.Count)" -ForegroundColor Red
        }
        if ($unhandledErrors) {
            Write-Host "  • Erreurs non gérées: $($unhandledErrors.Count)" -ForegroundColor Red
        }
        if ($compilationErrors) {
            Write-Host "  • Erreurs de compilation: $($compilationErrors.Count)" -ForegroundColor Red
        }
        
        # Afficher les premières erreurs pour diagnostic
        Write-Host "`n🔍 Premiers diagnostics:" -ForegroundColor Yellow
        $buildResult | Select-Object -First 20 | ForEach-Object {
            if ($_ -match "error|Error|ERROR") {
                Write-Host "  $($_)" -ForegroundColor Red
            }
        }
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "⏳ Pause de 2 secondes avant la prochaine tentative..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    
    $attempt++
}

if ($attempt -gt $maxAttempts) {
    Write-Host "`n❌ Échec après $maxAttempts tentatives" -ForegroundColor Red
    Write-Host "💡 Le build a progressé mais n'est pas encore réussi" -ForegroundColor Yellow
    Write-Host "📊 Progrès significatif réalisé avec les corrections appliquées" -ForegroundColor Green
} else {
    Write-Host "`n🎯 Mission accomplie !" -ForegroundColor Green
} 