const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';

// Helper function
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Créer deux utilisateurs test pour la vérification
async function createVerificationTestUsers() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  let merchantUser = null;
  let providerUser = null;

  try {
    console.log('🌱 Création des utilisateurs de test pour la vérification...');

    // Vérifier et créer l'utilisateur merchant si nécessaire
    const merchantEmail = 'merchant.verification@ecodeli.me';
    const existingMerchant = await prisma.user.findUnique({
      where: { email: merchantEmail },
    });

    if (!existingMerchant) {
      merchantUser = await prisma.user.create({
        data: {
          name: 'Marc Dubois',
          email: merchantEmail,
          password: hashedPassword,
          role: 'MERCHANT',
          status: 'ACTIVE',
          emailVerified: new Date(),
          phoneNumber: '+33712345678',
          locale: 'fr',
          isVerified: false,
          hasCompletedOnboarding: true,
          merchant: {
            create: {
              companyName: 'Boulangerie Dubois',
              address: '15 Rue des Artisans, Lyon',
              phone: '+33712345678',
              businessType: 'BAKERY',
              vatNumber: 'FR12345678901',
              isVerified: false,
            },
          },
        },
      });
      
      console.log('✅ Merchant utilisateur créé avec email vérifié mais en attente de documents:', merchantEmail);
    } else {
      console.log(`ℹ️ Merchant utilisateur avec l'email ${merchantEmail} existe déjà`);
      merchantUser = existingMerchant;
    }

    // Vérifier et créer l'utilisateur provider si nécessaire
    const providerEmail = 'provider.verification@ecodeli.me';
    const existingProvider = await prisma.user.findUnique({
      where: { email: providerEmail },
    });

    if (!existingProvider) {
      providerUser = await prisma.user.create({
        data: {
          name: 'Sophie Martin',
          email: providerEmail,
          password: hashedPassword,
          role: 'PROVIDER',
          status: 'ACTIVE',
          emailVerified: new Date(),
          phoneNumber: '+33623456789',
          locale: 'fr',
          isVerified: false,
          hasCompletedOnboarding: true,
          isProvider: true,
          provider: {
            create: {
              companyName: 'Martin Services',
              address: '42 Avenue des Prestataires, Paris',
              phone: '+33623456789',
              services: ['CLEANING', 'HANDYMAN'],
              isVerified: false,
            },
          },
        },
      });
      
      console.log('✅ Provider utilisateur créé avec email vérifié mais en attente de documents:', providerEmail);
    } else {
      console.log(`ℹ️ Provider utilisateur avec l'email ${providerEmail} existe déjà`);
      providerUser = existingProvider;
    }

    console.log('🎉 Création des utilisateurs de test terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la création des utilisateurs de test:', error);
  } finally {
    await prisma.$disconnect();
  }

  return { merchantUser, providerUser };
}

// Exécuter la fonction
createVerificationTestUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 