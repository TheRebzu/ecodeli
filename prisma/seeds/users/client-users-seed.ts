import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, generateFrenchPhone, generateFrenchAddress, generateFrenchEmail, hashPassword, getRandomElement, getRandomDate, generateRealisticStatus } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un client
 */
interface ClientData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  image?: string;
  status: UserStatus;
  address: any;
  preferences: any;
  communicationPreferences: any;
  orderHistory: any;
}

/**
 * Seed des utilisateurs clients EcoDeli
 */
export async function seedClientUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('CLIENT_USERS');
  
  const result: SeedResult = {
    entity: 'client_users',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier si les clients existent déjà
  const existingClients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT }
  });
  
  if (existingClients.length > 0 && !options.force) {
    logger.warning('CLIENT_USERS', `${existingClients.length} clients déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingClients.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({ where: { role: UserRole.CLIENT } });
    logger.database('NETTOYAGE', 'client users', 0);
  }

  // Générer 100 clients avec des profils variés
  const clientUsers: ClientData[] = [];
  
  // IMPORTANT: Client principal pour les tests - octavia.zemlak@orange.fr
  const principalClientAddress = generateFrenchAddress();
  clientUsers.push({
    name: 'Octavia Zemlak',
    email: 'octavia.zemlak@orange.fr',
    password: 'ClientPass2024!',
    phoneNumber: generateFrenchPhone(),
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
    status: UserStatus.ACTIVE,
    address: principalClientAddress,
    preferences: {
      theme: 'light',
      language: 'fr-FR',
      currency: 'EUR',
      notifications: {
        email: true,
        push: true,
        sms: true,
        orderUpdates: true,
        promotions: true
      },
      delivery: {
        preferredTimeSlot: 'flexible',
        leaveAtDoor: false,
        preferredDeliverer: 'same_person',
        deliveryInstructions: 'Appeler avant de livrer. Interphone Zemlak.'
      },
      shopping: {
        ecoFriendly: true,
        localProducts: true,
        organicProducts: true,
        bulkOrders: true,
        priceComparison: true
      }
    },
    communicationPreferences: {
      preferredMethod: 'email',
      marketingConsent: true,
      feedbackParticipation: true,
      newsletterSubscription: true,
      personalizedOffers: true
    },
    orderHistory: {
      totalOrders: 45,
      averageOrderValue: 85.50,
      lastOrderDate: getRandomDate(1, 7),
      favoriteCategories: ['groceries', 'fresh', 'organic'],
      deliveryRating: 4.8
    }
  });
  
  // Générer les autres clients (99)
  for (let i = 0; i < 99; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const address = generateFrenchAddress();
    
    // Générer un statut basé sur les probabilités demandées
    const status = generateRealisticStatus([
      { status: UserStatus.ACTIVE, probability: 80 },
      { status: UserStatus.INACTIVE, probability: 15 },
      { status: UserStatus.SUSPENDED, probability: 5 }
    ]);

    // Définir les préférences selon le profil
    const isActiveBuyer = status === UserStatus.ACTIVE && Math.random() > 0.3;
    const isEcoConscious = Math.random() > 0.4;
    const isDeliveryFrequent = isActiveBuyer && Math.random() > 0.5;

    clientUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'ClientPass2024!',
      phoneNumber: generateFrenchPhone(),
             image: getRandomElement([
         'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
         'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
         'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
         'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
         undefined, undefined, undefined // 30% sans photo
       ]),
      status,
      address,
      preferences: {
        theme: getRandomElement(['light', 'dark', 'auto']),
        language: 'fr-FR',
        currency: 'EUR',
        notifications: {
          email: Math.random() > 0.2, // 80% acceptent les emails
          push: Math.random() > 0.3, // 70% acceptent les push
          sms: Math.random() > 0.7, // 30% acceptent les SMS
          orderUpdates: true,
          promotions: Math.random() > 0.5
        },
        delivery: {
          preferredTimeSlot: getRandomElement(['morning', 'afternoon', 'evening', 'flexible']),
          leaveAtDoor: Math.random() > 0.6,
          preferredDeliverer: isDeliveryFrequent ? getRandomElement([null, 'same_person', 'any']) : null,
          deliveryInstructions: isDeliveryFrequent ? faker.lorem.sentence() : null
        },
        shopping: {
          ecoFriendly: isEcoConscious,
          localProducts: isEcoConscious && Math.random() > 0.3,
          organicProducts: isEcoConscious && Math.random() > 0.4,
          bulkOrders: isActiveBuyer && Math.random() > 0.7,
          priceComparison: Math.random() > 0.3
        }
      },
      communicationPreferences: {
        preferredMethod: getRandomElement(['email', 'sms', 'push', 'phone']),
        marketingConsent: Math.random() > 0.4, // 60% acceptent le marketing
        feedbackParticipation: Math.random() > 0.5,
        newsletterSubscription: Math.random() > 0.3,
        personalizedOffers: Math.random() > 0.4
      },
      orderHistory: {
        totalOrders: isActiveBuyer ? faker.number.int({ min: 5, max: 50 }) : faker.number.int({ min: 0, max: 5 }),
        averageOrderValue: isActiveBuyer ? faker.number.float({ min: 25.0, max: 120.0 }) : faker.number.float({ min: 10.0, max: 40.0 }),
        lastOrderDate: status === UserStatus.ACTIVE ? getRandomDate(1, 30) : getRandomDate(30, 90),
        favoriteCategories: getRandomElement([
          ['groceries', 'fresh'],
          ['pharmacy', 'health'],
          ['electronics', 'home'],
          ['books', 'entertainment'],
          ['food_delivery', 'restaurants'],
          ['mixed']
        ]),
        deliveryRating: isActiveBuyer ? faker.number.float({ min: 3.5, max: 5.0 }) : null
      }
    });
  }

  // Créer les utilisateurs clients par batch pour optimiser les performances
  const batchSize = 10;
  for (let i = 0; i < clientUsers.length; i += batchSize) {
    const batch = clientUsers.slice(i, i + batchSize);
    
    for (const clientData of batch) {
      try {
        logger.progress('CLIENT_USERS', i + 1, clientUsers.length, `Création: ${clientData.name}`);

        // Hasher le mot de passe
        const hashedPassword = await hashPassword(clientData.password);

        // Créer l'utilisateur avec le profil client
        const user = await prisma.user.create({
          data: {
            name: clientData.name,
            email: clientData.email,
            password: hashedPassword,
            role: UserRole.CLIENT,
            status: clientData.status,
            phoneNumber: clientData.phoneNumber,
            image: clientData.image,
            lastLoginAt: clientData.status === UserStatus.ACTIVE ? getRandomDate(1, 7) : getRandomDate(7, 30),
            locale: 'fr-FR',
            preferences: clientData.preferences,
            isVerified: Math.random() > 0.1, // 90% vérifiés
            hasCompletedOnboarding: Math.random() > 0.05, // 95% ont complété l'onboarding
            onboardingCompletionDate: getRandomDate(30, 180),
            createdAt: getRandomDate(30, 180), // Créé il y a 1-6 mois
            updatedAt: getRandomDate(1, 30), // Mis à jour récemment
            // Créer le profil client associé
            client: {
                             create: {
                 address: clientData.address.street,
                 city: clientData.address.city,
                 postalCode: clientData.address.zipCode,
                 country: clientData.address.country,
                 phone: clientData.phoneNumber,
                 preferences: {
                   ...clientData.preferences,
                   communicationPreferences: clientData.communicationPreferences,
                   orderHistory: clientData.orderHistory,
                   loyaltyPoints: clientData.orderHistory.totalOrders * faker.number.int({ min: 5, max: 15 }),
                   isVip: clientData.orderHistory.totalOrders > 30 && clientData.orderHistory.averageOrderValue > 80
                 },
                 createdAt: getRandomDate(30, 180),
                 updatedAt: getRandomDate(1, 30)
               }
            }
          },
          include: {
            client: true
          }
        });

        logger.success('CLIENT_USERS', `✅ Client créé: ${user.name} (${clientData.status})`);
        result.created++;

      } catch (error: any) {
        logger.error('CLIENT_USERS', `❌ Erreur création client ${clientData.name}: ${error.message}`);
        result.errors++;
      }
    }
    
    // Progression par batch
    if (i + batchSize < clientUsers.length) {
      logger.progress('CLIENT_USERS', Math.min(i + batchSize, clientUsers.length), clientUsers.length);
    }
  }

  // Validation des clients créés
  const finalClients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    include: { client: true }
  });
  
  if (finalClients.length >= clientUsers.length - result.errors) {
    logger.validation('CLIENT_USERS', 'PASSED', `${finalClients.length} clients créés avec succès`);
  } else {
    logger.validation('CLIENT_USERS', 'FAILED', `Attendu: ${clientUsers.length}, Créé: ${finalClients.length}`);
  }

  // Statistiques par statut
  const byStatus = finalClients.reduce((acc, client) => {
    acc[client.status] = (acc[client.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('CLIENT_USERS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

     // Statistiques VIP
   const vipClients = finalClients.filter(client => {
     try {
       const preferences = client.client?.preferences as any;
       return preferences?.isVip === true;
     } catch {
       return false;
     }
   });
   logger.info('CLIENT_USERS', `👑 Clients VIP: ${vipClients.length} (${Math.round(vipClients.length / finalClients.length * 100)}%)`);

   // Statistiques de vérification
   const verifiedClients = finalClients.filter(client => client.isVerified);
   logger.info('CLIENT_USERS', `✅ Clients vérifiés: ${verifiedClients.length} (${Math.round(verifiedClients.length / finalClients.length * 100)}%)`);

   logger.endSeed('CLIENT_USERS', result);
   return result;
}

/**
 * Valide l'intégrité des données clients
 */
export async function validateClientUsers(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des clients...');
  
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    include: { client: true }
  });

  let isValid = true;

  // Vérifier que tous les clients ont un profil associé
  const clientsWithoutProfile = clients.filter(client => !client.client);
  if (clientsWithoutProfile.length > 0) {
    logger.error('VALIDATION', `❌ ${clientsWithoutProfile.length} clients sans profil`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les clients ont un profil associé');
  }

  // Vérifier la répartition des statuts
  const activeClients = clients.filter(client => client.status === UserStatus.ACTIVE);
  const activePercentage = (activeClients.length / clients.length) * 100;
  
  if (activePercentage < 75 || activePercentage > 85) {
    logger.warning('VALIDATION', `⚠️ Pourcentage de clients actifs inhabituel: ${activePercentage.toFixed(1)}%`);
  } else {
    logger.success('VALIDATION', `✅ Répartition des statuts correcte: ${activePercentage.toFixed(1)}% actifs`);
  }

  // Vérifier l'intégrité des emails
  const duplicateEmails = await prisma.user.groupBy({
    by: ['email'],
    where: { role: UserRole.CLIENT },
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  });

  if (duplicateEmails.length > 0) {
    logger.error('VALIDATION', `❌ ${duplicateEmails.length} emails dupliqués détectés`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les emails sont uniques');
  }

     // Vérifier les adresses
   const clientsWithoutAddress = clients.filter(client => 
     !client.client?.address || !client.client?.city || !client.client?.postalCode
   );
   
   if (clientsWithoutAddress.length > 0) {
     logger.warning('VALIDATION', `⚠️ ${clientsWithoutAddress.length} clients avec adresses incomplètes`);
   } else {
     logger.success('VALIDATION', '✅ Toutes les adresses sont complètes');
   }

  return isValid;
} 