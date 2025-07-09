const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function repairUserProfiles() {
  try {
    console.log('🔍 Audit des utilisateurs sans profil...')
    
    // Trouver tous les utilisateurs sans profil
    const usersWithoutProfile = await prisma.user.findMany({
      where: {
        profile: null
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    console.log(`📊 ${usersWithoutProfile.length} utilisateurs sans profil trouvés`)

    if (usersWithoutProfile.length === 0) {
      console.log('✅ Tous les utilisateurs ont déjà un profil')
      return
    }

    // Afficher les détails des utilisateurs sans profil
    console.log('\n📋 Utilisateurs sans profil :')
    usersWithoutProfile.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Créé le ${user.createdAt.toLocaleDateString()}`)
    })

    console.log('\n🔧 Création des profils manquants...')

    let createdCount = 0
    let errorCount = 0

    for (const user of usersWithoutProfile) {
      try {
        // Générer des données de profil par défaut basées sur l'email et le rôle
        const emailParts = user.email.split('@')
        const firstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1)
        
        let lastName = 'Utilisateur'
        let phone = '0000000000'
        let address = 'Adresse non spécifiée'
        let city = 'Paris'
        let postalCode = '75000'

        // Personnaliser selon le rôle
        switch (user.role) {
          case 'PROVIDER':
            lastName = 'Prestataire'
            city = 'Lyon'
            postalCode = '69000'
            break
          case 'DELIVERER':
            lastName = 'Livreur'
            city = 'Marseille'
            postalCode = '13000'
            break
          case 'MERCHANT':
            lastName = 'Commerçant'
            city = 'Lille'
            postalCode = '59000'
            break
          case 'CLIENT':
            lastName = 'Client'
            city = 'Paris'
            postalCode = '75000'
            break
          case 'ADMIN':
            lastName = 'Administrateur'
            city = 'Paris'
            postalCode = '75000'
            break
        }

        const profile = await prisma.profile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            phone,
            address,
            city,
            postalCode,
            country: 'France',
            verified: false
          }
        })

        console.log(`✅ Profil créé pour ${user.email}: ${profile.id}`)
        createdCount++

        // Créer les profils spécifiques selon le rôle si nécessaire
        if (user.role === 'PROVIDER') {
          const existingProvider = await prisma.provider.findUnique({
            where: { userId: user.id }
          })

          if (!existingProvider) {
            await prisma.provider.create({
              data: {
                userId: user.id,
                businessName: `${firstName} ${lastName}`,
                description: `Services professionnels de ${firstName} ${lastName}`,
                address,
                city,
                postalCode,
                phone,
                isActive: true,
                isVerified: false,
                specializations: ['HOME_SERVICE'],
                certifications: [],
                insuranceInfo: 'À compléter',
                hourlyRate: 25.0,
                experienceYears: 1,
                availability: 'FLEXIBLE',
                serviceAreas: [city],
                maxDistance: 50,
                rating: 0,
                totalBookings: 0,
                totalEarnings: 0
              }
            })
            console.log(`✅ Profil Provider créé pour ${user.email}`)
          }
        }

        if (user.role === 'DELIVERER') {
          const existingDeliverer = await prisma.deliverer.findUnique({
            where: { userId: user.id }
          })

          if (!existingDeliverer) {
            await prisma.deliverer.create({
              data: {
                userId: user.id,
                vehicleType: 'CAR',
                licensePlate: 'À compléter',
                insuranceInfo: 'À compléter',
                isActive: true,
                isVerified: false,
                rating: 0,
                totalDeliveries: 0,
                totalEarnings: 0,
                currentLocation: null,
                isAvailable: false
              }
            })
            console.log(`✅ Profil Deliverer créé pour ${user.email}`)
          }
        }

        if (user.role === 'MERCHANT') {
          const existingMerchant = await prisma.merchant.findUnique({
            where: { userId: user.id }
          })

          if (!existingMerchant) {
            await prisma.merchant.create({
              data: {
                userId: user.id,
                businessName: `${firstName} ${lastName}`,
                siret: 'À compléter',
                address,
                city,
                postalCode,
                phone,
                isActive: true,
                isVerified: false,
                contractType: 'STANDARD',
                commissionRate: 10.0,
                totalSales: 0,
                rating: 0
              }
            })
            console.log(`✅ Profil Merchant créé pour ${user.email}`)
          }
        }

        if (user.role === 'CLIENT') {
          const existingClient = await prisma.client.findUnique({
            where: { userId: user.id }
          })

          if (!existingClient) {
            await prisma.client.create({
              data: {
                userId: user.id,
                subscriptionPlan: 'FREE',
                totalSpent: 0,
                rating: 0,
                isActive: true
              }
            })
            console.log(`✅ Profil Client créé pour ${user.email}`)
          }
        }

      } catch (error) {
        console.error(`❌ Erreur lors de la création du profil pour ${user.email}:`, error.message)
        errorCount++
      }
    }

    console.log('\n📊 Résumé de la réparation :')
    console.log(`   - Profils créés avec succès: ${createdCount}`)
    console.log(`   - Erreurs: ${errorCount}`)
    console.log(`   - Total traité: ${usersWithoutProfile.length}`)

    if (errorCount > 0) {
      console.log('\n⚠️  Certains profils n\'ont pas pu être créés. Vérifiez les logs ci-dessus.')
    } else {
      console.log('\n✅ Tous les profils ont été créés avec succès !')
    }

  } catch (error) {
    console.error('❌ Erreur lors de la réparation des profils:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
repairUserProfiles() 