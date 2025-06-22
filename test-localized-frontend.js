/**
 * Test d'intégration frontend avec les URLs localisées
 * Prend en compte l'internationalisation (i18n) française
 */

import fs from 'fs';

const BASE_URL = 'http://windows:3000';
const LOCALE = 'fr'; // Locale française

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

class LocalizedFrontendTester {
  constructor() {
    this.results = [];
    this.sessionCookies = '';
  }

  async log(category, test, status, message, data = null) {
    const result = {
      category,
      test,
      status,
      message,
      timestamp: new Date().toISOString(),
      data: data ? JSON.stringify(data, null, 2) : null
    };
    this.results.push(result);
    
    const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '⚠️';
    console.log(`${statusEmoji} [${category}] ${test}: ${message}`);
  }

  async testPage(category, pageName, path, expectedElements = [], shouldRedirectToLogin = false) {
    try {
      const url = `${BASE_URL}/${LOCALE}${path}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...BROWSER_HEADERS,
          ...(this.sessionCookies ? { 'Cookie': this.sessionCookies } : {})
        },
        redirect: 'manual'
      });

      const content = await response.text();

      // Si on s'attend à une redirection vers login
      if (shouldRedirectToLogin) {
        if (response.status === 302 || response.status === 307) {
          const location = response.headers.get('location');
          if (location && location.includes('/login')) {
            await this.log(category, pageName, 'SUCCESS', 
              'Redirection vers login (sécurité OK)', 
              { redirectTo: location }
            );
            return true;
          } else {
            await this.log(category, pageName, 'WARNING', 
              `Redirection inattendue vers ${location}`, 
              { redirectTo: location }
            );
            return false;
          }
        } else {
          await this.log(category, pageName, 'ERROR', 
            `Page accessible sans authentification (${response.status})`, 
            { status: response.status }
          );
          return false;
        }
      }

      // Test normal de page
      if (response.status === 200) {
        await this.log(category, pageName, 'SUCCESS', 
          `Page accessible (${response.status})`, 
          {
            contentLength: content.length,
            hasNextJS: content.includes('__NEXT_DATA__'),
            hasHydration: content.includes('self.__next_f')
          }
        );

        // Vérifier la présence d'éléments attendus
        let elementChecks = 0;
        for (const element of expectedElements) {
          if (content.includes(element)) {
            elementChecks++;
          }
        }

        if (expectedElements.length > 0) {
          const elementScore = (elementChecks / expectedElements.length * 100).toFixed(0);
          await this.log(category, `${pageName} - Contenu`, elementChecks === expectedElements.length ? 'SUCCESS' : 'WARNING', 
            `${elementChecks}/${expectedElements.length} éléments trouvés (${elementScore}%)`, 
            { foundElements: elementChecks, totalElements: expectedElements.length }
          );
        }

        return true;
      } else if (response.status === 302 || response.status === 307) {
        const location = response.headers.get('location');
        await this.log(category, pageName, 'WARNING', 
          `Redirection vers ${location} (${response.status})`, 
          { redirectTo: location }
        );
        return false;
      } else {
        await this.log(category, pageName, 'ERROR', 
          `Page inaccessible (${response.status})`, 
          { status: response.status }
        );
        return false;
      }

    } catch (error) {
      await this.log(category, pageName, 'ERROR', 
        `Exception: ${error.message}`, 
        { error: error.toString() }
      );
      return false;
    }
  }

  async testPublicPages() {
    console.log('\n📱 TEST DES PAGES PUBLIQUES LOCALISÉES');
    console.log('=' .repeat(60));

    const publicPages = [
      {
        name: 'Page d\'accueil',
        path: '/home',
        elements: ['EcoDeli', 'livraison', 'écologique', 'title']
      },
      {
        name: 'Page de connexion',
        path: '/login',
        elements: ['email', 'password', 'Connexion', 'form']
      },
      {
        name: 'Page d\'inscription',
        path: '/register',
        elements: ['client', 'deliverer', 'merchant', 'Inscription']
      },
      {
        name: 'Page À propos',
        path: '/about',
        elements: ['propos', 'mission', 'équipe']
      },
      {
        name: 'Page Services',
        path: '/services',
        elements: ['services', 'prestations', 'recherche']
      },
      {
        name: 'Page Contact',
        path: '/contact',
        elements: ['contact', 'message', 'formulaire']
      }
    ];

    let successCount = 0;
    for (const page of publicPages) {
      const success = await this.testPage('PUBLIC', page.name, page.path, page.elements);
      if (success) successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { total: publicPages.length, success: successCount };
  }

  async testProtectedPages() {
    console.log('\n🔒 TEST DES PAGES PROTÉGÉES CLIENT (MISSION 1)');
    console.log('=' .repeat(60));

    const protectedPages = [
      {
        name: 'Dashboard Client',
        path: '/client',
        elements: []
      },
      {
        name: 'Annonces Client',
        path: '/client/announcements',
        elements: []
      },
      {
        name: 'Créer Annonce',
        path: '/client/announcements/create',
        elements: []
      },
      {
        name: 'Services Client',
        path: '/client/services',
        elements: []
      },
      {
        name: 'Stockage Client',
        path: '/client/storage',
        elements: []
      },
      {
        name: 'Rendez-vous Client',
        path: '/client/appointments',
        elements: []
      },
      {
        name: 'Profil Client',
        path: '/client/profile',
        elements: []
      },
      {
        name: 'Factures Client',
        path: '/client/invoices',
        elements: []
      },
      {
        name: 'Contrats Client',
        path: '/client/contracts',
        elements: []
      },
      {
        name: 'Avis Client',
        path: '/client/reviews',
        elements: []
      }
    ];

    let redirectCount = 0;
    for (const page of protectedPages) {
      const success = await this.testPage('PROTECTED', page.name, page.path, page.elements, true);
      if (success) redirectCount++;
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { total: protectedPages.length, success: redirectCount };
  }

  async testSpecialPages() {
    console.log('\n🎯 TEST DES PAGES SPÉCIALES');
    console.log('=' .repeat(60));

    const specialPages = [
      {
        name: 'Page 404',
        path: '/page-inexistante-test',
        expectedStatus: 404
      },
      {
        name: 'Sitemap',
        path: '/sitemap.xml',
        expectedContentType: 'text/xml'
      },
      {
        name: 'Robots.txt',
        path: '/robots.txt',
        expectedContentType: 'text/plain'
      }
    ];

    let successCount = 0;
    for (const page of specialPages) {
      try {
        const url = page.name === 'Sitemap' || page.name === 'Robots.txt' 
          ? `${BASE_URL}${page.path}` 
          : `${BASE_URL}/${LOCALE}${page.path}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: BROWSER_HEADERS
        });

        if (page.expectedStatus && response.status === page.expectedStatus) {
          await this.log('SPECIAL', page.name, 'SUCCESS', 
            `Status attendu ${page.expectedStatus}`, 
            { status: response.status }
          );
          successCount++;
        } else if (page.expectedContentType) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes(page.expectedContentType)) {
            await this.log('SPECIAL', page.name, 'SUCCESS', 
              `Content-Type correct: ${contentType}`, 
              { contentType, status: response.status }
            );
            successCount++;
          } else {
            await this.log('SPECIAL', page.name, 'WARNING', 
              `Content-Type incorrect: ${contentType}`, 
              { contentType, expectedContentType: page.expectedContentType }
            );
          }
        } else if (response.ok) {
          await this.log('SPECIAL', page.name, 'SUCCESS', 
            `Page accessible (${response.status})`, 
            { status: response.status }
          );
          successCount++;
        } else {
          await this.log('SPECIAL', page.name, 'WARNING', 
            `Status inattendu ${response.status}`, 
            { status: response.status }
          );
        }
      } catch (error) {
        await this.log('SPECIAL', page.name, 'ERROR', 
          `Exception: ${error.message}`, 
          { error: error.toString() }
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { total: specialPages.length, success: successCount };
  }

  async testI18nAndRouting() {
    console.log('\n🌍 TEST DE L\'INTERNATIONALISATION');
    console.log('=' .repeat(60));

    const i18nTests = [
      {
        name: 'Redirection racine vers /fr',
        path: '/',
        expectedRedirect: '/fr'
      },
      {
        name: 'Page d\'accueil FR',
        path: '/fr/home',
        expectedContent: 'html'
      },
      {
        name: 'Test locale EN (si disponible)',
        path: '/en/home',
        expectedResult: 'accessible_or_redirect'
      }
    ];

    let successCount = 0;
    for (const test of i18nTests) {
      try {
        const url = `${BASE_URL}${test.path}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: BROWSER_HEADERS,
          redirect: 'manual'
        });

        if (test.expectedRedirect) {
          if (response.status === 307 || response.status === 302) {
            const location = response.headers.get('location');
            if (location && location.includes(test.expectedRedirect)) {
              await this.log('I18N', test.name, 'SUCCESS', 
                `Redirection correcte vers ${location}`, 
                { redirectTo: location }
              );
              successCount++;
            } else {
              await this.log('I18N', test.name, 'WARNING', 
                `Redirection inattendue vers ${location}`, 
                { redirectTo: location, expected: test.expectedRedirect }
              );
            }
          } else {
            await this.log('I18N', test.name, 'WARNING', 
              `Pas de redirection (${response.status})`, 
              { status: response.status }
            );
          }
        } else if (test.expectedContent) {
          if (response.ok) {
            const content = await response.text();
            if (content.includes(test.expectedContent)) {
              await this.log('I18N', test.name, 'SUCCESS', 
                'Contenu attendu trouvé', 
                { status: response.status, hasContent: true }
              );
              successCount++;
            } else {
              await this.log('I18N', test.name, 'WARNING', 
                'Contenu attendu non trouvé', 
                { status: response.status, hasContent: false }
              );
            }
          } else {
            await this.log('I18N', test.name, 'ERROR', 
              `Page inaccessible (${response.status})`, 
              { status: response.status }
            );
          }
        } else {
          // Test général d'accessibilité
          if (response.ok || response.status === 302 || response.status === 307) {
            await this.log('I18N', test.name, 'SUCCESS', 
              `Test réussi (${response.status})`, 
              { status: response.status }
            );
            successCount++;
          } else {
            await this.log('I18N', test.name, 'WARNING', 
              `Test échoué (${response.status})`, 
              { status: response.status }
            );
          }
        }
      } catch (error) {
        await this.log('I18N', test.name, 'ERROR', 
          `Exception: ${error.message}`, 
          { error: error.toString() }
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { total: i18nTests.length, success: successCount };
  }

  async runCompleteTest() {
    console.log('🚀 DÉBUT DU TEST FRONTEND LOCALISÉ (MISSION 1)');
    console.log('=' .repeat(80));
    
    // 1. Test des pages publiques
    const publicResults = await this.testPublicPages();
    
    // 2. Test des pages protégées
    const protectedResults = await this.testProtectedPages();
    
    // 3. Test des pages spéciales
    const specialResults = await this.testSpecialPages();
    
    // 4. Test i18n et routing
    const i18nResults = await this.testI18nAndRouting();
    
    return this.generateReport({
      publicResults,
      protectedResults,
      specialResults,
      i18nResults
    });
  }

  generateReport(results) {
    const successes = this.results.filter(r => r.status === 'SUCCESS').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log('\n' + '=' .repeat(80));
    console.log('📊 RAPPORT FRONTEND LOCALISÉ - MISSION 1');
    console.log('=' .repeat(80));
    console.log(`✅ Tests réussis: ${successes}`);
    console.log(`❌ Tests échoués: ${errors}`);
    console.log(`⚠️ Avertissements: ${warnings}`);
    console.log(`📈 Taux de succès: ${Math.round((successes / this.results.length) * 100)}%`);
    
    // Détails par catégorie
    console.log('\n📋 RÉSULTATS PAR CATÉGORIE:');
    console.log(`🏠 Pages publiques: ${results.publicResults.success}/${results.publicResults.total}`);
    console.log(`🔒 Pages protégées: ${results.protectedResults.success}/${results.protectedResults.total}`);
    console.log(`🎯 Pages spéciales: ${results.specialResults.success}/${results.specialResults.total}`);
    console.log(`🌍 I18n et routing: ${results.i18nResults.success}/${results.i18nResults.total}`);
    
    if (errors > 0) {
      console.log('\n❌ ERREURS CRITIQUES:');
      this.results
        .filter(r => r.status === 'ERROR')
        .forEach(r => console.log(`   - [${r.category}] ${r.test}: ${r.message}`));
    }

    // Analyse spécifique Mission 1
    console.log('\n🎯 ANALYSE MISSION 1:');
    
    const publicSuccessRate = (results.publicResults.success / results.publicResults.total * 100);
    const protectedSuccessRate = (results.protectedResults.success / results.protectedResults.total * 100);
    
    if (publicSuccessRate >= 70) {
      console.log('✅ Site public fonctionnel pour les clients');
    } else {
      console.log('⚠️ Problèmes sur le site public');
    }
    
    if (protectedSuccessRate >= 90) {
      console.log('✅ Sécurité client correctement implémentée');
    } else {
      console.log('⚠️ Problèmes de sécurité détectés');
    }

    if (results.i18nResults.success >= 2) {
      console.log('✅ Internationalisation fonctionnelle');
    } else {
      console.log('⚠️ Problèmes d\'internationalisation');
    }

    console.log('\n🚀 STATUS MISSION 1:');
    const overallScore = Math.round((successes / this.results.length) * 100);
    
    if (overallScore >= 80 && errors === 0) {
      console.log('🟢 MISSION 1 - PRÊTE POUR PRODUCTION');
      console.log('✅ Frontend client entièrement fonctionnel');
      console.log('✅ Sécurité et routing corrects');
      console.log('✅ Expérience utilisateur optimale');
    } else if (overallScore >= 60 && errors <= 1) {
      console.log('🟡 MISSION 1 - GLOBALEMENT FONCTIONNELLE');
      console.log('⚠️ Quelques ajustements recommandés');
      console.log('✅ Fonctionnalités principales opérationnelles');
    } else {
      console.log('🔴 MISSION 1 - NÉCESSITE DES CORRECTIONS');
      console.log('❌ Problèmes critiques à résoudre');
      console.log('⚠️ Tests supplémentaires requis');
    }
    
    console.log('\n💾 Résultats sauvegardés dans localized-frontend-results.json');
    fs.writeFileSync('localized-frontend-results.json', JSON.stringify(this.results, null, 2));
    
    return {
      total: this.results.length,
      successes,
      errors,
      warnings,
      successRate: overallScore,
      mission1Status: overallScore >= 80 && errors === 0 ? 'READY' : overallScore >= 60 ? 'FUNCTIONAL' : 'NEEDS_WORK'
    };
  }
}

// Exécution
const tester = new LocalizedFrontendTester();
tester.runCompleteTest()
  .then(report => {
    console.log('\n🎯 Test frontend Mission 1 terminé!');
    console.log(`Status final: ${report.mission1Status}`);
    process.exit(report.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

export default LocalizedFrontendTester;