import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Configuration du client Prisma
const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Création d\'un client test...');

  try {
    const hashedPassword = await hashPassword('123456');
    
    // Recherche si le client existe déjà
    const existingClient = await prisma.user.findUnique({
      where: { email: 'client@ecodeli.me' }
    });
    
    if (existingClient) {
      console.log('✅ Client test existe déjà');
      return existingClient;
    }
    
    // Créer l'utilisateur client avec le minimum de champs
    const client = await prisma.user.create({
      data: {
        name: 'Client Test',
        email: 'client@ecodeli.me',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        isVerified: true,
        hasCompletedOnboarding: true,
        client: {
          create: {
            address: '123 Rue de Test',
            phone: '+33612345678',
            city: 'Paris',
            postalCode: '75001',
            country: 'France'
          }
        }
      }
    });
    
    console.log('✅ Client créé avec succès:', client.email);
    return client;
  } catch (error) {
    console.error('❌ Erreur lors de la création du client:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution de la fonction principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 