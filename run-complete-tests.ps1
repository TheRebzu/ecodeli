#!/usr/bin/env pwsh

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "                   TESTS COMPLETS ECODELI - CAHIER DES CHARGES" -ForegroundColor Cyan  
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔍 Lancement des tests de conformité complète..." -ForegroundColor Green
Write-Host ""

Write-Host "📊 === TEST 1: VÉRIFICATION FONCTIONNALITÉS GÉNÉRALES ===" -ForegroundColor Yellow
try {
    npx tsx test-features-verification.ts
    Write-Host "✅ Test 1 terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur Test 1: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "🔐 === TEST 2: CONFORMITÉ CAHIER DES CHARGES AVEC AUTHENTIFICATION ===" -ForegroundColor Yellow
try {
    node test-ecodeli-complete.mjs
    Write-Host "✅ Test 2 terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur Test 2: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎯 === TEST 3: WORKFLOWS MÉTIER ===" -ForegroundColor Yellow
try {
    node test-business-workflows.mjs
    Write-Host "✅ Test 3 terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur Test 3: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "🛠️ === TEST 4: CONFORMITÉ TECHNIQUE ===" -ForegroundColor Yellow
try {
    node test-technical-compliance.mjs
    Write-Host "✅ Test 4 terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur Test 4: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "🔧 === TEST 5: VÉRIFICATION CORRECTIONS API ===" -ForegroundColor Yellow
try {
    node test-api-fixes.mjs  
    Write-Host "✅ Test 5 terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur Test 5: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "                             TESTS TERMINÉS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tous les tests de conformité ont été exécutés." -ForegroundColor Green
Write-Host "📋 Vérifiez les résultats ci-dessus pour la conformité au cahier des charges." -ForegroundColor Blue
Write-Host "🚀 Application EcoDeli prête pour validation finale." -ForegroundColor Magenta
Write-Host ""

Read-Host "Appuyez sur Entrée pour continuer..."