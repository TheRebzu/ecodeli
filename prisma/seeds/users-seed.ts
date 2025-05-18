import {
  PrismaClient,
  UserRole,
  UserStatus,
  DocumentType,
  VerificationStatus,
  DeliveryStatusEnum,
  AddressType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker/locale/fr';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';
const VERIFICATION_ODDS = 0.7; // 70% des utilisateurs sont vérifiés

// Stocker les emails utilisés pour éviter les doublons
const usedEmails = new Set<string>();

/**
 * Fonction utilitaire pour hacher un mot de passe
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Fonction principale qui exécute le seed des utilisateurs
 */
async function main() {
  console.log('🌱 Démarrage du seed des utilisateurs et profils (version simplifiée)...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Créer directement un administrateur
    try {
      const adminUser = await createAdminUser();
      if (adminUser) {
        console.log('✅ Administrateur créé avec succès:', adminUser.email);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'administrateur:', error);
    }

    // Créer un client de test
    try {
      const clientUser = await createClientUser();
      if (clientUser) {
        console.log('✅ Client créé avec succès:', clientUser.email);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du client:', error);
    }

    // Créer un livreur de test
    try {
      const delivererUser = await createDelivererUser();
      if (delivererUser) {
        console.log('✅ Livreur créé avec succès:', delivererUser.email);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du livreur:', error);
    }

    // Créer un commerçant de test
    try {
      const merchantUser = await createMerchantUser();
      if (merchantUser) {
        console.log('✅ Commerçant créé avec succès:', merchantUser.email);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du commerçant:', error);
    }

    console.log('🎉 Seed terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

/**
 * Création directe d'un utilisateur administrateur
 */
async function createAdminUser() {
  const email = 'admin@ecodeli.me';
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  try {
    // Vérifier si l'admin existe déjà par email
    try {
      const existingAdmin = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingAdmin) {
        console.log(`Admin existe déjà avec l'email ${email}`);
        return existingAdmin;
      }
    } catch (error) {
      // Si findUnique échoue, on continue pour créer l'utilisateur quand même
      console.log('Impossible de vérifier l\'existence de l\'admin, tentative de création...');
    }

    // Créer l'utilisateur admin directement
    const admin = await prisma.user.create({
      data: {
        name: 'Admin Test',
        email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        isVerified: true,
        hasCompletedOnboarding: true,
        currentStatus: DeliveryStatusEnum.CREATED,
        admin: {
          create: {
            permissions: ['all', 'super_admin'],
            department: 'Direction'
          }
        }
      }
    });

    return admin;
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
    throw error;
  }
}

/**
 * Création directe d'un utilisateur client
 */
async function createClientUser() {
  const email = 'client@ecodeli.me';
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  try {
    // Vérifier si le client existe déjà par email
    try {
      const existingClient = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingClient) {
        console.log(`Client existe déjà avec l'email ${email}`);
        return existingClient;
      }
    } catch (error) {
      // Si findUnique échoue, on continue pour créer l'utilisateur quand même
      console.log('Impossible de vérifier l\'existence du client, tentative de création...');
    }

    // Créer l'utilisateur client directement
    const client = await prisma.user.create({
      data: {
        name: 'Client Test',
        email,
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        isVerified: true,
        hasCompletedOnboarding: true,
        currentStatus: DeliveryStatusEnum.CREATED,
        client: {
          create: {
            address: '123 Rue de Test',
            phone: '+33612345678',
            city: 'Paris',
            postalCode: '75001',
            country: 'France',
            preferredLanguage: 'fr',
            newsletterOptIn: true,
            notificationPrefs: {
              email: true,
              push: true,
              sms: false
            },
            deliveryAddresses: {
              create: [
                {
                  label: 'Domicile',
                  street: '123 Rue de Test',
                  city: 'Paris',
                  postalCode: '75001',
                  country: 'France',
                  isDefault: true,
                }
              ]
            }
          }
        }
      }
    });

    return client;
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    throw error;
  }
}

/**
 * Création directe d'un utilisateur livreur
 */
async function createDelivererUser() {
  const email = 'deliverer@ecodeli.me';
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  try {
    // Vérifier si le livreur existe déjà par email
    try {
      const existingDeliverer = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingDeliverer) {
        console.log(`Livreur existe déjà avec l'email ${email}`);
        return existingDeliverer;
      }
    } catch (error) {
      console.log('Impossible de vérifier l\'existence du livreur, tentative de création...');
    }

    // Créer l'utilisateur livreur directement
    const deliverer = await prisma.user.create({
      data: {
        name: 'Livreur Test',
        email,
        password: hashedPassword,
        role: UserRole.DELIVERER,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        isVerified: true,
        hasCompletedOnboarding: true,
        currentStatus: DeliveryStatusEnum.CREATED,
        deliverer: {
          create: {
            address: '42 Avenue de la Livraison',
            phone: '+33698765432',
            vehicleType: 'Vélo électrique',
            licensePlate: null,
            isVerified: true,
            availableHours: {
              monday: ['9:00-12:00', '14:00-18:00'],
              tuesday: ['9:00-12:00', '14:00-18:00'],
              wednesday: ['9:00-12:00', '14:00-18:00'],
              thursday: ['9:00-12:00', '14:00-18:00'],
              friday: ['9:00-12:00', '14:00-18:00']
            },
            maxCapacity: 25,
            isActive: true,
            serviceZones: {
              radius: 10,
              center: {
                lat: 48.8566,
                lng: 2.3522
              }
            },
            bio: 'Livreur à vélo expérimenté, je suis rapide et fiable.',
            yearsOfExperience: 3,
            maxWeightCapacity: 30,
            availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
            bankInfo: {
              iban: 'FR7630006000011234567890189',
              bic: 'AGRIFRPPXXX'
            }
          }
        }
      }
    });

    return deliverer;
  } catch (error) {
    console.error('Erreur lors de la création du livreur:', error);
    throw error;
  }
}

/**
 * Création directe d'un utilisateur commerçant
 */
async function createMerchantUser() {
  const email = 'merchant@ecodeli.me';
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  try {
    // Vérifier si le commerçant existe déjà par email
    try {
      const existingMerchant = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingMerchant) {
        console.log(`Commerçant existe déjà avec l'email ${email}`);
        return existingMerchant;
      }
    } catch (error) {
      console.log('Impossible de vérifier l\'existence du commerçant, tentative de création...');
    }

    // Créer l'utilisateur commerçant directement
    const merchant = await prisma.user.create({
      data: {
        name: 'Commerçant Test',
        email,
        password: hashedPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        isVerified: true,
        hasCompletedOnboarding: true,
        currentStatus: DeliveryStatusEnum.CREATED,
        merchant: {
          create: {
            companyName: 'Boutique Écologique Test',
            address: '17 Rue du Commerce',
            phone: '+33145678901',
            businessType: 'Magasin bio et local',
            vatNumber: 'FR12345678901',
            businessName: 'Boutique Écologique Test SARL',
            businessAddress: '17 Rue du Commerce',
            businessCity: 'Paris',
            businessPostal: '75004',
            businessCountry: 'France',
            taxId: '12345678901234',
            websiteUrl: 'https://boutique-eco-test.fr',
            isVerified: true,
            verificationDate: new Date(),
            logoUrl: 'https://placehold.co/200x200/EEE/333?text=Logo+Boutique',
            description: 'Boutique proposant des produits locaux et écologiques',
            paymentMethods: ['CB', 'ESPÈCES', 'VIREMENT'],
            deliveryOptions: ['STANDARD', 'EXPRESS'],
            foundingYear: 2020,
            employeeCount: 5
          }
        }
      }
    });

    return merchant;
  } catch (error) {
    console.error('Erreur lors de la création du commerçant:', error);
    throw error;
  }
}

// Exécution de la fonction principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Export pour permettre l'utilisation dans d'autres fichiers
export { main }; 