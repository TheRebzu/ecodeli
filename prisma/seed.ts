import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import * as bcrypt from 'bcryptjs';
import { seedTutorial } from './seed/tutorial-seeds'

// Initialisation du client Prisma
const prisma = new PrismaClient();

// Nombre d'entités à créer
const USER_COUNT = {
  ADMIN: 2,
  CUSTOMER: 10,
  DELIVERY_PERSON: 8,
  MERCHANT: 5,
  SERVICE_PROVIDER: 5
};

// Configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';

/**
 * Fonction principale qui exécute le seed
 */
async function main() {
  console.log('🌱 Début du processus de seed...');
  
  // Nettoyage de la base de données
  await cleanDatabase();
  console.log('🧹 Base de données nettoyée');
  
  // Création des utilisateurs avec différents rôles
  const admins = await createUsers(USER_COUNT.ADMIN, UserRole.ADMIN);
  console.log(`👤 ${admins.length} administrateurs créés`);
  
  const customers = await createUsers(USER_COUNT.CUSTOMER, UserRole.CUSTOMER);
  console.log(`👤 ${customers.length} clients créés`);
  
  const deliveryPersons = await createUsers(USER_COUNT.DELIVERY_PERSON, UserRole.DELIVERY_PERSON);
  console.log(`👤 ${deliveryPersons.length} livreurs créés`);
  
  const merchants = await createUsers(USER_COUNT.MERCHANT, UserRole.MERCHANT);
  console.log(`👤 ${merchants.length} commerçants créés`);
  
  const serviceProviders = await createUsers(USER_COUNT.SERVICE_PROVIDER, UserRole.SERVICE_PROVIDER);
  console.log(`👤 ${serviceProviders.length} prestataires créés`);
  
  // Demo user for development and testing
  await createDemoUser();
  console.log('👤 Utilisateur de démo créé');
  
  // Seed des données de tutoriel
  await seedTutorial(prisma)
  
  console.log('✅ Seed terminé avec succès!');
}

/**
 * Nettoie la base de données avant de créer de nouvelles données
 */
async function cleanDatabase() {
  // Suppression des données dans l'ordre pour respecter les contraintes de clés étrangères
  console.log('Nettoyage de la base de données...');
  
  try {
    await prisma.$executeRaw`TRUNCATE TABLE "VerificationToken" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Session" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "Account" CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE;`;
    console.log('Base de données nettoyée avec succès.');
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de données:', error);
    // Alternative si les commandes RAW ne fonctionnent pas
    await prisma.$transaction([
      prisma.$queryRaw`DELETE FROM "VerificationToken";`,
      prisma.$queryRaw`DELETE FROM "Session";`,
      prisma.$queryRaw`DELETE FROM "Account";`,
      prisma.$queryRaw`DELETE FROM "User";`,
    ]);
  }
}

/**
 * Génère le mot de passe hashé
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Crée des utilisateurs avec un rôle spécifique
 */
async function createUsers(count: number, role: UserRole) {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: hashedPassword,
        role: role,
        status: UserStatus.APPROVED,
      }
    });
    
    users.push(user);
  }
  
  return users;
}

/**
 * Crée un utilisateur de démo avec accès facile pour le développement
 */
async function createDemoUser() {
  const hashedPassword = await hashPassword('demo123');
  
  // Vérifier si l'utilisateur de démo existe déjà
  const existingUser = await prisma.user.findUnique({
    where: {
      email: 'demo@ecodeli.com'
    }
  });
  
  if (!existingUser) {
    return prisma.user.create({
      data: {
        name: 'Utilisateur Démo',
        email: 'demo@ecodeli.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        status: UserStatus.APPROVED,
      }
    });
  }
  
  return existingUser;
}

// Exécution de la fonction principale puis fermeture de la connexion
main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });