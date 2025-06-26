const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const locations = [
  {
    name: 'Entrepôt Paris - 19ème',
    type: 'WAREHOUSE',
    address: '110 rue de Flandre',
    city: 'Paris',
    postalCode: '75019',
    country: 'FR',
    lat: 48.8966,
    lng: 2.3762,
    phone: '+33 1 42 00 00 00',
    email: 'paris@ecodeli.fr',
    warehouse: {
      capacity: 500,
      currentOccupancy: 120,
      managerName: 'Marie Dubois',
      managerEmail: 'marie.dubois@ecodeli.fr'
    },
    storageBoxes: [
      { boxNumber: 'A001', size: 'SMALL', pricePerDay: 0.83, isAvailable: true },
      { boxNumber: 'A002', size: 'SMALL', pricePerDay: 0.83, isAvailable: false },
      { boxNumber: 'A003', size: 'MEDIUM', pricePerDay: 1.17, isAvailable: true },
      { boxNumber: 'A004', size: 'MEDIUM', pricePerDay: 1.17, isAvailable: false },
      { boxNumber: 'A005', size: 'LARGE', pricePerDay: 1.67, isAvailable: true },
      { boxNumber: 'A006', size: 'LARGE', pricePerDay: 1.67, isAvailable: false },
      { boxNumber: 'A007', size: 'EXTRA_LARGE', pricePerDay: 2.50, isAvailable: true },
      { boxNumber: 'A008', size: 'EXTRA_LARGE', pricePerDay: 2.50, isAvailable: false }
    ]
  },
  {
    name: 'Entrepôt Marseille',
    type: 'WAREHOUSE',
    address: '45 boulevard Michelet',
    city: 'Marseille',
    postalCode: '13008',
    country: 'FR',
    lat: 43.2965,
    lng: 5.3698,
    phone: '+33 4 91 00 00 00',
    email: 'marseille@ecodeli.fr',
    warehouse: {
      capacity: 300,
      currentOccupancy: 85,
      managerName: 'Jean Martin',
      managerEmail: 'jean.martin@ecodeli.fr'
    },
    storageBoxes: [
      { boxNumber: 'B001', size: 'SMALL', pricePerDay: 0.73, isAvailable: true },
      { boxNumber: 'B002', size: 'SMALL', pricePerDay: 0.73, isAvailable: false },
      { boxNumber: 'B003', size: 'MEDIUM', pricePerDay: 1.07, isAvailable: true },
      { boxNumber: 'B004', size: 'MEDIUM', pricePerDay: 1.07, isAvailable: false },
      { boxNumber: 'B005', size: 'LARGE', pricePerDay: 1.50, isAvailable: true },
      { boxNumber: 'B006', size: 'LARGE', pricePerDay: 1.50, isAvailable: false }
    ]
  },
  {
    name: 'Entrepôt Lyon',
    type: 'WAREHOUSE',
    address: '78 rue de la Part-Dieu',
    city: 'Lyon',
    postalCode: '69003',
    country: 'FR',
    lat: 45.7640,
    lng: 4.8357,
    phone: '+33 4 72 00 00 00',
    email: 'lyon@ecodeli.fr',
    warehouse: {
      capacity: 400,
      currentOccupancy: 95,
      managerName: 'Sophie Bernard',
      managerEmail: 'sophie.bernard@ecodeli.fr'
    },
    storageBoxes: [
      { boxNumber: 'C001', size: 'SMALL', pricePerDay: 0.80, isAvailable: true },
      { boxNumber: 'C002', size: 'SMALL', pricePerDay: 0.80, isAvailable: false },
      { boxNumber: 'C003', size: 'MEDIUM', pricePerDay: 1.13, isAvailable: true },
      { boxNumber: 'C004', size: 'MEDIUM', pricePerDay: 1.13, isAvailable: false },
      { boxNumber: 'C005', size: 'LARGE', pricePerDay: 1.60, isAvailable: true },
      { boxNumber: 'C006', size: 'LARGE', pricePerDay: 1.60, isAvailable: false },
      { boxNumber: 'C007', size: 'EXTRA_LARGE', pricePerDay: 2.33, isAvailable: true }
    ]
  },
  {
    name: 'Entrepôt Lille',
    type: 'WAREHOUSE',
    address: '12 avenue de la République',
    city: 'Lille',
    postalCode: '59000',
    country: 'FR',
    lat: 50.6292,
    lng: 3.0573,
    phone: '+33 3 20 00 00 00',
    email: 'lille@ecodeli.fr',
    warehouse: {
      capacity: 250,
      currentOccupancy: 60,
      managerName: 'Pierre Leroy',
      managerEmail: 'pierre.leroy@ecodeli.fr'
    },
    storageBoxes: [
      { boxNumber: 'D001', size: 'SMALL', pricePerDay: 0.67, isAvailable: true },
      { boxNumber: 'D002', size: 'SMALL', pricePerDay: 0.67, isAvailable: false },
      { boxNumber: 'D003', size: 'MEDIUM', pricePerDay: 1.00, isAvailable: true },
      { boxNumber: 'D004', size: 'MEDIUM', pricePerDay: 1.00, isAvailable: false },
      { boxNumber: 'D005', size: 'LARGE', pricePerDay: 1.40, isAvailable: true }
    ]
  },
  {
    name: 'Entrepôt Montpellier',
    type: 'WAREHOUSE',
    address: '156 rue de la Galéra',
    city: 'Montpellier',
    postalCode: '34000',
    country: 'FR',
    lat: 43.6108,
    lng: 3.8767,
    phone: '+33 4 67 00 00 00',
    email: 'montpellier@ecodeli.fr',
    warehouse: {
      capacity: 200,
      currentOccupancy: 45,
      managerName: 'Claire Moreau',
      managerEmail: 'claire.moreau@ecodeli.fr'
    },
    storageBoxes: [
      { boxNumber: 'E001', size: 'SMALL', pricePerDay: 0.77, isAvailable: true },
      { boxNumber: 'E002', size: 'SMALL', pricePerDay: 0.77, isAvailable: false },
      { boxNumber: 'E003', size: 'MEDIUM', pricePerDay: 1.10, isAvailable: true },
      { boxNumber: 'E004', size: 'MEDIUM', pricePerDay: 1.10, isAvailable: false },
      { boxNumber: 'E005', size: 'LARGE', pricePerDay: 1.53, isAvailable: false }
    ]
  },
  {
    name: 'Entrepôt Rennes',
    type: 'WAREHOUSE',
    address: '89 boulevard de la Liberté',
    city: 'Rennes',
    postalCode: '35000',
    country: 'FR',
    lat: 48.1173,
    lng: -1.6778,
    phone: '+33 2 99 00 00 00',
    email: 'rennes@ecodeli.fr',
    warehouse: {
      capacity: 180,
      currentOccupancy: 40,
      managerName: 'Thomas Roux',
      managerEmail: 'thomas.roux@ecodeli.fr'
    },
    storageBoxes: [
      { boxNumber: 'F001', size: 'SMALL', pricePerDay: 0.70, isAvailable: true },
      { boxNumber: 'F002', size: 'SMALL', pricePerDay: 0.70, isAvailable: false },
      { boxNumber: 'F003', size: 'MEDIUM', pricePerDay: 1.03, isAvailable: true },
      { boxNumber: 'F004', size: 'MEDIUM', pricePerDay: 1.03, isAvailable: false }
    ]
  }
]

async function seedWarehouses() {
  console.log('🌍 Ajout des entrepôts EcoDeli...\n')

  try {
    // Vérifier si des locations existent déjà
    const existingLocations = await prisma.location.findMany({
      where: { type: 'WAREHOUSE' }
    })
    
    if (existingLocations.length > 0) {
      console.log(`⚠️  ${existingLocations.length} entrepôt(s) existent déjà.`)
      console.log('   Suppression des entrepôts existants...')
      
      // Supprimer les box de stockage d'abord
      await prisma.storageBox.deleteMany({
        where: {
          location: {
            type: 'WAREHOUSE'
          }
        }
      })
      
      // Supprimer les entrepôts
      await prisma.warehouse.deleteMany()
      
      // Supprimer les locations
      await prisma.location.deleteMany({
        where: { type: 'WAREHOUSE' }
      })
      
      console.log('   ✅ Entrepôts existants supprimés')
    }

    let createdCount = 0
    let boxCount = 0

    for (const locationData of locations) {
      const { warehouse, storageBoxes, ...locationInfo } = locationData
      
      // Créer la location
      const location = await prisma.location.create({
        data: locationInfo
      })
      
      // Créer l'entrepôt associé
      const warehouseRecord = await prisma.warehouse.create({
        data: {
          ...warehouse,
          locationId: location.id
        }
      })
      
      createdCount++
      console.log(`   ✅ Entrepôt créé: ${location.name} (${location.city})`)

      // Créer les box de stockage pour cet entrepôt
      for (const boxData of storageBoxes) {
        await prisma.storageBox.create({
          data: {
            ...boxData,
            locationId: location.id
          }
        })
        boxCount++
      }
      
      console.log(`      📦 ${storageBoxes.length} box créées`)
    }

    console.log(`\n🎉 Seeding terminé avec succès !`)
    console.log(`   📊 Statistiques:`)
    console.log(`      - Entrepôts créés: ${createdCount}`)
    console.log(`      - Box créées: ${boxCount}`)
    console.log(`      - Villes couvertes: ${locations.length}`)

    // Afficher un résumé par ville
    console.log(`\n📍 Répartition par ville:`)
    locations.forEach(location => {
      const availableBoxes = location.storageBoxes.filter(box => box.isAvailable).length
      const occupiedBoxes = location.storageBoxes.filter(box => !box.isAvailable).length
      
      console.log(`   ${location.city}: ${location.storageBoxes.length} box (${availableBoxes} dispo, ${occupiedBoxes} occupées)`)
    })

  } catch (error) {
    console.error('❌ Erreur lors du seeding des entrepôts:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
if (require.main === module) {
  seedWarehouses()
}

module.exports = { seedWarehouses } 