const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const storageBoxesData = [
  // Paris - 110 rue de Flandre
  {
    locationName: 'EcoDeli Paris - Siège',
    city: 'Paris',
    address: '110 rue de Flandre',
    postalCode: '75019',
    lat: 48.8566,
    lng: 2.3522,
    boxes: [
      { boxNumber: 'PAR-001', size: 'SMALL', pricePerDay: 2 },
      { boxNumber: 'PAR-002', size: 'SMALL', pricePerDay: 2 },
      { boxNumber: 'PAR-003', size: 'MEDIUM', pricePerDay: 5 },
      { boxNumber: 'PAR-004', size: 'MEDIUM', pricePerDay: 5 },
      { boxNumber: 'PAR-005', size: 'LARGE', pricePerDay: 10 },
      { boxNumber: 'PAR-006', size: 'EXTRA_LARGE', pricePerDay: 20 },
    ]
  },
  // Marseille
  {
    locationName: 'EcoDeli Marseille',
    city: 'Marseille',
    address: '15 Boulevard de la Méditerranée',
    postalCode: '13002',
    lat: 43.2965,
    lng: 5.3698,
    boxes: [
      { boxNumber: 'MAR-001', size: 'SMALL', pricePerDay: 2 },
      { boxNumber: 'MAR-002', size: 'MEDIUM', pricePerDay: 5 },
      { boxNumber: 'MAR-003', size: 'LARGE', pricePerDay: 10 },
      { boxNumber: 'MAR-004', size: 'EXTRA_LARGE', pricePerDay: 20 },
    ]
  },
  // Lyon
  {
    locationName: 'EcoDeli Lyon',
    city: 'Lyon',
    address: '45 Cours Lafayette',
    postalCode: '69003',
    lat: 45.7640,
    lng: 4.8357,
    boxes: [
      { boxNumber: 'LYO-001', size: 'SMALL', pricePerDay: 2 },
      { boxNumber: 'LYO-002', size: 'MEDIUM', pricePerDay: 5 },
      { boxNumber: 'LYO-003', size: 'LARGE', pricePerDay: 10 },
    ]
  }
]

async function addStorageBoxes() {
  console.log('🏪 Ajout des storage boxes de test...')
  
  try {
    // Vérifier s'il y a déjà des storage boxes
    const existingBoxes = await prisma.storageBox.count()
    console.log(`📦 Storage boxes existantes: ${existingBoxes}`)
    
    if (existingBoxes > 0) {
      console.log('✅ Des storage boxes existent déjà')
      return
    }
    
    for (const locationData of storageBoxesData) {
      console.log(`📍 Traitement de ${locationData.city}...`)
      
      // Créer ou récupérer la location
      let location = await prisma.location.findFirst({
        where: {
          city: locationData.city,
          type: 'WAREHOUSE'
        }
      })
      
      if (!location) {
        console.log(`   Création de la location ${locationData.locationName}`)
        location = await prisma.location.create({
          data: {
            name: locationData.locationName,
            type: 'WAREHOUSE',
            address: locationData.address,
            city: locationData.city,
            postalCode: locationData.postalCode,
            country: 'FR',
            lat: locationData.lat,
            lng: locationData.lng,
            phone: `+334${Math.floor(10000000 + Math.random() * 89999999)}`,
            email: `contact@ecodeli-${locationData.city.toLowerCase()}.com`,
            openingHours: [
              { day: 'monday', open: '08:00', close: '18:00' },
              { day: 'tuesday', open: '08:00', close: '18:00' },
              { day: 'wednesday', open: '08:00', close: '18:00' },
              { day: 'thursday', open: '08:00', close: '18:00' },
              { day: 'friday', open: '08:00', close: '18:00' },
              { day: 'saturday', open: '09:00', close: '13:00' }
            ],
            isActive: true
          }
        })
      }
      
      // Créer les storage boxes pour cette location
      for (const boxData of locationData.boxes) {
        const existingBox = await prisma.storageBox.findFirst({
          where: {
            locationId: location.id,
            boxNumber: boxData.boxNumber
          }
        })
        
        if (!existingBox) {
          console.log(`   Création box ${boxData.boxNumber} (${boxData.size} - ${boxData.pricePerDay}€/jour)`)
          await prisma.storageBox.create({
            data: {
              locationId: location.id,
              boxNumber: boxData.boxNumber,
              size: boxData.size,
              pricePerDay: boxData.pricePerDay,
              isAvailable: true
            }
          })
        }
      }
    }
    
    const totalBoxes = await prisma.storageBox.count()
    console.log(`✅ Total storage boxes créées: ${totalBoxes}`)
    
    // Créer aussi un warehouse pour chaque location si nécessaire
    for (const locationData of storageBoxesData) {
      const location = await prisma.location.findFirst({
        where: {
          city: locationData.city,
          type: 'WAREHOUSE'
        }
      })
      
      if (location) {
        const existingWarehouse = await prisma.warehouse.findFirst({
          where: { locationId: location.id }
        })
        
        if (!existingWarehouse) {
          console.log(`   Création warehouse pour ${locationData.city}`)
          await prisma.warehouse.create({
            data: {
              locationId: location.id,
              capacity: 1000,
              currentOccupancy: Math.floor(Math.random() * 300),
              managerName: `Manager ${locationData.city}`,
              managerEmail: `manager@ecodeli-${locationData.city.toLowerCase()}.com`
            }
          })
        }
      }
    }
    
    console.log('🎉 Storage boxes ajoutées avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des storage boxes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addStorageBoxes() 