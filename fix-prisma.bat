@echo off
echo Arrêt de tous les processus Node.js...
taskkill /f /im node.exe 2>nul
taskkill /f /im next.exe 2>nul

echo Suppression du cache Prisma...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q .next 2>nul

echo Régénération du client Prisma...
npx prisma generate

echo Prisma corrigé ! Vous pouvez maintenant relancer le serveur avec: pnpm run dev
pause