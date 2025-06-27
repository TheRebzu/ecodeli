#!/usr/bin/env node

/**
 * Test complet de l'API EcoDeli avec gestion des cookies de session Better-Auth
 * Corrige le problème de transmission des cookies entre les requêtes
 */

const http = require('http');

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class SessionManager {
    constructor() {
        this.cookies = new Map();
    }

    // Extraire et stocker les cookies de session
    storeCookies(headers) {
        const setCookieHeaders = headers['set-cookie'];
        if (setCookieHeaders) {
            setCookieHeaders.forEach(cookieHeader => {
                const [cookiePair] = cookieHeader.split(';');
                const [name, value] = cookiePair.split('=');
                if (name && value) {
                    this.cookies.set(name.trim(), value.trim());
                }
            });
        }
    }

    // Obtenir la chaîne de cookies pour les requêtes
    getCookieHeader() {
        if (this.cookies.size === 0) return null;
        
        return Array.from(this.cookies.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    // Vérifier si on a des cookies de session
    hasSessionCookies() {
        return this.cookies.has('ecodeli-session') || 
               this.cookies.has('better-auth.session_token') ||
               Array.from(this.cookies.keys()).some(key => key.includes('session'));
    }
}

async function makeRequest(method, path, body = null, sessionManager = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EcoDeli-Session-Test/1.0'
            },
            timeout: 10000
        };

        // Ajouter les cookies de session si disponibles
        if (sessionManager && sessionManager.hasSessionCookies()) {
            const cookieHeader = sessionManager.getCookieHeader();
            if (cookieHeader) {
                options.headers['Cookie'] = cookieHeader;
            }
        }

        if (body && typeof body === 'object') {
            body = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: jsonData, 
                        raw: data,
                        headers: res.headers
                    });
                } catch {
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: { raw: data }, 
                        raw: data,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        if (body) req.write(body);
        req.end();
    });
}

async function testCompleteWorkflow() {
    console.log(`${colors.bold}${colors.blue}🧪 Test complet EcoDeli avec gestion de session${colors.reset}`);
    console.log('========================================================\n');

    const sessionManager = new SessionManager();
    let passed = 0;
    let failed = 0;

    // 1. Test de santé
    console.log('1. 🏥 Test de santé du serveur...');
    try {
        const health = await makeRequest('GET', '/api/health');
        if (health.statusCode === 200) {
            console.log(`${colors.green}   ✅ Serveur opérationnel${colors.reset}`);
            passed++;
        } else {
            console.log(`${colors.red}   ❌ Serveur non opérationnel (${health.statusCode})${colors.reset}`);
            failed++;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur: ${error.message}${colors.reset}`);
        failed++;
    }

    // 2. Authentification et récupération de session
    console.log('\n2. 🔐 Authentification client...');
    try {
        const loginResult = await makeRequest('POST', '/api/auth/login', {
            email: 'client-complete@test.com',
            password: 'Test123!'
        });

        if (loginResult.statusCode === 200 && loginResult.data.success) {
            console.log(`${colors.green}   ✅ Authentification réussie${colors.reset}`);
            
            // Stocker les cookies de session
            sessionManager.storeCookies(loginResult.headers);
            
            if (sessionManager.hasSessionCookies()) {
                console.log(`${colors.green}   ✅ Cookies de session récupérés${colors.reset}`);
                passed += 2;
            } else {
                console.log(`${colors.yellow}   ⚠️ Aucun cookie de session trouvé${colors.reset}`);
                passed++;
                failed++;
            }
        } else {
            console.log(`${colors.red}   ❌ Échec authentification: ${JSON.stringify(loginResult.data)}${colors.reset}`);
            failed += 2;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur authentification: ${error.message}${colors.reset}`);
        failed += 2;
    }

    // 3. Test session avec Better-Auth direct
    console.log('\n3. 🍪 Test session Better-Auth...');
    try {
        const sessionResult = await makeRequest('GET', '/api/auth/session', null, sessionManager);
        
        if (sessionResult.statusCode === 200 && sessionResult.data.user) {
            console.log(`${colors.green}   ✅ Session valide: ${sessionResult.data.user.email}${colors.reset}`);
            passed++;
        } else {
            console.log(`${colors.red}   ❌ Session invalide (${sessionResult.statusCode})${colors.reset}`);
            console.log(`   Réponse: ${JSON.stringify(sessionResult.data)}`);
            failed++;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur session: ${error.message}${colors.reset}`);
        failed++;
    }

    // 4. Test endpoints protégés
    console.log('\n4. 🛡️ Test endpoints protégés...');
    
    const protectedEndpoints = [
        { method: 'GET', path: '/api/client/dashboard', name: 'Dashboard client' },
        { method: 'GET', path: '/api/client/announcements', name: 'Annonces client' },
        { method: 'GET', path: '/api/client/services', name: 'Services client' }
    ];

    for (const endpoint of protectedEndpoints) {
        try {
            const result = await makeRequest(endpoint.method, endpoint.path, null, sessionManager);
            
            if (result.statusCode === 200) {
                console.log(`${colors.green}   ✅ ${endpoint.name}: OK${colors.reset}`);
                passed++;
            } else if (result.statusCode === 401 || result.statusCode === 403) {
                console.log(`${colors.red}   ❌ ${endpoint.name}: Non autorisé (${result.statusCode})${colors.reset}`);
                console.log(`   Debug: ${JSON.stringify(result.data)}`);
                failed++;
            } else {
                console.log(`${colors.yellow}   ⚠️ ${endpoint.name}: Status ${result.statusCode}${colors.reset}`);
                failed++;
            }
        } catch (error) {
            console.log(`${colors.red}   ❌ ${endpoint.name}: ${error.message}${colors.reset}`);
            failed++;
        }
    }

    // 5. Test création d'annonce (si session valide)
    if (sessionManager.hasSessionCookies()) {
        console.log('\n5. 📝 Test création d\'annonce...');
        try {
            const announcementData = {
                title: "Test livraison urgente",
                description: "Test de création d'annonce via API",
                pickupAddress: "1 Place de la République, 75003 Paris",
                deliveryAddress: "Tour Eiffel, 75007 Paris",
                packageType: "DOCUMENT",
                weight: 0.5,
                scheduledPickupDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2h
                maxDeliveryTime: 60,
                price: 15.00
            };

            const createResult = await makeRequest('POST', '/api/client/announcements', announcementData, sessionManager);
            
            if (createResult.statusCode === 201 || createResult.statusCode === 200) {
                console.log(`${colors.green}   ✅ Annonce créée avec succès${colors.reset}`);
                
                if (createResult.data.id) {
                    console.log(`   ID: ${createResult.data.id}`);
                    passed++;
                    
                    // Test récupération de l'annonce créée
                    try {
                        const getResult = await makeRequest('GET', `/api/client/announcements/${createResult.data.id}`, null, sessionManager);
                        if (getResult.statusCode === 200) {
                            console.log(`${colors.green}   ✅ Récupération annonce: OK${colors.reset}`);
                            passed++;
                        } else {
                            console.log(`${colors.red}   ❌ Récupération annonce échoué (${getResult.statusCode})${colors.reset}`);
                            failed++;
                        }
                    } catch (error) {
                        console.log(`${colors.red}   ❌ Erreur récupération: ${error.message}${colors.reset}`);
                        failed++;
                    }
                } else {
                    console.log(`${colors.yellow}   ⚠️ Annonce créée mais sans ID${colors.reset}`);
                    passed++;
                }
            } else {
                console.log(`${colors.red}   ❌ Création annonce échoué (${createResult.statusCode})${colors.reset}`);
                console.log(`   Erreur: ${JSON.stringify(createResult.data)}`);
                failed++;
            }
        } catch (error) {
            console.log(`${colors.red}   ❌ Erreur création annonce: ${error.message}${colors.reset}`);
            failed++;
        }
    } else {
        console.log(`\n5. ${colors.yellow}⚠️ Test annonce ignoré (pas de session valide)${colors.reset}`);
        failed++;
    }

    // 6. Debug session
    console.log('\n6. 🔍 Debug session...');
    console.log(`   Cookies stockés: ${sessionManager.cookies.size}`);
    sessionManager.cookies.forEach((value, key) => {
        console.log(`   - ${key}: ${value.substring(0, 20)}...`);
    });

    // Résumé
    console.log(`\n${colors.bold}📊 Résumé des tests:${colors.reset}`);
    console.log(`${colors.green}✅ Réussis: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Échoués: ${failed}${colors.reset}`);
    
    const total = passed + failed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    if (successRate >= 70) {
        console.log(`\n${colors.green}${colors.bold}🎉 Tests majoritairement réussis (${successRate}%)${colors.reset}`);
        
        if (failed > 0) {
            console.log(`\n${colors.blue}💡 Améliorations possibles:${colors.reset}`);
            console.log('1. Vérifier la configuration Better-Auth dans src/lib/auth.ts');
            console.log('2. S\'assurer que les cookies httpOnly sont correctement configurés');
            console.log('3. Vérifier les middlewares d\'autorisation dans les API routes');
            console.log('4. Tester avec le serveur de développement redémarré');
        }
    } else {
        console.log(`\n${colors.red}${colors.bold}💥 Problèmes critiques détectés (${successRate}%)${colors.reset}`);
        console.log(`${colors.red}La gestion de session doit être corrigée avant de continuer.${colors.reset}`);
    }
    
    return successRate >= 70;
}

// Lancement des tests
testCompleteWorkflow().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error(`${colors.red}Erreur critique:${colors.reset}`, error);
    process.exit(1);
});