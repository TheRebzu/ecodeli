const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkInterventions() {
  try {
    console.log('🔍 Vérification des interventions...')

    // Compter toutes les interventions
    const totalInterventions = await prisma.serviceIntervention.count()
    console.log(`📊 Total interventions: ${totalInterventions}`)

    // Lister toutes les interventions avec détails
    const interventions = await prisma.serviceIntervention.findMany({
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        client: {
          include: {
            profile: true
          }
        },
        serviceRequest: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('\n📋 Détails des interventions:')
    interventions.forEach((intervention, index) => {
      console.log(`\n${index + 1}. Intervention ID: ${intervention.id}`)
      console.log(`   Titre: ${intervention.title}`)
      console.log(`   Statut: ${intervention.status}`)
      console.log(`   Date prévue: ${intervention.scheduledDate}`)
      console.log(`   Durée estimée: ${intervention.estimatedDuration} min`)
      console.log(`   Prestataire: ${intervention.provider?.user?.profile?.firstName} ${intervention.provider?.user?.profile?.lastName}`)
      console.log(`   Client: ${intervention.client?.profile?.firstName} ${intervention.client?.profile?.lastName}`)
      console.log(`   Demande de service: ${intervention.serviceRequest?.title}`)
    })

    // Vérifier les prestataires
    const providers = await prisma.provider.findMany({
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    console.log('\n👥 Prestataires disponibles:')
    providers.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.user?.profile?.firstName} ${provider.user?.profile?.lastName} (ID: ${provider.id}, UserID: ${provider.userId})`)
    })

    // Vérifier les utilisateurs avec rôle PROVIDER
    const providerUsers = await prisma.user.findMany({
      where: { role: 'PROVIDER' },
      include: {
        profile: true,
        provider: true
      }
    })

    console.log('\n🔑 Utilisateurs PROVIDER:')
    providerUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.profile?.firstName} ${user.profile?.lastName} (ID: ${user.id}, ProviderID: ${user.provider?.id})`)
    })

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkInterventions() 