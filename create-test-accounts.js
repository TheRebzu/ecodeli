#!/usr/bin/env node

/**
 * Script pour créer les comptes de test EcoDeli
 * Respecte le cahier des charges
 */

const http = require('http');

const TEST_ACCOUNTS = [
  {
    role: 'CLIENT',
    email: 'client-complete@test.com',
    password: 'Test123!',
    firstName: 'Marie',
    lastName: 'Dubois',
    phone: '0123456789',
    address: '123 Rue de la Paix',
    city: 'Paris',
    postalCode: '75001'
  },
  {
    role: 'DELIVERER',
    email: 'deliverer-complete@test.com',
    password: 'Test123!',
    firstName: 'Jean',
    lastName: 'Martin',
    phone: '0987654321',
    address: '456 Avenue des Livreurs',
    city: 'Lyon',
    postalCode: '69000'
  },
  {
    role: 'PROVIDER',
    email: 'provider-complete@test.com',
    password: 'Test123!',
    firstName: 'Sophie',
    lastName: 'Bernard',
    phone: '0156789012',
    businessName: 'Services à Domicile SB',
    address: '789 Rue des Services',
    city: 'Marseille',
    postalCode: '13000'
  },
  {
    role: 'MERCHANT',
    email: 'merchant-complete@test.com',
    password: 'Test123!',
    firstName: 'Pierre',
    lastName: 'Durand',
    phone: '0134567890',
    companyName: 'Commerce Durand SARL',
    siret: '12345678901234',
    address: '321 Boulevard du Commerce',
    city: 'Toulouse',
    postalCode: '31000'
  },
  {
    role: 'ADMIN',
    email: 'admin-complete@test.com',
    password: 'Test123!',
    firstName: 'Admin',
    lastName: 'EcoDeli',
    phone: '0198765432',
    address: '999 Avenue de l\'Administration',
    city: 'Paris',
    postalCode: '75008'
  }
];

async function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
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
                    resolve({ statusCode: res.statusCode, data: jsonData });
                } catch {
                    resolve({ statusCode: res.statusCode, data: { raw: data } });
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

async function createTestAccounts() {
    console.log('🌱 Création des comptes de test EcoDeli...\n');

    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const account of TEST_ACCOUNTS) {
        try {
            console.log(`📝 ${account.role}: ${account.email}`);
            
            const result = await makeRequest('POST', '/api/auth/register', account);
            
            if (result.statusCode === 200) {
                console.log(`   ✅ Créé avec succès`);
                console.log(`   Message: ${result.data.message}`);
                created++;
            } else if (result.statusCode === 400 && result.data.error?.includes('existe déjà')) {
                console.log(`   ⚠️ Compte déjà existant`);
                existing++;
            } else {
                console.log(`   ❌ Erreur: ${result.data.error || 'Erreur inconnue'}`);
                if (result.data.details) {
                    result.data.details.forEach(detail => {
                        console.log(`      - ${detail.field}: ${detail.message}`);
                    });
                }
                errors++;
            }
        } catch (error) {
            console.log(`   ❌ Erreur réseau: ${error.message}`);
            errors++;
        }
        
        console.log(''); // Ligne vide
    }

    console.log('📊 Résumé:');
    console.log(`✅ Créés: ${created}`);
    console.log(`⚠️ Existants: ${existing}`);
    console.log(`❌ Erreurs: ${errors}`);
    
    if (created + existing === TEST_ACCOUNTS.length) {
        console.log('\n🎉 Tous les comptes de test sont disponibles !');
        console.log('\nVous pouvez maintenant vous connecter avec:');
        TEST_ACCOUNTS.forEach(account => {
            console.log(`- ${account.role}: ${account.email} / ${account.password}`);
        });
    } else {
        console.log('\n⚠️ Certains comptes n\'ont pas pu être créés.');
        console.log('Vérifiez que le serveur est démarré et que la base de données est accessible.');
    }

    return created + existing === TEST_ACCOUNTS.length;
}

createTestAccounts().catch(console.error);