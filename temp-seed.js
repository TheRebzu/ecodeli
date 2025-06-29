// Seed script temporaire pour créer des comptes de test EcoDeli
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting EcoDeli database seed...')
  
  try {
    // Nettoyer la base
    console.log('Cleaning database...')
    await prisma.deliveryValidation.deleteMany({})
    await prisma.delivery.deleteMany({})
    await prisma.announcement.deleteMany({})
    
    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })