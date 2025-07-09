const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getCurrentUser() {
  try {
    console.log('🔍 Vérification de l\'utilisateur connecté...')

    // Récupérer le prestataire avec le plus d'interventions
    const providerWithInterventions = await prisma.provider.findFirst({
      where: {
        serviceInterventions: {
          some: {}
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        serviceInterventions: {
          include: {
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
        }
      }
    })

    if (!providerWithInterventions) {
      console.log('❌ Aucun prestataire avec interventions trouvé')
      return
    }

    console.log(`✅ Prestataire trouvé: ${providerWithInterventions.user.profile?.firstName} ${providerWithInterventions.user.profile?.lastName}`)
    console.log(`   - User ID: ${providerWithInterventions.user.id}`)
    console.log(`   - Provider ID: ${providerWithInterventions.id}`)
    console.log(`   - Email: ${providerWithInterventions.user.email}`)
    console.log(`   - Interventions: ${providerWithInterventions.serviceInterventions.length}`)

    console.log('\n📋 Interventions de ce prestataire:')
    providerWithInterventions.serviceInterventions.forEach((intervention, index) => {
      console.log(`\n${index + 1}. ${intervention.title}`)
      console.log(`   - Statut: ${intervention.status}`)
      console.log(`   - Date: ${intervention.scheduledDate}`)
      console.log(`   - Client: ${intervention.client.profile?.firstName} ${intervention.client.profile?.lastName}`)
      console.log(`   - Demande: ${intervention.serviceRequest.title}`)
    })

    // Afficher les informations de connexion
    console.log('\n🔑 Informations de connexion:')
    console.log(`Pour tester avec ce prestataire, connectez-vous avec:`)
    console.log(`Email: ${providerWithInterventions.user.email}`)
    console.log(`User ID: ${providerWithInterventions.user.id}`)
    console.log(`Provider ID: ${providerWithInterventions.id}`)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getCurrentUser() 