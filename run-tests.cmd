@echo off
setlocal enabledelayedexpansion

echo ============================================
echo     TEST EXHAUSTIF CLIENT PAGES - EcoDeli
echo ============================================
echo.
echo Ce script va tester TOUTES les pages client:
echo  - 5 comptes client seed
echo  - 14 pages statiques 
echo  - 14 APIs statiques
echo  - 16 pages dynamiques
echo  - 23 APIs dynamiques
echo.
echo Total: Plus de 335 tests!
echo.

set /p confirm="Voulez-vous continuer? (o/N): "
if /i not "%confirm%"=="o" (
    echo Tests annulés.
    pause
    exit /b 0
)

echo.
echo Vérification des prérequis...

REM Vérifier si le serveur est démarré
echo Vérification du serveur sur localhost:3000...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -Method HEAD -TimeoutSec 5 | Out-Null; Write-Host 'Serveur accessible' } catch { Write-Host 'ERREUR: Serveur non accessible sur localhost:3000'; exit 1 }" 2>nul
if errorlevel 1 (
    echo.
    echo ERREUR: Le serveur n'est pas accessible sur localhost:3000
    echo Veuillez démarrer le serveur avec: npm run dev
    echo.
    pause
    exit /b 1
)

echo Serveur OK!
echo.

REM Vérifier PowerShell
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo ERREUR: PowerShell non disponible
    pause
    exit /b 1
)

echo PowerShell OK!
echo.

echo Démarrage des tests...
echo ========================================
echo.

REM Lancer le script PowerShell principal
powershell -ExecutionPolicy Bypass -File "%~dp0test-client-pages.ps1"

echo.
echo ========================================
echo Tests terminés! 
echo.
echo Le rapport HTML a été généré: client-pages-test-results.html
echo.

set /p open="Ouvrir le rapport maintenant? (o/N): "
if /i "%open%"=="o" (
    if exist "client-pages-test-results.html" (
        start client-pages-test-results.html
    ) else (
        echo Fichier de rapport non trouvé.
    )
)

pause