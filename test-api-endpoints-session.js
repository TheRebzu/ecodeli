#!/usr/bin/env node

/**
 * Script de test complet des endpoints API EcoDeli avec gestion des sessions
 * Utilise les cookies de session Better-Auth au lieu des tokens Bearer
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
    baseUrl: 'http://localhost:3000',
    timeout: 10000,
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Couleurs pour la console
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Variables globales pour les tests
let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// Store des cookies de session pour chaque utilisateur
let sessionCookies = {
    client: null,
    deliverer: null,
    admin: null
};

let testData = {
    announcementId: null,
    paymentIntentId: null,
    validationCode: null,
    deliveryId: null
};

// Fonction utilitaire pour les requêtes HTTP avec gestion des cookies
function makeRequest(method, path, cookies = null, body = null, expectedStatus = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, CONFIG.baseUrl);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EcoDeli-API-Test-Session/1.0'
            },
            timeout: CONFIG.timeout
        };

        // Ajouter les cookies de session si disponibles
        if (cookies) {
            options.headers['Cookie'] = cookies;
        }

        if (body && typeof body === 'object') {
            body = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = lib.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const responseData = data ? JSON.parse(data) : {};
                    
                    // Extraire les cookies Set-Cookie pour les sessions
                    const setCookieHeaders = res.headers['set-cookie'];
                    let sessionCookie = null;
                    
                    if (setCookieHeaders) {
                        // Chercher le cookie de session Better-Auth
                        for (const cookie of setCookieHeaders) {
                            if (cookie.includes('ecodeli-session') || cookie.includes('better-auth')) {
                                sessionCookie = cookie.split(';')[0]; // Prendre seulement la partie nom=valeur
                                break;
                            }
                        }
                    }
                    
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData,
                        rawData: data,
                        sessionCookie
                    });
                } catch (parseError) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: { rawResponse: data },
                        rawData: data,
                        parseError: parseError.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${CONFIG.timeout}ms`));
        });

        if (body) {
            req.write(body);
        }
        
        req.end();
    });
}

// Fonction de logging
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelColors = {
        INFO: colors.blue,
        SUCCESS: colors.green,
        ERROR: colors.red,
        WARN: colors.yellow,
        DEBUG: colors.magenta
    };
    
    const color = levelColors[level] || colors.reset;
    console.log(`${color}[${timestamp}] ${level}: ${message}${colors.reset}`);
    
    if (data && CONFIG.verbose) {
        console.log(`${colors.cyan}${JSON.stringify(data, null, 2)}${colors.reset}`);
    }
}

// Fonction de test avec assertions
async function runTest(name, testFunction) {
    try {
        log('INFO', `🧪 Test: ${name}`);
        await testFunction();
        testResults.passed++;
        log('SUCCESS', `✅ ${name} - PASSED`);
        return true;
    } catch (error) {
        testResults.failed++;
        testResults.errors.push({ test: name, error: error.message });
        log('ERROR', `❌ ${name} - FAILED: ${error.message}`);
        return false;
    }
}

// Assertions
function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
    }
}

function assertStatusCode(response, expectedCode, message = '') {
    if (response.statusCode !== expectedCode) {
        throw new Error(`${message} - Expected status ${expectedCode}, got ${response.statusCode}. Response: ${JSON.stringify(response.data)}`);
    }
}

function assertExists(value, fieldName) {
    if (!value) {
        throw new Error(`${fieldName} should exist but is ${value}`);
    }
}

// Tests spécifiques

async function testServerHealth() {
    const response = await makeRequest('GET', '/api/health');
    assertStatusCode(response, 200, 'Health check should return 200');
    assertExists(response.data.status || response.data.message, 'Health response should have status');
}

async function testClientAuthentication() {
    const response = await makeRequest('POST', '/api/auth/login', null, {
        email: 'client-complete@test.com',
        password: 'Test123!'
    });
    
    assertStatusCode(response, 200, 'Client login should succeed');
    assertExists(response.data.success, 'Login success confirmation');
    assertExists(response.data.user, 'User data in response');
    
    // Stocker le cookie de session
    if (response.sessionCookie) {
        sessionCookies.client = response.sessionCookie;
        log('DEBUG', 'Client session cookie obtained', { cookieExists: !!response.sessionCookie });
    } else {
        // Si pas de cookie dans la réponse, essayer d'utiliser Better-Auth directement
        log('WARN', 'No session cookie in login response, trying Better-Auth session');
    }
}

async function testDelivererAuthentication() {
    const response = await makeRequest('POST', '/api/auth/login', null, {
        email: 'deliverer-complete@test.com',
        password: 'Test123!'
    });
    
    assertStatusCode(response, 200, 'Deliverer login should succeed');
    assertExists(response.data.success, 'Login success confirmation');
    
    if (response.sessionCookie) {
        sessionCookies.deliverer = response.sessionCookie;
    }
}

async function testAdminAuthentication() {
    const response = await makeRequest('POST', '/api/auth/login', null, {
        email: 'admin-complete@test.com',
        password: 'Test123!'
    });
    
    assertStatusCode(response, 200, 'Admin login should succeed');
    assertExists(response.data.success, 'Login success confirmation');
    
    if (response.sessionCookie) {
        sessionCookies.admin = response.sessionCookie;
    }
}

async function testAnnouncementCreation() {
    const announcementData = {
        title: 'Test livraison API avec sessions',
        description: 'Test complet du workflow via script Node.js avec cookies',
        type: 'DOCUMENT',
        isUrgent: true,
        pickupAddress: '110 rue de Flandre, 75019 Paris',
        deliveryAddress: '1 Place du Châtelet, 75001 Paris',
        pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        deliveryDate: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        basePrice: 18.75,
        currency: 'EUR',
        weight: 0.3,
        dimensions: {
            length: 25,
            width: 18,
            height: 3
        },
        specialInstructions: 'Test automatique avec sessions - Ne pas livrer réellement'
    };
    
    // Utiliser le cookie de session client
    const response = await makeRequest('POST', '/api/client/announcements', sessionCookies.client, announcementData);
    
    assertStatusCode(response, 201, 'Announcement creation should return 201');
    assertExists(response.data.id, 'Announcement ID');
    
    testData.announcementId = response.data.id;
    log('DEBUG', 'Announcement created', { id: testData.announcementId });
}

async function testPaymentIntentCreation() {
    const response = await makeRequest('POST', `/api/client/announcements/${testData.announcementId}/payment`, sessionCookies.client, {
        confirmImmediately: false
    });
    
    assertStatusCode(response, 201, 'Payment intent creation should return 201');
    assertExists(response.data.paymentIntent, 'Payment intent object');
    assertExists(response.data.paymentIntent.id, 'Payment intent ID');
    
    testData.paymentIntentId = response.data.paymentIntent.id;
    log('DEBUG', 'PaymentIntent created', { id: testData.paymentIntentId });
}

async function testAnnouncementStatus() {
    const response = await makeRequest('GET', `/api/client/announcements/${testData.announcementId}`, sessionCookies.client);
    
    assertStatusCode(response, 200, 'Get announcement should return 200');
    assertExists(response.data.id, 'Announcement ID in response');
    
    log('DEBUG', 'Announcement status', { status: response.data.status });
}

async function testTrackingEndpoint() {
    const response = await makeRequest('GET', `/api/client/announcements/${testData.announcementId}/tracking`, sessionCookies.client);
    
    assertStatusCode(response, 200, 'Tracking endpoint should return 200');
    assertExists(response.data.announcement, 'Tracking data should include announcement');
    
    log('DEBUG', 'Tracking data retrieved', { 
        status: response.data.announcement?.status,
        hasDelivery: !!response.data.delivery 
    });
}

async function testCancellationWorkflow() {
    // Créer une nouvelle annonce pour tester l'annulation
    const announcementData = {
        title: 'Test annulation avec sessions',
        description: 'Annonce créée pour tester la fonctionnalité d\'annulation',
        type: 'PACKAGE',
        pickupAddress: '110 rue de Flandre, 75019 Paris',
        deliveryAddress: '1 Place du Châtelet, 75001 Paris',
        basePrice: 12.00
    };
    
    const createResponse = await makeRequest('POST', '/api/client/announcements', sessionCookies.client, announcementData);
    
    assertStatusCode(createResponse, 201, 'Test announcement for cancellation should be created');
    const cancelAnnouncementId = createResponse.data.id;
    
    // Obtenir les conditions d'annulation
    const conditionsResponse = await makeRequest('GET', `/api/client/announcements/${cancelAnnouncementId}/cancel`, sessionCookies.client);
    
    assertStatusCode(conditionsResponse, 200, 'Cancellation conditions should be available');
    
    // Effectuer l'annulation
    const cancelResponse = await makeRequest('POST', `/api/client/announcements/${cancelAnnouncementId}/cancel`, sessionCookies.client, {
        reason: 'Test automatique d\'annulation via script Node.js avec sessions',
        confirmCancel: true
    });
    
    assertStatusCode(cancelResponse, 200, 'Cancellation should succeed');
    assertExists(cancelResponse.data.success, 'Cancellation success confirmation');
    
    log('DEBUG', 'Cancellation test completed', { announcementId: cancelAnnouncementId });
}

async function testErrorHandling() {
    // Test avec un ID d'annonce inexistant
    const response = await makeRequest('GET', `/api/client/announcements/nonexistent-id`, sessionCookies.client);
    
    // Doit retourner 404 ou 400
    if (![400, 404].includes(response.statusCode)) {
        throw new Error(`Expected 400 or 404 for nonexistent announcement, got ${response.statusCode}`);
    }
    
    // Test sans authentification
    const unauthResponse = await makeRequest('GET', `/api/client/announcements/${testData.announcementId}`);
    
    if (![401, 403].includes(unauthResponse.statusCode)) {
        throw new Error(`Expected 401 or 403 for unauthenticated request, got ${unauthResponse.statusCode}`);
    }
}

// Fonction principale
async function runAllTests() {
    console.log(`${colors.bold}${colors.blue}🚀 EcoDeli API Test Suite (Session-based)${colors.reset}`);
    console.log(`${colors.cyan}Base URL: ${CONFIG.baseUrl}${colors.reset}`);
    console.log(`${colors.cyan}Authentication: Better-Auth Sessions (Cookies)${colors.reset}`);
    console.log(`${colors.cyan}Timeout: ${CONFIG.timeout}ms${colors.reset}`);
    console.log(`${colors.cyan}Verbose: ${CONFIG.verbose}${colors.reset}\n`);
    
    const startTime = Date.now();
    
    // Tests dans l'ordre logique
    const tests = [
        ['Server Health Check', testServerHealth],
        ['Client Authentication', testClientAuthentication],
        ['Deliverer Authentication', testDelivererAuthentication],
        ['Admin Authentication', testAdminAuthentication],
        ['Announcement Creation', testAnnouncementCreation],
        ['Payment Intent Creation', testPaymentIntentCreation],
        ['Announcement Status Check', testAnnouncementStatus],
        ['Tracking Endpoint', testTrackingEndpoint],
        ['Cancellation Workflow', testCancellationWorkflow],
        ['Error Handling', testErrorHandling]
    ];
    
    for (const [name, testFn] of tests) {
        await runTest(name, testFn);
        
        // Pause entre les tests pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Résumé final
    console.log(`\n${colors.bold}${colors.blue}📊 Test Results Summary${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.cyan}⏱️ Duration: ${duration}ms${colors.reset}`);
    
    if (testResults.errors.length > 0) {
        console.log(`\n${colors.red}${colors.bold}❌ Errors:${colors.reset}`);
        testResults.errors.forEach(({ test, error }) => {
            console.log(`${colors.red}  • ${test}: ${error}${colors.reset}`);
        });
    }
    
    if (testData.announcementId) {
        console.log(`\n${colors.cyan}📋 Test Data:${colors.reset}`);
        console.log(`${colors.cyan}  • Announcement ID: ${testData.announcementId}${colors.reset}`);
        console.log(`${colors.cyan}  • Payment Intent ID: ${testData.paymentIntentId || 'N/A'}${colors.reset}`);
        console.log(`${colors.cyan}  • Sessions Active: ${Object.values(sessionCookies).filter(Boolean).length}/3${colors.reset}`);
    }
    
    const success = testResults.failed === 0;
    
    if (success) {
        console.log(`\n${colors.green}${colors.bold}🎉 All tests passed! EcoDeli API with sessions is working correctly.${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}${colors.bold}💥 Some tests failed. Check the errors above.${colors.reset}`);
        process.exit(1);
    }
}

// Gestion des erreurs globales
process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', 'Unhandled Rejection at:', promise);
    log('ERROR', 'Reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log('ERROR', 'Uncaught Exception:', error.message);
    console.error(error.stack);
    process.exit(1);
});

// Démarrage des tests
if (require.main === module) {
    runAllTests().catch(error => {
        log('ERROR', 'Test suite failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    makeRequest,
    testResults
};