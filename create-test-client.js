require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestClient() {
  try {
    console.log('🔧 Création d\'un utilisateur CLIENT de test...');
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: 'client@test.com' }
    });
    
    if (existingUser) {
      console.log('✅ Utilisateur CLIENT de test existe déjà');
      console.log('📧 Email: client@test.com');
      console.log('🔑 Mot de passe: Test123!');
      return;
    }
    
    // Créer l'utilisateur
    const hashedPassword = await bcrypt.hash('Test123!', 12);
    
    const user = await prisma.user.create({
      data: {
        email: 'client@test.com',
        password: hashedPassword,
        role: 'CLIENT',
        isActive: true,
        validationStatus: 'APPROVED',
        name: 'Client Test',
        profile: {
          create: {
            firstName: 'Client',
            lastName: 'Test',
            phone: '+33123456789',
            address: '123 Rue de Test',
            city: 'Paris',
            postalCode: '75001',
            country: 'France',
            verified: true
          }
        },
        client: {
          create: {
            subscriptionPlan: 'FREE',
            totalDeliveries: 0,
            totalSpent: 0,
            isActive: true
          }
        }
      }
    });
    
    console.log('✅ Utilisateur CLIENT de test créé avec succès !');
    console.log('📧 Email: client@test.com');
    console.log('🔑 Mot de passe: Test123!');
    console.log('🆔 ID:', user.id);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestClient(); 