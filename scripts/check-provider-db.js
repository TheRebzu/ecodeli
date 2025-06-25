const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProviderDB() {
  try {
    console.log('🔍 Vérification directe dans la base de données...');
    
    // 1. Vérifier l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'provider-test@example.com' },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:', user.email, '(ID:', user.id, ')');
    
    // 2. Vérifier le profil provider
    const provider = await prisma.provider.findUnique({
      where: { userId: user.id }
    });
    
    if (!provider) {
      console.log('❌ Profil provider non trouvé');
      
      // Lister tous les providers pour debug
      const allProviders = await prisma.provider.findMany({
        select: { id: true, userId: true, businessName: true }
      });
      
      console.log('📊 Tous les providers dans la DB:', allProviders);
      return;
    }
    
    console.log('✅ Profil provider trouvé:');
    console.log('- ID:', provider.id);
    console.log('- Business Name:', provider.businessName);
    console.log('- Validation Status:', provider.validationStatus);
    console.log('- Is Active:', provider.isActive);
    console.log('- Specialties:', provider.specialties);
    
    // 3. Tester la requête exacte de getProviderData
    console.log('\n🔍 Test de la requête getProviderData...');
    const providerWithUser = await prisma.provider.findUnique({
      where: { userId: user.id },
      include: {
        user: true
      }
    });
    
    console.log('✅ Requête getProviderData réussie:', !!providerWithUser);
    if (providerWithUser) {
      console.log('- Provider ID:', providerWithUser.id);
      console.log('- User ID:', providerWithUser.user.id);
      console.log('- User Email:', providerWithUser.user.email);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProviderDB(); 