// Script de test rapide pour vérifier les seeds
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSeeds() {
  console.log('🧪 Testing EcoDeli seed data...\n')
  
  try {
    // Test 1: Compter les utilisateurs par rôle
    console.log('1️⃣ Users by role:')
    const roles = ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']
    for (const role of roles) {
      const count = await prisma.user.count({ where: { role } })
      console.log(`   - ${role}: ${count} users`)
    }
    
    // Test 2: Vérifier les clients avec abonnements
    console.log('\n2️⃣ Client subscriptions:')
    const clients = await prisma.client.findMany({
      include: { user: { select: { email: true } } }
    })
    clients.forEach(client => {
      console.log(`   - ${client.user.email}: ${client.subscriptionPlan}`)
    })
    
    // Test 3: Compter les annonces par type
    console.log('\n3️⃣ Announcements by type:')
    const announcements = await prisma.announcement.groupBy({
      by: ['type'],
      _count: true
    })
    announcements.forEach(a => {
      console.log(`   - ${a.type}: ${a._count} announcements`)
    })
    
    // Test 4: Statut des livraisons
    console.log('\n4️⃣ Deliveries by status:')
    const deliveries = await prisma.delivery.groupBy({
      by: ['status'],
      _count: true
    })
    deliveries.forEach(d => {
      console.log(`   - ${d.status}: ${d._count} deliveries`)
    })
    
    // Test 5: Codes de validation
    console.log('\n5️⃣ Sample validation codes:')
    const deliveriesWithCodes = await prisma.delivery.findMany({
      where: { validationCode: { not: null } },
      take: 5,
      select: { id: true, validationCode: true }
    })
    deliveriesWithCodes.forEach(d => {
      console.log(`   - Delivery ${d.id}: ${d.validationCode}`)
    })
    
    // Test 6: Factures mensuelles prestataires
    console.log('\n6️⃣ Provider monthly invoices:')
    const providerInvoices = await prisma.invoice.count({
      where: { 
        type: 'PROVIDER_MONTHLY',
        status: 'PAID'
      }
    })
    console.log(`   - Total provider invoices: ${providerInvoices}`)
    
    // Test 7: Entrepôts et box
    console.log('\n7️⃣ Warehouses and storage boxes:')
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: { storageBoxes: true }
        }
      }
    })
    warehouses.forEach(w => {
      console.log(`   - ${w.name}: ${w._count.storageBoxes} boxes`)
    })
    
    console.log('\n✅ All tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSeeds() 