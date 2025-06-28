#!/usr/bin/env node

/**
 * Test rapide des endpoints critiques EcoDeli
 * Version allégée pour validation rapide
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const ENDPOINTS = [
    { method: 'GET', path: '/api/health', name: 'Health Check' },
    { method: 'GET', path: '/', name: 'Home Page' },
    { method: 'POST', path: '/api/auth/login', name: 'Auth Login', body: { email: 'test@test.com', password: 'test' } },
];

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EcoDeli-Quick-Test/1.0'
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

async function quickTest() {
    console.log('🚀 EcoDeli Quick API Test');
    console.log('==========================');
    
    let passed = 0;
    let failed = 0;
    
    for (const endpoint of ENDPOINTS) {
        try {
            console.log(`\n📡 Testing: ${endpoint.name}`);
            console.log(`   ${endpoint.method} ${endpoint.path}`);
            
            const result = await makeRequest(endpoint.method, endpoint.path, endpoint.body);
            
            if (result.statusCode < 500) {
                console.log(`   ✅ Status: ${result.statusCode} - OK`);
                passed++;
            } else {
                console.log(`   ❌ Status: ${result.statusCode} - ERROR`);
                console.log(`   Response: ${result.raw.substring(0, 100)}...`);
                failed++;
            }
        } catch (error) {
            console.log(`   💥 FAILED: ${error.message}`);
            failed++;
        }
    }
    
    console.log('\n📊 Quick Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 Basic API connectivity working!');
        console.log('💡 Run "npm run test" for complete test suite');
    } else {
        console.log('\n⚠️  Some endpoints failed. Check server status.');
    }
}

quickTest().catch(console.error);