const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addShoppingService() {
  try {
    console.log('🔍 Recherche du prestataire actuel...')
    
    // Récupérer le prestataire actuel (celui qui se connecte)
    const provider = await prisma.provider.findFirst({
      where: {
        user: {
          role: 'PROVIDER'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        services: {
          where: { isActive: true }
        }
      }
    })

    if (!provider) {
      console.log('❌ Aucun prestataire trouvé')
      return
    }

    console.log(`✅ Prestataire trouvé: ${provider.user.email}`)
    console.log(`   Nom: ${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`)
    console.log(`   Services actuels: ${provider.services.length}`)
    
    provider.services.forEach(service => {
      console.log(`   - ${service.name} (Type: ${service.type})`)
    })

    // Vérifier si le prestataire a déjà un service SHOPPING
    const existingShoppingService = provider.services.find(s => s.type === 'SHOPPING')
    
    if (existingShoppingService) {
      console.log('✅ Le prestataire a déjà un service SHOPPING')
      return
    }

    // Créer un nouveau service SHOPPING
    const newShoppingService = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: 'Courses et achats',
        description: 'Service de courses et achats à domicile. Je peux faire vos courses selon votre liste, acheter des produits spécifiques, ou effectuer des achats en ligne.',
        type: 'SHOPPING',
        basePrice: 25.0,
        priceUnit: 'HOUR',
        duration: 60,
        isActive: true,
        minAdvanceBooking: 24,
        maxAdvanceBooking: 720,
        requirements: ['VEHICLE_LICENSE'],
        cancellationPolicy: 'Annulation gratuite jusqu\'à 2h avant'
      }
    })

    console.log('✅ Service SHOPPING créé avec succès!')
    console.log(`   ID: ${newShoppingService.id}`)
    console.log(`   Nom: ${newShoppingService.name}`)
    console.log(`   Prix: ${newShoppingService.basePrice}€/${newShoppingService.priceUnit}`)

    // Vérifier les services mis à jour
    const updatedServices = await prisma.service.findMany({
      where: {
        providerId: provider.id,
        isActive: true
      }
    })

    console.log(`\n📊 Services mis à jour: ${updatedServices.length}`)
    updatedServices.forEach(service => {
      console.log(`   - ${service.name} (Type: ${service.type})`)
    })

    console.log('\n🎉 Le prestataire peut maintenant voir les annonces SHOPPING!')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addShoppingService() 