const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestIntervention() {
  try {
    console.log('🔍 Création intervention de test...')

    // Récupérer le prestataire connecté (premier prestataire trouvé)
    const provider = await prisma.provider.findFirst({
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!provider) {
      console.log('❌ Aucun prestataire trouvé')
      return
    }

    console.log(`✅ Prestataire trouvé: ${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`)

    // Récupérer un client
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' },
      include: {
        profile: true
      }
    })

    if (!client) {
      console.log('❌ Aucun client trouvé')
      return
    }

    console.log(`✅ Client trouvé: ${client.profile?.firstName} ${client.profile?.lastName}`)

    // Récupérer une demande de service
    const serviceRequest = await prisma.announcement.findFirst({
      where: { type: 'HOME_SERVICE' }
    })

    if (!serviceRequest) {
      console.log('❌ Aucune demande de service trouvée')
      return
    }

    console.log(`✅ Demande de service trouvée: ${serviceRequest.title}`)

    // Créer une intervention de test
    const intervention = await prisma.serviceIntervention.create({
      data: {
        providerId: provider.id,
        clientId: client.id,
        serviceRequestId: serviceRequest.id,
        title: 'Test Intervention - Ménage',
        description: 'Intervention de test pour vérifier l\'affichage',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        estimatedDuration: 120, // 2 heures
        status: 'SCHEDULED',
        notes: 'Intervention créée pour test'
      }
    })

    console.log('✅ Intervention de test créée:', intervention.id)
    console.log('📊 Détails:')
    console.log(`   - Titre: ${intervention.title}`)
    console.log(`   - Statut: ${intervention.status}`)
    console.log(`   - Date prévue: ${intervention.scheduledDate}`)
    console.log(`   - Durée estimée: ${intervention.estimatedDuration} minutes`)
    console.log(`   - Prestataire: ${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`)
    console.log(`   - Client: ${client.profile?.firstName} ${client.profile?.lastName}`)

    // Créer une deuxième intervention pour tester différents statuts
    const intervention2 = await prisma.serviceIntervention.create({
      data: {
        providerId: provider.id,
        clientId: client.id,
        serviceRequestId: serviceRequest.id,
        title: 'Test Intervention - Jardinage',
        description: 'Taille des haies et tonte de pelouse',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Après-demain
        estimatedDuration: 180, // 3 heures
        status: 'IN_PROGRESS',
        notes: 'Intervention en cours'
      }
    })

    console.log('✅ Deuxième intervention créée:', intervention2.id)

    // Créer une troisième intervention terminée
    const intervention3 = await prisma.serviceIntervention.create({
      data: {
        providerId: provider.id,
        clientId: client.id,
        serviceRequestId: serviceRequest.id,
        title: 'Test Intervention - Bricolage',
        description: 'Montage de meubles et installation d\'étagères',
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
        estimatedDuration: 90, // 1h30
        actualDuration: 85, // Durée réelle
        status: 'COMPLETED',
        notes: 'Intervention terminée avec succès',
        rating: 5,
        review: 'Excellent service, très professionnel'
      }
    })

    console.log('✅ Troisième intervention créée:', intervention3.id)

    console.log('🎉 Interventions de test créées avec succès!')
    console.log('📊 Vous pouvez maintenant vérifier la page /fr/provider/interventions')

  } catch (error) {
    console.error('❌ Erreur lors de la création des interventions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestIntervention() 