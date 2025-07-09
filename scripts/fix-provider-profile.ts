import { db } from '../src/lib/db'

async function fixProviderProfile() {
  try {
    console.log('🔍 Vérification du profil prestataire...')
    
    // ID de l'utilisateur prestataire depuis les logs
    const userId = 'cmcuheo96001oplmo347aa2f6'
    
    // Vérifier si l'utilisateur existe
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', userId)
      return
    }
    
    console.log('✅ Utilisateur trouvé:', {
      id: user.id,
      email: user.email,
      role: user.role
    })
    
    // Vérifier si le profil Provider existe
    const provider = await db.provider.findUnique({
      where: { userId: userId }
    })
    
    if (provider) {
      console.log('✅ Profil Provider existe déjà:', provider.id)
      return
    }
    
    console.log('❌ Profil Provider manquant, création...')
    
    // Créer le profil Provider
    const newProvider = await db.provider.create({
      data: {
        userId: userId,
        businessName: `Prestataire ${user.profile?.firstName || user.email}`,
        specialties: ['HOME_SERVICE'],
        hourlyRate: 25.0,
        description: 'Prestataire de services à domicile',
        validationStatus: 'APPROVED', // Auto-approuvé pour les tests
        isActive: true,
        activatedAt: new Date()
      }
    })
    
    console.log('✅ Profil Provider créé:', newProvider.id)
    
    // Créer un service par défaut
    const service = await db.service.create({
      data: {
        providerId: newProvider.id,
        name: 'Service à domicile',
        description: 'Service de base à domicile',
        type: 'HOME_SERVICE',
        basePrice: 25.0,
        priceUnit: 'HOUR',
        duration: 60,
        isActive: true,
        requirements: ['INSURANCE']
      }
    })
    
    console.log('✅ Service créé:', service.id)
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await db.$disconnect()
  }
}

fixProviderProfile() 