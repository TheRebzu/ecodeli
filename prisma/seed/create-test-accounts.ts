import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

const TEST_ACCOUNTS = [
  {
    email: 'client@test.com',
    password: 'Test123!',
    role: 'CLIENT',
    firstName: 'Marie',
    lastName: 'Dubois',
    phone: '+33651234567'
  },
  {
    email: 'livreur@test.com', 
    password: 'Test123!',
    role: 'DELIVERER',
    firstName: 'Thomas',
    lastName: 'Moreau',
    phone: '+33651234568'
  },
  {
    email: 'commercant@test.com',
    password: 'Test123!', 
    role: 'MERCHANT',
    firstName: 'Jean',
    lastName: 'Martin',
    phone: '+33651234569'
  },
  {
    email: 'prestataire@test.com',
    password: 'Test123!',
    role: 'PROVIDER', 
    firstName: 'Julie',
    lastName: 'Durand',
    phone: '+33651234570'
  },
  {
    email: 'admin@test.com',
    password: 'Test123!',
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'Principal',
    phone: '+33651234571'
  }
]

async function createTestAccounts() {
  console.log('🚀 Création des comptes de test pour NextAuth...')

  try {
    for (const account of TEST_ACCOUNTS) {
      console.log(`   Création du compte ${account.role}: ${account.email}`)
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: account.email }
      })

      if (existingUser) {
        console.log(`   ⚠️  Utilisateur ${account.email} existe déjà, suppression...`)
        
        // Supprimer les relations d'abord
        await prisma.account.deleteMany({ where: { userId: existingUser.id } })
        await prisma.session.deleteMany({ where: { userId: existingUser.id } })
        
        if (existingUser.role === 'CLIENT') {
          await prisma.client.deleteMany({ where: { userId: existingUser.id } })
        }
        if (existingUser.role === 'DELIVERER') {
          await prisma.deliverer.deleteMany({ where: { userId: existingUser.id } })
        }
        if (existingUser.role === 'MERCHANT') {
          await prisma.merchant.deleteMany({ where: { userId: existingUser.id } })
        }
        if (existingUser.role === 'PROVIDER') {
          await prisma.provider.deleteMany({ where: { userId: existingUser.id } })
        }
        if (existingUser.role === 'ADMIN') {
          await prisma.admin.deleteMany({ where: { userId: existingUser.id } })
        }
        
        await prisma.profile.deleteMany({ where: { userId: existingUser.id } })
        await prisma.user.delete({ where: { id: existingUser.id } })
      }
      
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(account.password, 10)
      
      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          email: account.email,
          password: hashedPassword,
          role: account.role as any,
          isActive: true,
          validationStatus: 'VALIDATED',
          emailVerified: new Date(),
          profile: {
            create: {
              firstName: account.firstName,
              lastName: account.lastName,
              phone: account.phone,
              address: '123 Rue de Test',
              city: 'Paris',
              postalCode: '75001',
              country: 'FR',
              isVerified: true
            }
          }
        }
      })
      
      // Créer le profil spécifique selon le rôle
      switch (account.role) {
        case 'CLIENT':
          await prisma.client.create({
            data: {
              userId: user.id,
              subscriptionPlan: 'FREE',
              tutorialCompleted: false
            }
          })
          break
          
        case 'DELIVERER':
          await prisma.deliverer.create({
            data: {
              userId: user.id,
              validationStatus: 'VALIDATED',
              vehicleType: 'BICYCLE',
              isActive: true,
              availabilityZone: 'PARIS'
            }
          })
          break
          
        case 'MERCHANT':
          await prisma.merchant.create({
            data: {
              userId: user.id,
              companyName: `${account.firstName} ${account.lastName} SARL`,
              siret: `123456789${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
              isActive: true
            }
          })
          break
          
        case 'PROVIDER':
          await prisma.provider.create({
            data: {
              userId: user.id,
              validationStatus: 'VALIDATED',
              isActive: true,
              servicesOffered: ['DELIVERY']
            }
          })
          break
          
        case 'ADMIN':
          await prisma.admin.create({
            data: {
              userId: user.id,
              role: 'ADMIN',
              permissions: ['ALL']
            }
          })
          break
      }
      
      // Créer un compte NextAuth
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: user.id,
          access_token: crypto.randomUUID(),
          expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
          token_type: 'Bearer',
          scope: 'read write'
        }
      })
      
      // Créer une session active
      const sessionToken = crypto.randomUUID()
      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
      
      console.log(`   ✅ Compte créé: ${account.email} (${account.role})`)
    }
    
    console.log('\n🎉 Tous les comptes de test ont été créés avec succès!')
    console.log('\nComptes disponibles:')
    TEST_ACCOUNTS.forEach(account => {
      console.log(`   ${account.role}: ${account.email} / ${account.password}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des comptes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  createTestAccounts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { createTestAccounts }