const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestProvider() {
  try {
    console.log('🔧 Création d\'un compte provider de test...');
    
    const email = 'provider-test@example.com';
    const password = 'password123';
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('⚠️ Utilisateur existe déjà, suppression...');
      await prisma.user.delete({
        where: { email }
      });
    }
    
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'PROVIDER',
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'Provider',
            phone: '+33612345678'
          }
        }
      }
    });
    
    // Créer le profil provider
    await prisma.provider.create({
      data: {
        userId: user.id,
        validationStatus: 'PENDING',
        isActive: false
      }
    });
    
    // Ajouter des documents de test
    await prisma.document.createMany({
      data: [
        {
          userId: user.id,
          type: 'IDENTITY',
          filename: 'identite_provider_test.pdf',
          originalName: 'carte_identite.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          url: '/uploads/documents/identite_provider_test.pdf',
          validationStatus: 'PENDING'
        },
        {
          userId: user.id,
          type: 'CERTIFICATION',
          filename: 'certification_provider_test.pdf',
          originalName: 'certification.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          url: '/uploads/documents/certification_provider_test.pdf',
          validationStatus: 'PENDING'
        }
      ]
    });
    
    console.log('✅ Provider de test créé avec succès !');
    console.log('📧 Email:', email);
    console.log('🔑 Mot de passe:', password);
    console.log('👤 Nom:', 'Test Provider');
    console.log('📄 Documents:', '2 documents en attente de validation');
    
    // Tester la connexion
    console.log('\n🧪 Test de connexion...');
    const response = await fetch('http://localhost:3000/api/auth/simple-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.success) {
      console.log('✅ Connexion réussie !');
      console.log('🔗 URL de test: http://localhost:3000/fr/provider');
    } else {
      console.log('❌ Erreur de connexion:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestProvider(); 