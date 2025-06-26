// Script pour créer les comptes de test EcoDeli via Better-Auth
import { PrismaClient } from '@prisma/client'
import { auth } from './src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Création des comptes de test EcoDeli via Better-Auth...')

  try {
    // 1. CLIENT - Inscription via Better-Auth
    console.log('Création du client...')
    const clientResult = await auth.api.signUpEmail({
      body: {
        email: 'client-complete@test.com',
        password: 'Test123!',
        name: 'Client Test'
      }
    })
    console.log('✅ Client créé:', clientResult)

    // Mettre à jour le profil client
    if (clientResult.user) {
      await prisma.user.update({
        where: { id: clientResult.user.id },
        data: {
          role: 'CLIENT',
          isActive: true,
          validationStatus: 'VALIDATED'
        }
      })

      // Créer le profil et la relation client
      await prisma.profile.upsert({
        where: { userId: clientResult.user.id },
        update: {},
        create: {
          userId: clientResult.user.id,
          firstName: 'Client',
          lastName: 'Complete',
          phone: '+33123456789',
          isVerified: true
        }
      })

      await prisma.client.upsert({
        where: { userId: clientResult.user.id },
        update: {},
        create: {
          userId: clientResult.user.id,
          subscriptionPlan: 'PREMIUM',
          tutorialCompleted: true,
          tutorialCompletedAt: new Date()
        }
      })
    }

    // 2. DELIVERER
    console.log('Création du livreur...')
    const delivererResult = await auth.api.signUpEmail({
      body: {
        email: 'deliverer@test.com',
        password: 'Test123!',
        name: 'Deliverer Test'
      }
    })

    if (delivererResult.user) {
      await prisma.user.update({
        where: { id: delivererResult.user.id },
        data: {
          role: 'DELIVERER',
          isActive: true,
          validationStatus: 'VALIDATED'
        }
      })

      await prisma.profile.upsert({
        where: { userId: delivererResult.user.id },
        update: {},
        create: {
          userId: delivererResult.user.id,
          firstName: 'Deliverer',
          lastName: 'Test',
          phone: '+33987654321',
          isVerified: true
        }
      })
    }

    // 3. ADMIN
    console.log('Création de l\'admin...')
    const adminResult = await auth.api.signUpEmail({
      body: {
        email: 'admin@test.com',
        password: 'Test123!',
        name: 'Admin Test'
      }
    })

    if (adminResult.user) {
      await prisma.user.update({
        where: { id: adminResult.user.id },
        data: {
          role: 'ADMIN',
          isActive: true,
          validationStatus: 'VALIDATED'
        }
      })

      await prisma.profile.upsert({
        where: { userId: adminResult.user.id },
        update: {},
        create: {
          userId: adminResult.user.id,
          firstName: 'Admin',
          lastName: 'Test',
          phone: '+33321654987',
          isVerified: true
        }
      })
    }

    console.log('\n🎉 Tous les comptes de test ont été créés avec succès!')
    console.log('\n📋 Comptes disponibles:')
    console.log('- client-complete@test.com (CLIENT)')
    console.log('- deliverer@test.com (DELIVERER)')
    console.log('- admin@test.com (ADMIN)')
    console.log('\n🔑 Mot de passe pour tous: Test123!')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 