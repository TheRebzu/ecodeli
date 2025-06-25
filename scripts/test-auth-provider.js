const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testProviderAuth() {
  try {
    console.log('🔍 Test d\'authentification provider...');
    
    // 1. Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: 'celianlivreur@celian-vf.fr' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:');
    console.log('- Email:', user.email);
    console.log('- Rôle:', user.role);
    console.log('- Mot de passe hashé:', user.password.substring(0, 20) + '...');
    
    // 2. Tester le hash du mot de passe
    const testPassword = 'password123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('🔐 Test mot de passe:');
    console.log('- Mot de passe testé:', testPassword);
    console.log('- Hash valide:', isPasswordValid);
    
    if (isPasswordValid) {
      console.log('✅ Mot de passe correct !');
      
      // 3. Tester l'API de connexion
      console.log('\n🌐 Test API de connexion...');
      const response = await fetch('http://localhost:3000/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: testPassword
        })
      });
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        console.log('✅ API de connexion fonctionne !');
        console.log('Redirection vers:', data.user?.role === 'PROVIDER' ? '/provider' : '/dashboard');
      } else {
        console.log('❌ Erreur API:', data.error);
      }
    } else {
      console.log('❌ Mot de passe incorrect');
      
      // Essayer de deviner le mot de passe
      const commonPasswords = ['password123', 'Test123!', 'admin123', '123456'];
      for (const pwd of commonPasswords) {
        const isValid = await bcrypt.compare(pwd, user.password);
        if (isValid) {
          console.log('🔍 Mot de passe trouvé:', pwd);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProviderAuth(); 