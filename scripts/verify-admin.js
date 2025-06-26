const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyAdminAccount() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin-complete@test.com' },
      include: { profile: true }
    })

    if (user) {
      console.log('✅ Compte admin trouvé:')
      console.log(`📧 Email: ${user.email}`)
      console.log(`🏷️ Rôle: ${user.role}`)
      console.log(`👤 Nom: ${user.profile?.firstName} ${user.profile?.lastName}`)
      console.log(`📞 Téléphone: ${user.profile?.phone}`)
      console.log(`📍 Adresse: ${user.profile?.address}, ${user.profile?.city}`)
      console.log(`✅ Email vérifié: ${user.emailVerified}`)
      console.log(`✅ Profil vérifié: ${user.profile?.verified}`)
    } else {
      console.log('❌ Compte admin non trouvé')
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyAdminAccount() 