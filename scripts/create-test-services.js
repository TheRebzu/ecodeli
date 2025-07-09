const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestServices() {
  try {
    console.log('🔍 Recherche des prestataires existants...')
    
    // Récupérer tous les prestataires existants avec leurs profils Provider
    const providers = await prisma.user.findMany({
      where: {
        role: 'PROVIDER'
      },
      include: {
        profile: true,
        provider: true
      }
    })

    console.log(`✅ ${providers.length} prestataires trouvés`)
    
    // Afficher les détails des prestataires
    for (const provider of providers) {
      console.log(`   - ${provider.email} (ID: ${provider.id})`)
      if (provider.provider) {
        console.log(`     Provider ID: ${provider.provider.id}`)
      }
    }

    if (providers.length === 0) {
      console.log('❌ Aucun prestataire trouvé. Création de prestataires de test...')
      
      // Créer des prestataires de test
      const testProviders = [
        {
          email: 'menage@test.com',
          password: '$2b$10$rQZ8K9mN2pL4xV7yU3wQ1eR5tY8uI1oP4aM7sD0fG3hJ6kL9nO2pQ5rS8tU1vW4x',
          role: 'PROVIDER',
          profile: {
            create: {
              firstName: 'Marie',
              lastName: 'Dubois',
              phone: '0123456789',
              address: '123 rue de la Paix',
              city: 'Paris',
              postalCode: '75001',
              country: 'France',
              verified: true
            }
          }
        },
        {
          email: 'jardinage@test.com',
          password: '$2b$10$rQZ8K9mN2pL4xV7yU3wQ1eR5tY8uI1oP4aM7sD0fG3hJ6kL9nO2pQ5rS8tU1vW4x',
          role: 'PROVIDER',
          profile: {
            create: {
              firstName: 'Pierre',
              lastName: 'Martin',
              phone: '0987654321',
              address: '456 avenue des Champs',
              city: 'Lyon',
              postalCode: '69001',
              country: 'France',
              verified: true
            }
          }
        },
        {
          email: 'bricolage@test.com',
          password: '$2b$10$rQZ8K9mN2pL4xV7yU3wQ1eR5tY8uI1oP4aM7sD0fG3hJ6kL9nO2pQ5rS8tU1vW4x',
          role: 'PROVIDER',
          profile: {
            create: {
              firstName: 'Jean',
              lastName: 'Bernard',
              phone: '0555666777',
              address: '789 boulevard de la République',
              city: 'Marseille',
              postalCode: '13001',
              country: 'France',
              verified: true
            }
          }
        }
      ]

      for (const providerData of testProviders) {
        const user = await prisma.user.create({
          data: providerData,
          include: {
            profile: true
          }
        })

        // Créer le profil prestataire
        await prisma.provider.create({
          data: {
            userId: user.id,
            businessName: `${user.profile.firstName} ${user.profile.lastName}`,
            description: `Services professionnels de ${user.profile.firstName} ${user.profile.lastName}`,
            address: user.profile.address,
            city: user.profile.city,
            postalCode: user.profile.postalCode,
            phone: user.profile.phone,
            isActive: true,
            isVerified: true,
            specializations: ['HOME_SERVICE'],
            certifications: ['CERTIFIED_PROVIDER'],
            insuranceInfo: 'Assurance professionnelle active',
            hourlyRate: 25.0,
            experienceYears: 5,
            availability: 'FLEXIBLE',
            serviceAreas: [user.profile.city],
            maxDistance: 50,
            rating: 4.5,
            totalBookings: 0,
            totalEarnings: 0
          }
        })

        console.log(`✅ Prestataire créé: ${user.email}`)
      }

      // Récupérer les prestataires créés
      const newProviders = await prisma.user.findMany({
        where: {
          role: 'PROVIDER'
        },
        include: {
          profile: true,
          provider: true
        }
      })

      providers.push(...newProviders)
    }

    console.log(`✅ ${providers.length} prestataires trouvés`)

    // Créer des services pour chaque prestataire
    const services = [
      {
        name: 'Ménage complet',
        description: 'Service de ménage complet incluant nettoyage des sols, poussière, salle de bain et cuisine. Matériel fourni.',
        type: 'HOME_SERVICE',
        basePrice: 25.0,
        priceUnit: 'HOUR',
        duration: 120,
        minAdvanceBooking: 24,
        maxAdvanceBooking: 168,
        cancellationPolicy: 'Annulation gratuite jusqu\'à 2h avant',
        requirements: ['INSURANCE']
      },
      {
        name: 'Ménage express',
        description: 'Nettoyage rapide et efficace en 1h. Idéal pour un entretien régulier.',
        type: 'HOME_SERVICE',
        basePrice: 20.0,
        priceUnit: 'HOUR',
        duration: 60,
        minAdvanceBooking: 12,
        maxAdvanceBooking: 72,
        cancellationPolicy: 'Annulation gratuite jusqu\'à 1h avant',
        requirements: ['INSURANCE']
      },
      {
        name: 'Jardinage d\'entretien',
        description: 'Taille des haies, tonte de pelouse, désherbage et entretien général du jardin.',
        type: 'HOME_SERVICE',
        basePrice: 30.0,
        priceUnit: 'HOUR',
        duration: 180,
        minAdvanceBooking: 48,
        maxAdvanceBooking: 336,
        cancellationPolicy: 'Annulation gratuite jusqu\'à 24h avant',
        requirements: ['INSURANCE']
      },
      {
        name: 'Petits travaux de bricolage',
        description: 'Réparations diverses, montage de meubles, installation d\'étagères, etc.',
        type: 'HOME_SERVICE',
        basePrice: 35.0,
        priceUnit: 'HOUR',
        duration: 120,
        minAdvanceBooking: 24,
        maxAdvanceBooking: 168,
        cancellationPolicy: 'Annulation gratuite jusqu\'à 4h avant',
        requirements: ['INSURANCE']
      },
      {
        name: 'Cours particuliers',
        description: 'Soutien scolaire et cours particuliers pour tous niveaux. Matières: français, maths, anglais.',
        type: 'HOME_SERVICE',
        basePrice: 40.0,
        priceUnit: 'HOUR',
        duration: 60,
        minAdvanceBooking: 12,
        maxAdvanceBooking: 168,
        cancellationPolicy: 'Annulation gratuite jusqu\'à 2h avant',
        requirements: ['CERTIFICATION']
      },
      {
        name: 'Garde d\'animaux',
        description: 'Garde d\'animaux à domicile, promenades, soins et compagnie pour vos compagnons.',
        type: 'HOME_SERVICE',
        basePrice: 15.0,
        priceUnit: 'HOUR',
        duration: 60,
        minAdvanceBooking: 6,
        maxAdvanceBooking: 168,
        cancellationPolicy: 'Annulation gratuite jusqu\'à 1h avant',
        requirements: ['INSURANCE']
      }
    ]

    console.log('🔧 Création des services...')

    for (const provider of providers) {
      if (!provider.provider) {
        console.log(`⚠️  Pas de profil Provider pour ${provider.email}, création...`)
        
        // Créer le profil Provider manquant
        await prisma.provider.create({
          data: {
            userId: provider.id,
            businessName: `${provider.profile.firstName} ${provider.profile.lastName}`,
            description: `Services professionnels de ${provider.profile.firstName} ${provider.profile.lastName}`,
            address: provider.profile.address || 'Adresse non spécifiée',
            city: provider.profile.city || 'Ville non spécifiée',
            postalCode: provider.profile.postalCode || '00000',
            phone: provider.profile.phone || '0000000000',
            isActive: true,
            isVerified: true,
            specializations: ['HOME_SERVICE'],
            certifications: ['CERTIFIED_PROVIDER'],
            insuranceInfo: 'Assurance professionnelle active',
            hourlyRate: 25.0,
            experienceYears: 5,
            availability: 'FLEXIBLE',
            serviceAreas: [provider.profile.city || 'Paris'],
            maxDistance: 50,
            rating: 4.5,
            totalBookings: 0,
            totalEarnings: 0
          }
        })
        
        // Recharger le provider avec le profil
        const updatedProvider = await prisma.user.findUnique({
          where: { id: provider.id },
          include: {
            profile: true,
            provider: true
          }
        })
        
        if (updatedProvider) {
          Object.assign(provider, updatedProvider)
        }
      }
      
      // Sélectionner 2-3 services aléatoires pour chaque prestataire
      const providerServices = services.slice(0, Math.floor(Math.random() * 3) + 2)
      
      for (const serviceData of providerServices) {
        const service = await prisma.service.create({
          data: {
            ...serviceData,
            providerId: provider.id // Utiliser l'ID de l'utilisateur, pas du provider
          }
        })

        console.log(`✅ Service créé: ${service.name} pour ${provider.email}`)
      }
    }

    console.log('🎉 Services de test créés avec succès!')
    
    // Afficher les statistiques
    const totalServices = await prisma.service.count()
    const activeServices = await prisma.service.count({
      where: { isActive: true }
    })
    
    console.log(`📊 Statistiques:`)
    console.log(`   - Total services: ${totalServices}`)
    console.log(`   - Services actifs: ${activeServices}`)
    console.log(`   - Prestataires: ${providers.length}`)

  } catch (error) {
    console.error('❌ Erreur lors de la création des services:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestServices() 