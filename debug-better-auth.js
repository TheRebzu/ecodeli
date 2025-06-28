#!/usr/bin/env node

/**
 * Script de diagnostic pour Better-Auth direct
 * Teste les endpoints Better-Auth natifs
 */

const http = require('http');

async function makeRequest(method, path, cookies = null, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Debug-Better-Auth/1.0'
            },
            timeout: 5000
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
                    
                    // Extraire les cookies
                    const setCookieHeaders = res.headers['set-cookie'];
                    let cookies = null;
                    
                    if (setCookieHeaders) {
                        cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
                    }
                    
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: jsonData, 
                        raw: data,
                        cookies,
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

async function debugBetterAuth() {
    console.log('🔍 Diagnostic Better-Auth Direct');
    console.log('=================================');

    // 1. Test endpoint Better-Auth sign-in
    console.log('\n1. 🔐 Test Better-Auth sign-in direct...');
    try {
        const signInResult = await makeRequest('POST', '/api/auth/sign-in/email', null, {
            email: 'client-complete@test.com',
            password: 'Test123!'
        });
        
        console.log(`   Status: ${signInResult.statusCode}`);
        console.log(`   Response: ${JSON.stringify(signInResult.data, null, 2)}`);
        console.log(`   Cookies: ${signInResult.cookies || 'None'}`);
        
        if (signInResult.cookies) {
            // 2. Test avec les cookies de session
            console.log('\n2. 🍪 Test avec cookies de session...');
            
            const sessionTest = await makeRequest('GET', '/api/auth/session', signInResult.cookies);
            console.log(`   Status: ${sessionTest.statusCode}`);
            console.log(`   Response: ${JSON.stringify(sessionTest.data, null, 2)}`);
            
            // 3. Test d'un endpoint protégé
            console.log('\n3. 🛡️ Test endpoint protégé avec session...');
            
            const protectedTest = await makeRequest('GET', '/api/client/announcements', signInResult.cookies);
            console.log(`   Status: ${protectedTest.statusCode}`);
            console.log(`   Response: ${JSON.stringify(protectedTest.data, null, 2)}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }

    // 4. Test de notre endpoint login personnalisé
    console.log('\n4. 🚪 Test endpoint login personnalisé...');
    try {
        const customLogin = await makeRequest('POST', '/api/auth/login', null, {
            email: 'client-complete@test.com',
            password: 'Test123!'
        });
        
        console.log(`   Status: ${customLogin.statusCode}`);
        console.log(`   Response: ${JSON.stringify(customLogin.data, null, 2)}`);
        console.log(`   Cookies: ${customLogin.cookies || 'None'}`);
        
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }

    // 5. Test des endpoints disponibles
    console.log('\n5. 📋 Endpoints Better-Auth disponibles...');
    const endpoints = [
        '/api/auth/session',
        '/api/auth/sign-out',
        '/api/auth/me'
    ];

    for (const endpoint of endpoints) {
        try {
            const result = await makeRequest('GET', endpoint);
            console.log(`   ${endpoint}: Status ${result.statusCode}`);
        } catch (error) {
            console.log(`   ${endpoint}: ❌ ${error.message}`);
        }
    }

    console.log('\n📝 Résultats:');
    console.log('- Si Better-Auth direct fonctionne, le problème est dans notre endpoint personnalisé');
    console.log('- Si les cookies sont présents, on peut les utiliser pour les tests');
    console.log('- Sinon, il faut reconfigurer Better-Auth ou utiliser une autre approche');
}

debugBetterAuth().catch(console.error);