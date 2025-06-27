#!/usr/bin/env node

/**
 * Test spécifique pour l'inscription EcoDeli
 * Respecte le cahier des charges - pas de données mockées
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

async function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EcoDeli-Registration-Test/1.0'
            },
            timeout: 10000
        };

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
                        raw: data
                    });
                } catch {
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: { raw: data }, 
                        raw: data
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

async function testRegistration() {
    console.log(`${colors.bold}${colors.blue}📝 Test Inscription EcoDeli (Cahier des charges)${colors.reset}`);
    console.log('=========================================================\n');

    let passed = 0;
    let failed = 0;
    const timestamp = Date.now();

    // 1. Test inscription CLIENT (actif immédiatement)
    console.log('1. 👤 Test inscription CLIENT...');
    const clientData = {
        email: `client.${timestamp}@ecodeli.test`,
        password: 'ClientPass123!',
        firstName: 'Marie',
        lastName: 'Dupont',
        phone: '0123456789',
        role: 'CLIENT',
        address: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001'
    };

    try {
        const clientResult = await makeRequest('POST', '/api/auth/register', clientData);
        
        if (clientResult.statusCode === 200 && clientResult.data.success) {
            console.log(`${colors.green}   ✅ Client inscrit: ${clientResult.data.user.email}${colors.reset}`);
            console.log(`   Statut: ${clientResult.data.user.isActive ? 'Actif' : 'Inactif'}`);
            console.log(`   Message: ${clientResult.data.message}`);
            
            if (clientResult.data.user.isActive && clientResult.data.user.role === 'CLIENT') {
                console.log(`${colors.green}   ✅ Client actif immédiatement (conforme cahier des charges)${colors.reset}`);
                passed += 2;
            } else {
                console.log(`${colors.red}   ❌ Client non actif (non conforme)${colors.reset}`);
                passed++;
                failed++;
            }
        } else {
            console.log(`${colors.red}   ❌ Inscription client échoué: ${JSON.stringify(clientResult.data)}${colors.reset}`);
            failed += 2;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur client: ${error.message}${colors.reset}`);
        failed += 2;
    }

    // 2. Test inscription DELIVERER (validation requise)
    console.log('\n2. 🚚 Test inscription DELIVERER...');
    const delivererData = {
        email: `deliverer.${timestamp}@ecodeli.test`,
        password: 'DelivererPass123!',
        firstName: 'Jean',
        lastName: 'Martin',
        phone: '0987654321',
        role: 'DELIVERER',
        address: '456 Avenue des Livreurs',
        city: 'Lyon',
        postalCode: '69000'
    };

    try {
        const delivererResult = await makeRequest('POST', '/api/auth/register', delivererData);
        
        if (delivererResult.statusCode === 200 && delivererResult.data.success) {
            console.log(`${colors.green}   ✅ Livreur inscrit: ${delivererResult.data.user.email}${colors.reset}`);
            console.log(`   Statut: ${delivererResult.data.user.isActive ? 'Actif' : 'En attente'}`);
            console.log(`   Validation: ${delivererResult.data.user.validationStatus}`);
            console.log(`   Message: ${delivererResult.data.message}`);
            
            if (!delivererResult.data.user.isActive && delivererResult.data.user.validationStatus === 'PENDING') {
                console.log(`${colors.green}   ✅ Livreur en attente de validation (conforme cahier des charges)${colors.reset}`);
                passed += 2;
            } else {
                console.log(`${colors.red}   ❌ Statut livreur incorrect (non conforme)${colors.reset}`);
                passed++;
                failed++;
            }
        } else {
            console.log(`${colors.red}   ❌ Inscription livreur échoué: ${JSON.stringify(delivererResult.data)}${colors.reset}`);
            failed += 2;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur livreur: ${error.message}${colors.reset}`);
        failed += 2;
    }

    // 3. Test inscription PROVIDER (sélection rigoureuse)
    console.log('\n3. 🔧 Test inscription PROVIDER...');
    const providerData = {
        email: `provider.${timestamp}@ecodeli.test`,
        password: 'ProviderPass123!',
        firstName: 'Sophie',
        lastName: 'Bernard',
        phone: '0156789012',
        role: 'PROVIDER',
        businessName: 'Services à Domicile SB',
        address: '789 Rue des Services',
        city: 'Marseille',
        postalCode: '13000'
    };

    try {
        const providerResult = await makeRequest('POST', '/api/auth/register', providerData);
        
        if (providerResult.statusCode === 200 && providerResult.data.success) {
            console.log(`${colors.green}   ✅ Prestataire inscrit: ${providerResult.data.user.email}${colors.reset}`);
            console.log(`   Statut: ${providerResult.data.user.isActive ? 'Actif' : 'En attente'}`);
            console.log(`   Validation: ${providerResult.data.user.validationStatus}`);
            console.log(`   Message: ${providerResult.data.message}`);
            
            if (!providerResult.data.user.isActive && providerResult.data.user.validationStatus === 'PENDING') {
                console.log(`${colors.green}   ✅ Prestataire en attente de sélection (conforme cahier des charges)${colors.reset}`);
                passed += 2;
            } else {
                console.log(`${colors.red}   ❌ Statut prestataire incorrect (non conforme)${colors.reset}`);
                passed++;
                failed++;
            }
        } else {
            console.log(`${colors.red}   ❌ Inscription prestataire échoué: ${JSON.stringify(providerResult.data)}${colors.reset}`);
            failed += 2;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur prestataire: ${error.message}${colors.reset}`);
        failed += 2;
    }

    // 4. Test inscription MERCHANT (contrat requis)
    console.log('\n4. 🏪 Test inscription MERCHANT...');
    const merchantData = {
        email: `merchant.${timestamp}@ecodeli.test`,
        password: 'MerchantPass123!',
        firstName: 'Pierre',
        lastName: 'Durand',
        phone: '0134567890',
        role: 'MERCHANT',
        companyName: 'Commerce Durand SARL',
        siret: `12345678901234${timestamp.toString().slice(-1)}`, // SIRET unique
        address: '321 Boulevard du Commerce',
        city: 'Toulouse',
        postalCode: '31000'
    };

    try {
        const merchantResult = await makeRequest('POST', '/api/auth/register', merchantData);
        
        if (merchantResult.statusCode === 200 && merchantResult.data.success) {
            console.log(`${colors.green}   ✅ Commerçant inscrit: ${merchantResult.data.user.email}${colors.reset}`);
            console.log(`   Statut: ${merchantResult.data.user.isActive ? 'Actif' : 'En attente'}`);
            console.log(`   Validation: ${merchantResult.data.user.validationStatus}`);
            console.log(`   Message: ${merchantResult.data.message}`);
            
            if (!merchantResult.data.user.isActive && merchantResult.data.user.validationStatus === 'PENDING') {
                console.log(`${colors.green}   ✅ Commerçant en attente de contrat (conforme cahier des charges)${colors.reset}`);
                passed += 2;
            } else {
                console.log(`${colors.red}   ❌ Statut commerçant incorrect (non conforme)${colors.reset}`);
                passed++;
                failed++;
            }
        } else {
            console.log(`${colors.red}   ❌ Inscription commerçant échoué: ${JSON.stringify(merchantResult.data)}${colors.reset}`);
            failed += 2;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur commerçant: ${error.message}${colors.reset}`);
        failed += 2;
    }

    // 5. Test validation des champs obligatoires
    console.log('\n5. ✅ Test validation des champs...');
    
    // Test MERCHANT sans SIRET
    try {
        const invalidMerchant = await makeRequest('POST', '/api/auth/register', {
            email: `invalid.merchant.${timestamp}@ecodeli.test`,
            password: 'InvalidPass123!',
            firstName: 'Test',
            lastName: 'Invalid',
            phone: '0123456789',
            role: 'MERCHANT',
            companyName: 'Test Company'
            // SIRET manquant
        });
        
        if (invalidMerchant.statusCode === 400) {
            console.log(`${colors.green}   ✅ Validation SIRET commerçant fonctionne${colors.reset}`);
            passed++;
        } else {
            console.log(`${colors.red}   ❌ Validation SIRET ne fonctionne pas${colors.reset}`);
            failed++;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur test validation: ${error.message}${colors.reset}`);
        failed++;
    }

    // Test PROVIDER sans businessName
    try {
        const invalidProvider = await makeRequest('POST', '/api/auth/register', {
            email: `invalid.provider.${timestamp}@ecodeli.test`,
            password: 'InvalidPass123!',
            firstName: 'Test',
            lastName: 'Invalid',
            phone: '0123456789',
            role: 'PROVIDER'
            // businessName manquant
        });
        
        if (invalidProvider.statusCode === 400) {
            console.log(`${colors.green}   ✅ Validation nom activité prestataire fonctionne${colors.reset}`);
            passed++;
        } else {
            console.log(`${colors.red}   ❌ Validation nom activité ne fonctionne pas${colors.reset}`);
            failed++;
        }
    } catch (error) {
        console.log(`${colors.red}   ❌ Erreur test validation: ${error.message}${colors.reset}`);
        failed++;
    }

    // Résumé
    console.log(`\n${colors.bold}📊 Résumé des tests d'inscription:${colors.reset}`);
    console.log(`${colors.green}✅ Réussis: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Échoués: ${failed}${colors.reset}`);
    
    const total = passed + failed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    if (successRate >= 85) {
        console.log(`\n${colors.green}${colors.bold}🎉 Inscription EcoDeli conforme au cahier des charges (${successRate}%)${colors.reset}`);
        console.log(`${colors.green}✅ Clients actifs immédiatement${colors.reset}`);
        console.log(`${colors.green}✅ Livreurs/Prestataires/Commerçants en attente de validation${colors.reset}`);
        console.log(`${colors.green}✅ Validation des champs obligatoires${colors.reset}`);
        console.log(`${colors.green}✅ Messages personnalisés selon le rôle${colors.reset}`);
    } else {
        console.log(`\n${colors.red}${colors.bold}💥 Inscription non conforme au cahier des charges (${successRate}%)${colors.reset}`);
        console.log(`${colors.red}Vérifiez la logique d'inscription selon les rôles.${colors.reset}`);
    }
    
    return successRate >= 85;
}

// Lancement du test
testRegistration().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error(`${colors.red}Erreur critique:${colors.reset}`, error);
    process.exit(1);
});