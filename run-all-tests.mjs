#!/usr/bin/env node

/**
 * Script de lancement de tous les tests EcoDeli
 * Vérifie la conformité complète au cahier des charges
 */

console.log('================================================================================');
console.log('                    TESTS COMPLETS ECODELI - CAHIER DES CHARGES');
console.log('================================================================================');
console.log('');

async function runTest(testName, scriptPath, description) {
  console.log(`📊 === ${testName} ===`);
  console.log(`📝 ${description}`);
  console.log('');
  
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const process = spawn('node', [scriptPath], {
        stdio: 'inherit',
        shell: true
      });
      
      process.on('close', (code) => {
        console.log('');
        console.log(`✅ ${testName} terminé (code: ${code})`);
        console.log('');
        resolve(code);
      });
      
      process.on('error', (error) => {
        console.log(`❌ Erreur ${testName}: ${error.message}`);
        console.log('');
        resolve(1);
      });
    });
  } catch (error) {
    console.log(`❌ Erreur ${testName}: ${error.message}`);
    console.log('');
    return 1;
  }
}

async function main() {
  console.log('🔍 Lancement des tests de conformité complète...');
  console.log('');

  const tests = [
    {
      name: 'TEST 1: VÉRIFICATION FONCTIONNALITÉS GÉNÉRALES',
      script: 'test-features-verification.mjs',
      description: 'Vérification de toutes les pages et APIs selon le cahier des charges'
    },
    {
      name: 'TEST 2: SÉCURITÉ ET AUTHENTIFICATION',
      script: 'test-browser-auth.mjs', 
      description: 'Vérification de la protection des APIs et des systèmes d\'authentification'
    },
    {
      name: 'TEST 3: CONNECTIVITÉ ET SANTÉ',
      script: 'test-connectivity.mjs',
      description: 'Vérification de la connectivité serveur et APIs de base'
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const code = await runTest(test.name, test.script, test.description);
    results.push({ name: test.name, success: code === 0 });
  }

  // Rapport final
  console.log('================================================================================');
  console.log('                              RÉSULTATS FINAUX');
  console.log('================================================================================');
  console.log('');

  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('📊 Résumé des tests:');
  results.forEach(result => {
    const emoji = result.success ? '✅' : '❌';
    console.log(`   ${emoji} ${result.name}`);
  });

  console.log('');
  console.log(`📈 Score global: ${passed}/${total} tests réussis (${Math.round((passed/total)*100)}%)`);
  
  let evaluation;
  const successRate = passed / total;
  if (successRate === 1) evaluation = '🟢 PARFAIT - Application conforme au cahier des charges';
  else if (successRate >= 0.8) evaluation = '🟡 BON - Quelques points à améliorer';
  else evaluation = '🔴 À CORRIGER - Problèmes détectés';

  console.log(`🎯 Évaluation: ${evaluation}`);
  console.log('');

  if (passed === total) {
    console.log('🚀 ✅ APPLICATION ECODELI VALIDÉE POUR PRODUCTION');
    console.log('');
    console.log('📋 Prochaines étapes recommandées:');
    console.log('   1. Tests manuels d\'authentification (voir test-browser-auth.mjs)'); 
    console.log('   2. Tests utilisateurs en environnement de staging');
    console.log('   3. Validation finale par l\'équipe métier');
  } else {
    console.log('⚠️ 🔧 CORRECTIONS NÉCESSAIRES AVANT MISE EN PRODUCTION');
    console.log('');
    console.log('📋 Actions requises:');
    console.log('   1. Corriger les tests échoués');
    console.log('   2. Relancer les tests');
    console.log('   3. Valider la conformité complète');
  }

  console.log('');
  console.log('📱 URL de test: http://172.30.80.1:3000');
  console.log('🌐 URL locale: http://localhost:3000');
  console.log('');
  console.log('================================================================================');
}

main().catch(console.error);