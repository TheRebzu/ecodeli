const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProviderProfile() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'provider-test@example.com' },
      include: { provider: true }
    });
    
    if (user) {
      console.log('✅ Utilisateur trouvé:', user.email);
      console.log('👤 Profil provider:', user.provider ? 'Créé' : 'Manquant');
      
      if (user.provider) {
        console.log('📊 Statut validation:', user.provider.validationStatus);
        console.log('🔄 Actif:', user.provider.isActive);
      } else {
        console.log('❌ Profil provider manquant - création...');
        
        await prisma.provider.create({
          data: {
            userId: user.id,
            validationStatus: 'PENDING',
            isActive: false
          }
        });
        
        console.log('✅ Profil provider créé');
      }
    } else {
      console.log('❌ Utilisateur non trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProviderProfile(); 