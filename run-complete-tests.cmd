@echo off
echo ================================================================================
echo                    TESTS COMPLETS ECODELI - CAHIER DES CHARGES
echo ================================================================================
echo.

echo 🔍 Lancement des tests de conformite complete...
echo.

echo 📊 === TEST 1: VERIFICATION FONCTIONNALITES GENERALES ===
npx tsx test-features-verification.ts
echo.

echo 🔐 === TEST 2: APIS AVEC AUTHENTIFICATION SIMPLE ===
node test-simple-auth.mjs
echo.

echo 🍪 === TEST 3: APIS AVEC COOKIES NEXTAUTH ===
node test-nextauth-cookies.mjs
echo.

echo 🎯 === TEST 4: WORKFLOWS METIER ===
node test-business-workflows.mjs
echo.

echo 🛠️ === TEST 5: CONFORMITE TECHNIQUE ===
node test-technical-compliance.mjs
echo.

echo 🔧 === TEST 6: VERIFICATION CORRECTIONS API ===
node test-api-fixes.mjs
echo.

echo ================================================================================
echo                              TESTS TERMINES
echo ================================================================================
echo.
echo ✅ Tous les tests de conformite ont ete executes.
echo 📋 Verifiez les resultats ci-dessus pour la conformite au cahier des charges.
echo 🚀 Application EcoDeli prete pour validation finale.
echo.
pause