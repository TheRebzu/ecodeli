import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

export async function seedDeliveryValidations(ctx: SeedContext) {
  const { prisma } = ctx
  const deliveries = ctx.data.get('deliveries') || []
  
  console.log('   Creating delivery validations...')
  
  const validations = []
  
  // Créer des validations pour les livraisons
  for (const delivery of deliveries) {
    // Les livraisons DELIVERED ont une validation complète
    if (delivery.status === 'DELIVERED') {
      const validation = await prisma.deliveryValidation.create({
        data: {
          deliveryId: delivery.id,
          validationCode: delivery.validationCode,
          validatedBy: 'CLIENT',
          validatedAt: delivery.actualDeliveryAt || new Date(),
          validationType: 'CODE',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          attempts: Math.floor(1 + Math.random() * 2) // 1-2 tentatives
        }
      })
      validations.push(validation)
    }
    
    // Créer des logs de tentatives de validation
    if (delivery.status === 'IN_TRANSIT' || delivery.status === 'DELIVERED') {
      // Quelques tentatives échouées pour le réalisme
      if (Math.random() > 0.7) {
        await prisma.validationAttempt.create({
          data: {
            deliveryId: delivery.id,
            attemptedCode: Math.floor(100000 + Math.random() * 900000).toString(),
            attemptedBy: 'DELIVERER',
            attemptedAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000), // Dernière heure
            success: false,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            failureReason: 'INVALID_CODE'
          }
        })
      }
    }
  }
  
  console.log(`   ✓ Created ${validations.length} delivery validations`)
  
  return validations
} 