import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'
import { generateInvoiceNumber } from '../utils/generators/code-generator'

export async function seedInvoices(ctx: SeedContext) {
  const { prisma } = ctx
  const bookings = ctx.data.get('bookings') || []
  const deliveries = ctx.data.get('deliveries') || []
  const providers = ctx.data.get('providers') || []
  
  console.log('   Creating invoices...')
  
  const invoices = []
  
  // 1. Factures pour les livraisons terminées
  const completedDeliveries = deliveries.filter((d: any) => d.status === 'DELIVERED')
  for (const delivery of completedDeliveries) {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber('LIV'),
        type: 'DELIVERY',
        status: 'PAID',
        subtotal: delivery.price,
        tax: delivery.price * 0.2, // TVA 20%
        total: delivery.price * 1.2,
        currency: 'EUR',
        metadata: {
          deliveryId: delivery.id,
          trackingNumber: delivery.trackingNumber,
          delivererEarnings: delivery.delivererEarnings,
          platformFee: delivery.platformFee
        },
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paidAt: new Date(),
        pdfUrl: `https://storage.ecodeli.fr/invoices/${generateInvoiceNumber('LIV')}.pdf`
      }
    })
    invoices.push(invoice)
  }
  
  // 2. Factures pour les réservations terminées
  const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED')
  for (const booking of completedBookings) {
    const invoice = await prisma.invoice.create({
      data: {
        clientId: booking.clientId,
        invoiceNumber: generateInvoiceNumber('SRV'),
        type: 'SERVICE',
        status: 'PAID',
        subtotal: booking.totalPrice,
        tax: booking.totalPrice * 0.2,
        total: booking.totalPrice * 1.2,
        currency: 'EUR',
        metadata: {
          bookingId: booking.id,
          serviceId: booking.serviceId
        },
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paidAt: new Date(),
        pdfUrl: `https://storage.ecodeli.fr/invoices/${generateInvoiceNumber('SRV')}.pdf`
      }
    })
    invoices.push(invoice)
  }
  
  // 3. Factures mensuelles automatiques pour les prestataires (30 de chaque mois)
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Générer les factures mensuelles des 3 derniers mois
  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    const invoiceDate = new Date(currentYear, currentMonth - monthOffset, 30, 23, 0, 0)
    const month = invoiceDate.getMonth() + 1
    const year = invoiceDate.getFullYear()
    
    for (const providerData of providers) {
      if (!providerData.provider.isActive) continue
      
      // Calculer les gains du mois pour ce prestataire
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59)
      
      // Trouver les interventions du mois (simplifiée ici avec des données aléatoires)
      const totalHours = Math.floor(20 + Math.random() * 100) // 20 à 120 heures
      const hourlyRate = providerData.provider.hourlyRate || 30
      const totalAmount = totalHours * hourlyRate
      const commissionRate = 0.15 // 15% commission EcoDeli
      const commissionAmount = totalAmount * commissionRate
      const netAmount = totalAmount - commissionAmount
      
      if (totalAmount > 0) {
        const monthlyInvoice = await prisma.providerMonthlyInvoice.create({
          data: {
            providerId: providerData.provider.id,
            month,
            year,
            totalHours,
            totalAmount,
            commissionRate,
            commissionAmount,
            netAmount,
            status: monthOffset === 0 ? 'PENDING' : 'PAID',
            invoiceNumber: generateInvoiceNumber(`PRO-${month.toString().padStart(2, '0')}`),
            invoiceUrl: `https://storage.ecodeli.fr/provider-invoices/${year}/${month}/${providerData.provider.id}.pdf`,
            sentAt: invoiceDate,
            paidAt: monthOffset === 0 ? null : new Date(invoiceDate.getTime() + 5 * 24 * 60 * 60 * 1000),
            dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        })
        
        // Créer aussi une facture standard pour la compatibilité
        const invoice = await prisma.invoice.create({
          data: {
            providerId: providerData.provider.id,
            invoiceNumber: monthlyInvoice.invoiceNumber,
            type: 'PROVIDER_MONTHLY',
            status: monthlyInvoice.status === 'PAID' ? 'PAID' : 'PENDING',
            subtotal: netAmount,
            tax: 0, // Prestataires gèrent leur propre TVA
            total: netAmount,
            currency: 'EUR',
            metadata: {
              monthlyInvoiceId: monthlyInvoice.id,
              month,
              year,
              totalHours,
              commissionAmount
            },
            dueDate: monthlyInvoice.dueDate,
            paidAt: monthlyInvoice.paidAt,
            pdfUrl: monthlyInvoice.invoiceUrl
          }
        })
        
        invoices.push(invoice)
      }
    }
  }
  
  // 4. Factures d'abonnement pour les clients Premium/Starter
  const subscribedClients = await prisma.client.findMany({
    where: {
      subscriptionPlan: { in: ['STARTER', 'PREMIUM'] }
    },
    include: {
      user: true
    }
  })
  
  for (const client of subscribedClients) {
    // Générer les factures des 3 derniers mois
    for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
      const invoiceDate = new Date(currentYear, currentMonth - monthOffset, 1)
      const amount = client.subscriptionPlan === 'PREMIUM' ? 19.99 : 9.90
      
      const invoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          invoiceNumber: generateInvoiceNumber('SUB'),
          type: 'SUBSCRIPTION',
          status: 'PAID',
          subtotal: amount,
          tax: amount * 0.2,
          total: amount * 1.2,
          currency: 'EUR',
          metadata: {
            subscriptionType: client.subscriptionPlan,
            period: `${invoiceDate.getMonth() + 1}/${invoiceDate.getFullYear()}`
          },
          dueDate: new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          paidAt: invoiceDate,
          pdfUrl: `https://storage.ecodeli.fr/invoices/subscriptions/${generateInvoiceNumber('SUB')}.pdf`
        }
      })
      
      invoices.push(invoice)
    }
  }
  
  console.log(`   ✓ Created ${invoices.length} invoices`)
  
  return invoices
} 