import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

export async function seedDeliveryValidations(ctx: SeedContext) {
  const { prisma } = ctx
  
  console.log('   Creating delivery validations...')
  
  // Récupérer les livraisons depuis la base de données
  const deliveries = await prisma.delivery.findMany({
    where: { status: 'DELIVERED' }
  })
  
  const validations = []
  
  // Créer des validations pour les livraisons
  for (const delivery of deliveries) {
    // Les livraisons DELIVERED ont une validation complète
    if (delivery.status === 'DELIVERED') {
      const validation = await prisma.deliveryValidation.create({
        data: {
          deliveryId: delivery.id,
          code: delivery.validationCode,
          isUsed: true,
          usedAt: delivery.actualDeliveryDate || new Date(),
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // Expire dans 2h
        }
      })
      validations.push(validation)
    }
    
    // Tentatives de validation (simplifiées)
    // Note: Les tentatives sont maintenant gérées par le champ 'attempts' dans DeliveryValidation
  }
  
  console.log(`   ✓ Created ${validations.length} delivery validations`)
  
  return validations
} 