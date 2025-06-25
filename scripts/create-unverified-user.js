const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUnverifiedUser() {
  try {
    console.log('👤 Création d\'un utilisateur test non vérifié...')
    
    const testEmail = 'test-unverified@ecodeli.test'
    const testPassword = 'Test123!'
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })

    if (existingUser) {
      console.log('⚠️ Utilisateur test existe déjà, mise à jour...')
      
      // Marquer comme non vérifié
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerified: false,
          emailVerifiedAt: null
        }
      })
      
      console.log('✅ Utilisateur test mis à jour (non vérifié)')
      console.log('📧 Email:', testEmail)
      console.log('🔑 Mot de passe:', testPassword)
      return
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(testPassword, 12)

    // Transaction pour créer l'utilisateur complet
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur principal
      const user = await tx.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          role: 'CLIENT',
          emailVerified: false, // Explicitement non vérifié
          language: 'fr'
        }
      })

      // Créer le profil général
      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          firstName: 'Test',
          lastName: 'User',
          phone: '+33612345678',
          address: '123 Rue de Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          language: 'fr'
        }
      })

      // Créer le profil client
      const client = await tx.client.create({
        data: {
          userId: user.id,
          subscriptionPlan: 'FREE',
          tutorialCompleted: false,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false
        }
      })

      // Créer l'enregistrement Account pour Better Auth
      const account = await tx.account.create({
        data: {
          userId: user.id,
          type: 'email',
          provider: 'credential',
          providerAccountId: user.email
        }
      })

      // Créer un token de vérification d'email
      const verificationToken = require('@paralleldrive/cuid2').createId()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures

      await tx.verificationToken.create({
        data: {
          identifier: user.email,
          token: verificationToken,
          expires: expiresAt,
          type: 'email_verification'
        }
      })

      return { user, profile, client, account, verificationToken }
    })

    console.log('✅ Utilisateur test créé avec succès!')
    console.log('📧 Email:', testEmail)
    console.log('🔑 Mot de passe:', testPassword)
    console.log('👤 ID utilisateur:', result.user.id)
    console.log('🔐 Email vérifié:', result.user.emailVerified)
    console.log('🔗 Token de vérification:', result.verificationToken)
    console.log('')
    console.log('🧪 Pour tester:')
    console.log('1. Essayez de vous connecter avec ces identifiants')
    console.log('2. Le bouton "Renvoyer email" devrait apparaître')
    console.log('3. URL de vérification test:', `http://localhost:3000/api/auth/verify-email?token=${result.verificationToken}&email=${encodeURIComponent(testEmail)}`)

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUnverifiedUser() 