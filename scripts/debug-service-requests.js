const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugServiceRequests() {
  try {
    console.log('🔍 Débogage des demandes de services...')

    // 1. Vérifier les annonces HOME_SERVICE
    const homeServiceAnnouncements = await prisma.announcement.findMany({
      where: { type: 'HOME_SERVICE' },
      select: {
        id: true,
        title: true,
        serviceDetails: true,
        status: true,
        authorId: true
      }
    })

    console.log(`\n📊 Annonces HOME_SERVICE trouvées: ${homeServiceAnnouncements.length}`)
    homeServiceAnnouncements.forEach(announcement => {
      console.log(`- ${announcement.title} (ID: ${announcement.id})`)
      console.log(`  Status: ${announcement.status}`)
      console.log(`  ServiceDetails: ${JSON.stringify(announcement.serviceDetails)}`)
    })

    // 2. Vérifier les prestataires et leurs services
    const providers = await prisma.provider.findMany({
      include: {
        services: {
          where: { isActive: true }
        }
      }
    })

    console.log(`\n📊 Prestataires trouvés: ${providers.length}`)
    providers.forEach(provider => {
      console.log(`- Provider ID: ${provider.id}`)
      console.log(`  Services: ${provider.services.length}`)
      provider.services.forEach(service => {
        console.log(`  - ${service.name} (Type: ${service.type})`)
      })
    })

    // 3. Corriger les serviceDetails des annonces pour qu'ils correspondent aux types de services
    console.log('\n🔧 Correction des serviceDetails...')
    
    for (const announcement of homeServiceAnnouncements) {
      if (!announcement.serviceDetails || !announcement.serviceDetails.serviceType) {
        // Corriger les annonces sans serviceType
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: {
            serviceDetails: {
              serviceType: 'HOME_SERVICE',
              estimatedDuration: 120,
              isRecurring: false,
              requirements: ['Équipement fourni']
            }
          }
        })
        console.log(`✅ Annonce ${announcement.id} corrigée`)
      }
    }

    // 4. Vérifier qu'un prestataire a des services HOME_SERVICE
    const providerWithHomeService = providers.find(p => 
      p.services.some(s => s.type === 'HOME_SERVICE')
    )

    if (providerWithHomeService) {
      console.log(`\n✅ Prestataire avec services HOME_SERVICE trouvé: ${providerWithHomeService.id}`)
    } else {
      console.log('\n⚠️ Aucun prestataire avec services HOME_SERVICE trouvé')
      
      // Créer un service HOME_SERVICE pour le premier prestataire
      const firstProvider = providers[0]
      if (firstProvider) {
        await prisma.service.create({
          data: {
            providerId: firstProvider.id,
            name: 'Ménage complet',
            description: 'Service de ménage complet',
            type: 'HOME_SERVICE',
            basePrice: 30.0,
            priceUnit: 'HOUR',
            duration: 120,
            isActive: true,
            minAdvanceBooking: 24,
            maxAdvanceBooking: 720
          }
        })
        console.log(`✅ Service HOME_SERVICE créé pour le prestataire ${firstProvider.id}`)
      }
    }

    console.log('\n🎉 Débogage terminé!')

  } catch (error) {
    console.error('❌ Erreur lors du débogage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugServiceRequests() 