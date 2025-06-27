import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'
import { generateTransactionReference } from '../utils/generators/code-generator'

export async function seedPayments(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  const deliveries = ctx.data.get('deliveries') || []
  
  console.log('   Creating payments and wallets...')
  
  const payments = []
  const wallets = []
  
  // Créer des portefeuilles pour les livreurs
  const deliverers = users.filter(u => u.role === CONSTANTS.roles.DELIVERER && u.validationStatus === 'VALIDATED')
  for (const deliverer of deliverers) {
    const delivererData = await prisma.deliverer.findUnique({ where: { userId: deliverer.id } })
    if (!delivererData) continue
    
    const balance = Math.floor(50 + Math.random() * 500) // Entre 50€ et 550€
    const totalEarned = Math.floor(500 + Math.random() * 2000) // Entre 500€ et 2500€
    const totalWithdrawn = totalEarned - balance
    
    const wallet = await prisma.wallet.create({
      data: {
        userId: deliverer.id,
        balance,
        pendingBalance: Math.floor(Math.random() * 100), // 0-100€ en attente
        currency: 'EUR',
        totalEarned,
        totalWithdrawn,
        lastWithdrawalAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        bankAccountInfo: {
          iban: `FR76${Math.floor(Math.random() * 10000000000)}`,
          bic: 'BNPAFRPP',
          accountHolder: deliverer.name
        }
      }
    })
    wallets.push(wallet)
  }
  
  // Créer des paiements pour les livraisons
  for (const delivery of deliveries) {
    if (delivery.status === 'DELIVERED' || delivery.status === 'IN_TRANSIT') {
      // Paiement du client
      const payment = await prisma.payment.create({
        data: {
          userId: delivery.announcement.userId,
          deliveryId: delivery.id,
          amount: delivery.price,
          currency: 'EUR',
          status: delivery.status === 'DELIVERED' ? 'COMPLETED' : 'PENDING',
          type: 'DELIVERY',
          method: Math.random() > 0.3 ? 'CARD' : 'PAYPAL',
          transactionId: generateTransactionReference('PAY'),
          stripePaymentId: Math.random() > 0.5 ? `pi_${Math.random().toString(36).substring(2, 15)}` : null,
          description: `Paiement livraison ${delivery.trackingNumber}`,
          metadata: {
            deliveryId: delivery.id,
            announcementId: delivery.announcementId,
            delivererEarnings: delivery.delivererEarnings,
            platformFee: delivery.platformFee
          },
          paidAt: delivery.status === 'DELIVERED' ? delivery.actualDeliveryAt : null
        }
      })
      payments.push(payment)
      
      // Transaction dans le portefeuille du livreur
      if (delivery.status === 'DELIVERED') {
        const delivererUser = await prisma.deliverer.findUnique({
          where: { id: delivery.delivererId },
          include: { user: true }
        })
        
        if (delivererUser) {
          const wallet = await prisma.wallet.findUnique({ where: { userId: delivererUser.userId } })
          
          if (wallet) {
            await prisma.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'CREDIT',
                amount: delivery.delivererEarnings,
                currency: 'EUR',
                status: 'COMPLETED',
                reference: generateTransactionReference('TXN'),
                description: `Gains livraison ${delivery.trackingNumber}`,
                metadata: {
                  deliveryId: delivery.id,
                  paymentId: payment.id
                }
              }
            })
            
            // Mettre à jour le solde
            await prisma.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: { increment: delivery.delivererEarnings },
                totalEarned: { increment: delivery.delivererEarnings }
              }
            })
          }
        }
      }
    }
  }
  
  // Créer quelques retraits pour les livreurs
  for (const wallet of wallets) {
    if (wallet.totalWithdrawn > 0 && Math.random() > 0.5) {
      const withdrawalAmount = Math.min(100 + Math.floor(Math.random() * 200), wallet.balance)
      
      await prisma.withdrawal.create({
        data: {
          walletId: wallet.id,
          amount: withdrawalAmount,
          currency: 'EUR',
          status: 'COMPLETED',
          method: 'BANK_TRANSFER',
          reference: generateTransactionReference('WTH'),
          bankAccount: wallet.bankAccountInfo.iban,
          processedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          fee: 0 // Pas de frais de retrait
        }
      })
      
      // Transaction de retrait
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: withdrawalAmount,
          currency: 'EUR',
          status: 'COMPLETED',
          reference: generateTransactionReference('TXN'),
          description: 'Retrait vers compte bancaire'
        }
      })
    }
  }
  
  console.log(`   ✓ Created ${payments.length} payments`)
  console.log(`   ✓ Created ${wallets.length} wallets`)
  
  return { payments, wallets }
} 