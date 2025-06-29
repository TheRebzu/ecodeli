@echo off
echo ====================================
echo    TEST CLIENT PAGES - EcoDeli
echo ====================================
echo.

REM Vérifier si PowerShell est disponible
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo ERREUR: PowerShell n'est pas disponible sur ce système
    echo Veuillez installer PowerShell ou utiliser PowerShell ISE
    pause
    exit /b 1
)

echo Lancement des tests avec PowerShell...
echo.

REM Exécuter le script PowerShell avec ExecutionPolicy bypass pour éviter les restrictions
powershell -ExecutionPolicy Bypass -File "%~dp0test-client-pages.ps1"

echo.
echo Tests terminés!
pause