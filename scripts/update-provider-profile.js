const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProviderProfile() {
  try {
    // Trouver l'utilisateur provider
    const user = await prisma.user.findUnique({
      where: { email: 'provider-test@example.com' },
      include: { provider: true }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:', user.email);
    
    if (user.provider) {
      console.log('👤 Profil provider existant - mise à jour...');
      
      // Mettre à jour le profil avec tous les champs requis
      const updatedProvider = await prisma.provider.update({
        where: { id: user.provider.id },
        data: {
          businessName: 'Services Test Provider',
          siret: '12345678901234',
          specialties: ['TRANSPORT', 'HOME_SERVICE'],
          hourlyRate: 25.0,
          description: 'Prestataire de services de test pour EcoDeli',
          averageRating: 4.5,
          totalBookings: 0,
          isActive: true,
          monthlyInvoiceDay: 30,
          activatedAt: new Date(),
          lastActiveAt: new Date(),
          zone: {
            coordinates: [2.3522, 48.8566], // Paris
            radius: 50 // 50km
          }
        }
      });
      
      console.log('✅ Profil provider mis à jour:', updatedProvider.businessName);
      
    } else {
      console.log('❌ Profil provider manquant - création...');
      
      // Créer un profil provider complet
      const newProvider = await prisma.provider.create({
        data: {
          userId: user.id,
          businessName: 'Services Test Provider',
          siret: '12345678901234',
          specialties: ['TRANSPORT', 'HOME_SERVICE'],
          hourlyRate: 25.0,
          description: 'Prestataire de services de test pour EcoDeli',
          averageRating: 4.5,
          totalBookings: 0,
          isActive: true,
          monthlyInvoiceDay: 30,
          activatedAt: new Date(),
          lastActiveAt: new Date(),
          zone: {
            coordinates: [2.3522, 48.8566], // Paris
            radius: 50 // 50km
          }
        }
      });
      
      console.log('✅ Profil provider créé:', newProvider.businessName);
    }
    
    // Vérifier le profil final
    const finalUser = await prisma.user.findUnique({
      where: { email: 'provider-test@example.com' },
      include: { provider: true }
    });
    
    console.log('\n📊 Profil final:');
    console.log('- Business Name:', finalUser.provider?.businessName);
    console.log('- Validation Status:', finalUser.provider?.validationStatus);
    console.log('- Is Active:', finalUser.provider?.isActive);
    console.log('- Specialties:', finalUser.provider?.specialties);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProviderProfile(); 