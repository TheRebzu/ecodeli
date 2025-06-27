#!/usr/bin/env node

/**
 * Script de diagnostic pour l'authentification EcoDeli
 * Aide à identifier les problèmes de configuration Better-Auth
 */

const http = require('http');

async function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EcoDeli-Debug/1.0'
            },
            timeout: 5000
        };

        if (body) {
            body = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({ statusCode: res.statusCode, data: jsonData, raw: data });
                } catch {
                    resolve({ statusCode: res.statusCode, data: { raw: data }, raw: data });
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

async function debugAuth() {
    console.log('🔍 Diagnostic d\'authentification EcoDeli');
    console.log('========================================');

    // 1. Test de santé serveur
    console.log('\n1. 🏥 Test de santé du serveur...');
    try {
        const health = await makeRequest('GET', '/api/health');
        console.log(`   Status: ${health.statusCode}`);
        console.log(`   Response: ${JSON.stringify(health.data, null, 2)}`);
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
        return;
    }

    // 2. Test endpoint Better-Auth directement
    console.log('\n2. 🔐 Test Better-Auth direct...');
    try {
        const betterAuthTest = await makeRequest('POST', '/api/auth/sign-in/email', {
            email: 'client-complete@test.com',
            password: 'Test123!'
        });
        console.log(`   Status: ${betterAuthTest.statusCode}`);
        console.log(`   Response: ${JSON.stringify(betterAuthTest.data, null, 2)}`);
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }

    // 3. Test endpoint login personnalisé
    console.log('\n3. 🚪 Test endpoint login personnalisé...');
    try {
        const customLogin = await makeRequest('POST', '/api/auth/login', {
            email: 'client-complete@test.com',
            password: 'Test123!'
        });
        console.log(`   Status: ${customLogin.statusCode}`);
        console.log(`   Response: ${JSON.stringify(customLogin.data, null, 2)}`);
        
        if (customLogin.statusCode >= 400) {
            console.log(`   Raw response: ${customLogin.raw}`);
        }
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }

    // 4. Test avec données invalides
    console.log('\n4. ❌ Test avec données invalides...');
    try {
        const invalidLogin = await makeRequest('POST', '/api/auth/login', {
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
        });
        console.log(`   Status: ${invalidLogin.statusCode}`);
        console.log(`   Response: ${JSON.stringify(invalidLogin.data, null, 2)}`);
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }

    // 5. Test sans données
    console.log('\n5. 📭 Test sans données...');
    try {
        const emptyLogin = await makeRequest('POST', '/api/auth/login', {});
        console.log(`   Status: ${emptyLogin.statusCode}`);
        console.log(`   Response: ${JSON.stringify(emptyLogin.data, null, 2)}`);
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }

    // 6. Test endpoints Better-Auth disponibles
    console.log('\n6. 📋 Test endpoints Better-Auth disponibles...');
    const betterAuthPaths = [
        '/api/auth/session',
        '/api/auth/sign-up/email',
        '/api/auth/sign-out'
    ];

    for (const path of betterAuthPaths) {
        try {
            const result = await makeRequest('GET', path);
            console.log(`   ${path}: Status ${result.statusCode}`);
        } catch (error) {
            console.log(`   ${path}: ❌ ${error.message}`);
        }
    }

    // 7. Recommandations
    console.log('\n📝 Recommandations de diagnostic:');
    console.log('================================');
    console.log('1. Vérifiez que la base de données est démarrée');
    console.log('2. Vérifiez que les migrations Prisma sont appliquées: npm run db:push');
    console.log('3. Créez les utilisateurs de test: npm run setup-test-users');
    console.log('4. Vérifiez les variables d\'environnement Better-Auth');
    console.log('5. Vérifiez les logs du serveur pour plus de détails');
}

debugAuth().catch(console.error);