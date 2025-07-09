const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateServiceIntervention() {
  try {
    console.log('🔍 Recherche de l\'intervention de service...')
    
    // Rechercher l'intervention avec le titre "12345" et le statut "CONFIRMED"
    const intervention = await prisma.serviceIntervention.findFirst({
      where: {
        title: '12345',
        status: 'CONFIRMED'
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        serviceRequest: true,
        payment: true,
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    if (!intervention) {
      console.log('❌ Intervention non trouvée')
      return
    }

    console.log('✅ Intervention trouvée:', {
      id: intervention.id,
      title: intervention.title,
      status: intervention.status,
      client: `${intervention.client.profile?.firstName} ${intervention.client.profile?.lastName}`,
      paymentStatus: intervention.payment?.status,
      paymentAmount: intervention.payment?.amount
    })

    // Mettre à jour le statut vers CANCELLED
    console.log('🔄 Mise à jour du statut vers CANCELLED...')
    
    const updatedIntervention = await prisma.serviceIntervention.update({
      where: { id: intervention.id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        serviceRequest: true,
        payment: true,
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    console.log('✅ Statut mis à jour vers CANCELLED')

    // Annuler le paiement si il existe
    if (intervention.paymentId) {
      console.log('💳 Annulation du paiement...')
      
      await prisma.payment.update({
        where: { id: intervention.paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          metadata: {
            ...intervention.payment?.metadata,
            cancelledAt: new Date().toISOString(),
            reason: 'Service intervention cancelled by provider'
          }
        }
      })

      console.log('✅ Paiement annulé et remboursé')
    }

    // Créer une notification pour le client
    console.log('📢 Création de la notification client...')
    
    await prisma.notification.create({
      data: {
        userId: intervention.clientId,
        type: 'SERVICE_CANCELLED',
        title: 'Service annulé',
        message: `Votre service "${intervention.title}" a été annulé par le prestataire. Le remboursement sera traité.`,
        data: {
          interventionId: intervention.id,
          paymentId: intervention.paymentId,
          refundAmount: intervention.payment?.amount
        }
      }
    })

    console.log('✅ Notification créée')

    console.log('🎉 Intervention mise à jour avec succès!')
    console.log('📋 Résumé des changements:')
    console.log(`   - Statut: ${intervention.status} → CANCELLED`)
    console.log(`   - Paiement: ${intervention.payment?.status} → REFUNDED`)
    console.log(`   - Montant remboursé: ${intervention.payment?.amount}€`)
    console.log(`   - Client notifié: ${intervention.client.profile?.firstName} ${intervention.client.profile?.lastName}`)

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
updateServiceIntervention() 