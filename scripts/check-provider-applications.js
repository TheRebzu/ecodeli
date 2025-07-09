const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkProviderApplications() {
  try {
    console.log('🔍 Vérification des candidatures prestataire...')
    
    // Trouver le prestataire prestataire1@test.com
    const provider = await prisma.provider.findFirst({
      where: {
        user: {
          email: 'prestataire1@test.com'
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!provider) {
      console.log('❌ Prestataire prestataire1@test.com non trouvé')
      return
    }

    console.log('✅ Prestataire trouvé:', provider.user.email, 'ID:', provider.id)

    // Récupérer toutes les candidatures du prestataire
    const applications = await prisma.serviceApplication.findMany({
      where: {
        providerId: provider.id
      },
      include: {
        serviceRequest: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📋 Candidatures trouvées: ${applications.length}`)
    
    applications.forEach((app, index) => {
      console.log(`\n${index + 1}. Candidature ID: ${app.id}`)
      console.log(`   Service: ${app.serviceRequest.title}`)
      console.log(`   Statut: ${app.status}`)
      console.log(`   Prix proposé: ${app.proposedPrice}€`)
      console.log(`   Durée estimée: ${app.estimatedDuration} min`)
      console.log(`   Date candidature: ${app.createdAt.toLocaleDateString('fr-FR')}`)
      console.log(`   Client: ${app.serviceRequest.author.profile?.firstName || 'N/A'} ${app.serviceRequest.author.profile?.lastName || 'N/A'}`)
      console.log(`   Message: ${app.message.substring(0, 50)}...`)
    })

    // Vérifier s'il y a des interventions pour ce prestataire
    const interventions = await prisma.serviceIntervention.findMany({
      where: {
        providerId: provider.id
      },
      include: {
        serviceRequest: true,
        client: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n🔧 Interventions trouvées: ${interventions.length}`)
    
    interventions.forEach((intervention, index) => {
      console.log(`\n${index + 1}. Intervention ID: ${intervention.id}`)
      console.log(`   Service: ${intervention.title}`)
      console.log(`   Statut: ${intervention.status}`)
      console.log(`   Date planifiée: ${intervention.scheduledDate.toLocaleDateString('fr-FR')}`)
      console.log(`   Durée estimée: ${intervention.estimatedDuration} min`)
      console.log(`   Client: ${intervention.client.profile?.firstName || 'N/A'} ${intervention.client.profile?.lastName || 'N/A'}`)
    })

    // Vérifier les paiements liés
    const payments = await prisma.payment.findMany({
      where: {
        userId: provider.user.id,
        type: 'SERVICE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n💳 Paiements trouvés: ${payments.length}`)
    
    payments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Paiement ID: ${payment.id}`)
      console.log(`   Montant: ${payment.amount}€`)
      console.log(`   Statut: ${payment.status}`)
      console.log(`   Date: ${payment.createdAt.toLocaleDateString('fr-FR')}`)
      console.log(`   Métadonnées:`, payment.metadata)
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProviderApplications() 