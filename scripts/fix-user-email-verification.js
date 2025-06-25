const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixUserEmailVerification() {
  try {
    console.log('🔧 Correction du statut de vérification email...')
    
    const userEmail = 'celian@celian-vf.fr'
    
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      console.log('❌ Utilisateur non trouvé')
      return
    }

    console.log('✅ Utilisateur trouvé:', user.id)
    console.log('   Email vérifié:', user.emailVerified)

    // Option 1: Marquer comme vérifié (pour les tests)
    console.log('🔄 Option: Marquer l\'email comme vérifié pour les tests')
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    })
    
    console.log('✅ Email marqué comme vérifié')

    // Option 2: Créer un token de vérification pour tester le flow complet
    console.log('🔑 Création d\'un token de vérification pour les tests...')
    
    // Supprimer les anciens tokens
    await prisma.verificationToken.deleteMany({
      where: { 
        identifier: userEmail,
        type: 'email_verification'
      }
    })

    // Créer un nouveau token
    const verificationToken = require('@paralleldrive/cuid2').createId()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures

    await prisma.verificationToken.create({
      data: {
        identifier: userEmail,
        token: verificationToken,
        expires: expiresAt,
        type: 'email_verification'
      }
    })

    console.log('✅ Token de vérification créé:', verificationToken)
    console.log('🔗 URL de test:', `http://localhost:3000/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(userEmail)}`)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserEmailVerification() 