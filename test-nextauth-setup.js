#!/usr/bin/env node

/**
 * Test script pour vérifier la configuration NextAuth
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

async function makeRequest(method, path, body = null, cookies = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'NextAuth-Test/1.0'
            },
            timeout: 10000
        };

        if (cookies) {
            options.headers['Cookie'] = cookies;
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

async function testNextAuthSetup() {
    console.log(`${colors.bold}${colors.blue}🔐 Test configuration NextAuth EcoDeli${colors.reset}`);
    console.log('================================================\n');

    let passed = 0;
    let failed = 0;

    // 1. Test health check
    console.log('1. 🏥 Test santé du serveur...');
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

    // 2. Test NextAuth endpoints
    console.log('\n2. 🔑 Test endpoints NextAuth...');
    
    const authEndpoints = [
        { path: '/api/auth/csrf', name: 'CSRF Token' },
        { path: '/api/auth/session', name: 'Session' },
        { path: '/api/auth/providers', name: 'Providers' }
    ];

    for (const endpoint of authEndpoints) {
        try {
            const result = await makeRequest('GET', endpoint.path);
            if (result.statusCode === 200) {
                console.log(`${colors.green}   ✅ ${endpoint.name}: OK${colors.reset}`);
                passed++;
            } else {
                console.log(`${colors.red}   ❌ ${endpoint.name}: Status ${result.statusCode}${colors.reset}`);
                failed++;
            }
        } catch (error) {
            console.log(`${colors.red}   ❌ ${endpoint.name}: ${error.message}${colors.reset}`);
            failed++;
        }
    }

    // 3. Test inscription
    console.log('\n3. 📝 Test inscription utilisateur...');
    const testUser = {
        email: `test-${Date.now()}@nextauth.test`,
        password: 'Test123!',
        name: 'Test User NextAuth',
        role: 'CLIENT'
    };

    try {
        const registerResult = await makeRequest('POST', '/api/auth/register', testUser);
        
        if (registerResult.statusCode === 200 && registerResult.data.success) {
            console.log(`${colors.green}   ✅ Inscription réussie: ${testUser.email}${colors.reset}`);
            passed++;

            // 4. Test connexion avec NextAuth
            console.log('\n4. 🚪 Test connexion NextAuth...');
            try {
                // D'abord récupérer le CSRF token
                const csrfResult = await makeRequest('GET', '/api/auth/csrf');
                const csrfToken = csrfResult.data.csrfToken;

                // Ensuite tenter la connexion
                const loginData = {
                    email: testUser.email,
                    password: testUser.password,
                    csrfToken: csrfToken,
                    callbackUrl: 'http://localhost:3000/dashboard',
                    json: true
                };

                const loginResult = await makeRequest('POST', '/api/auth/callback/credentials', loginData);
                
                if (loginResult.statusCode === 200 || loginResult.statusCode === 302) {
                    console.log(`${colors.green}   ✅ Connexion NextAuth réussie${colors.reset}`);
                    passed++;

                    // Extraire les cookies de session
                    const setCookieHeaders = loginResult.headers['set-cookie'];
                    if (setCookieHeaders) {
                        const sessionCookie = setCookieHeaders.find(cookie => 
                            cookie.includes('next-auth.session-token') || 
                            cookie.includes('__Secure-next-auth.session-token')
                        );
                        
                        if (sessionCookie) {
                            console.log(`${colors.green}   ✅ Cookie de session NextAuth récupéré${colors.reset}`);
                            passed++;

                            // 5. Test récupération session
                            console.log('\n5. 👤 Test récupération session...');
                            try {
                                const sessionResult = await makeRequest('GET', '/api/auth/session', null, sessionCookie);
                                
                                if (sessionResult.statusCode === 200 && sessionResult.data.user) {
                                    console.log(`${colors.green}   ✅ Session récupérée: ${sessionResult.data.user.email}${colors.reset}`);
                                    console.log(`   Rôle: ${sessionResult.data.user.role}`);
                                    passed++;
                                } else {
                                    console.log(`${colors.red}   ❌ Session non récupérée${colors.reset}`);
                                    failed++;
                                }
                            } catch (error) {
                                console.log(`${colors.red}   ❌ Erreur récupération session: ${error.message}${colors.reset}`);
                                failed++;
                            }

                            // 6. Test endpoint protégé
                            console.log('\n6. 🛡️ Test endpoint protégé...');
                            try {
                                const protectedResult = await makeRequest('GET', '/api/auth/me', null, sessionCookie);
                                
                                if (protectedResult.statusCode === 200) {
                                    console.log(`${colors.green}   ✅ Endpoint protégé accessible${colors.reset}`);
                                    passed++;
                                } else {
                                    console.log(`${colors.red}   ❌ Endpoint protégé non accessible (${protectedResult.statusCode})${colors.reset}`);
                                    failed++;
                                }
                            } catch (error) {
                                console.log(`${colors.red}   ❌ Erreur endpoint protégé: ${error.message}${colors.reset}`);
                                failed++;
                            }

                        } else {
                            console.log(`${colors.red}   ❌ Cookie de session non trouvé${colors.reset}`);
                            failed++;
                        }
                    } else {
                        console.log(`${colors.red}   ❌ Aucun cookie de session${colors.reset}`);
                        failed++;
                    }
                } else {
                    console.log(`${colors.red}   ❌ Connexion échouée (${loginResult.statusCode})${colors.reset}`);
                    console.log(`   Réponse: ${JSON.stringify(loginResult.data)}`);
                    failed++;
                }
            } catch (error) {
                console.log(`${colors.red}   ❌ Erreur connexion: ${error.message}${colors.reset}`);
                failed++;
            }
        } else {
            console.log(`${colors.red}   ❌ Inscription échouée: ${JSON.stringify(registerResult.data)}${colors.reset}`);
            failed++;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur inscription: ${error.message}${colors.reset}`);
        failed++;
    }

    // Résumé
    console.log(`\n${colors.bold}📊 Résumé des tests NextAuth:${colors.reset}`);
    console.log(`${colors.green}✅ Réussis: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Échoués: ${failed}${colors.reset}`);
    
    const total = passed + failed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    if (successRate >= 70) {
        console.log(`\n${colors.green}${colors.bold}🎉 NextAuth configuré avec succès (${successRate}%)${colors.reset}`);
        console.log(`${colors.green}L'authentification EcoDeli avec NextAuth fonctionne !${colors.reset}`);
    } else {
        console.log(`\n${colors.red}${colors.bold}💥 Problèmes de configuration NextAuth (${successRate}%)${colors.reset}`);
        console.log(`${colors.red}Vérifiez la configuration et relancez les tests.${colors.reset}`);
    }
    
    return successRate >= 70;
}

// Lancement des tests
testNextAuthSetup().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error(`${colors.red}Erreur critique:${colors.reset}`, error);
    process.exit(1);
});