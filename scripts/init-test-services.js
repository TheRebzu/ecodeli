const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initTestServices() {
  console.log('🚀 Initialisation des services de tests...')

  try {
    // Vérification de la connexion à la base de données
    console.log('📊 Vérification de la connexion à la base de données...')
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Base de données connectée')

    // Création de la table SystemLog si elle n'existe pas
    console.log('📝 Vérification de la table SystemLog...')
    
    // Vérifier si la table existe
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SystemLog'
      )
    `
    
    if (!tableExists[0].exists) {
      console.log('⚠️  Table SystemLog non trouvée - création nécessaire')
      console.log('   Exécutez: npx prisma migrate dev --name add-system-logs')
    } else {
      console.log('✅ Table SystemLog disponible')
    }

    // Création d'un utilisateur de test pour les tests
    console.log('👤 Création d\'un utilisateur de test...')
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test-admin@ecodeli.com' },
      update: {},
      create: {
        email: 'test-admin@ecodeli.com',
        password: '$2b$10$test.hash.for.testing',
        role: 'ADMIN',
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'Test',
            phone: '+33123456789',
            address: '123 Rue de Test',
            city: 'Paris',
            postalCode: '75001',
            country: 'France',
            verified: true
          }
        }
      }
    })
    
    console.log('✅ Utilisateur de test créé:', testUser.email)

    // Création de quelques utilisateurs de test pour les notifications
    console.log('👥 Création d\'utilisateurs de test pour les notifications...')
    
    const testUsers = [
      {
        email: 'client-test@ecodeli.com',
        role: 'CLIENT',
        firstName: 'Client',
        lastName: 'Test'
      },
      {
        email: 'deliverer-test@ecodeli.com',
        role: 'DELIVERER',
        firstName: 'Livreur',
        lastName: 'Test'
      },
      {
        email: 'merchant-test@ecodeli.com',
        role: 'MERCHANT',
        firstName: 'Commerçant',
        lastName: 'Test'
      }
    ]

    for (const userData of testUsers) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          password: '$2b$10$test.hash.for.testing',
          role: userData.role,
          profile: {
            create: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: '+33123456789',
              address: '123 Rue de Test',
              city: 'Paris',
              postalCode: '75001',
              country: 'France',
              verified: true
            }
          }
        }
      })
    }
    
    console.log('✅ Utilisateurs de test créés')

    // Création de quelques logs de test
    console.log('📋 Création de logs de test...')
    
    const testLogs = [
      {
        level: 'INFO',
        category: 'TEST_EMAIL',
        message: 'Email de test envoyé à test@example.com',
        metadata: {
          email: 'test@example.com',
          type: 'welcome',
          subject: 'Bienvenue sur EcoDeli'
        }
      },
      {
        level: 'INFO',
        category: 'TEST_NOTIFICATION',
        message: 'Notification de test envoyée (all)',
        metadata: {
          title: 'Test Notification',
          message: 'Ceci est un test',
          targetType: 'all',
          notificationId: 'test-notification-id'
        }
      },
      {
        level: 'INFO',
        category: 'TEST_API',
        message: 'Test API health check réussi',
        metadata: {
          endpoint: '/api/health',
          method: 'GET',
          statusCode: 200,
          responseTime: 45
        }
      }
    ]

    for (const logData of testLogs) {
      await prisma.systemLog.create({
        data: logData
      })
    }
    
    console.log('✅ Logs de test créés')

    // Vérification des variables d'environnement
    console.log('🔧 Vérification des variables d\'environnement...')
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'ONESIGNAL_APP_ID',
      'ONESIGNAL_REST_API_KEY',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS'
    ]

    const missingVars = []
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar)
      }
    }

    if (missingVars.length > 0) {
      console.log('⚠️  Variables d\'environnement manquantes:')
      missingVars.forEach(varName => console.log(`   - ${varName}`))
      console.log('   Ces variables sont nécessaires pour les tests complets')
    } else {
      console.log('✅ Toutes les variables d\'environnement sont configurées')
    }

    console.log('\n🎉 Initialisation des services de tests terminée!')
    console.log('\n📋 Prochaines étapes:')
    console.log('   1. Accédez à http://localhost:3000/fr/admin/tests')
    console.log('   2. Testez les emails avec l\'adresse: test-admin@ecodeli.com')
    console.log('   3. Testez les notifications avec les utilisateurs créés')
    console.log('   4. Vérifiez les logs dans la base de données')

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécution du script
if (require.main === module) {
  initTestServices()
}

module.exports = { initTestServices } 