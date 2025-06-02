import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, generateFrenchPhone, generateFrenchAddress, generateFrenchEmail, hashPassword, getRandomElement, getRandomDate, generateRealisticStatus } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un livreur
 */
interface DelivererData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  image?: string;
  status: UserStatus;
  address: any;
  vehicle: any;
  serviceZones: string[];
  availability: any;
  verification: any;
  performance: any;
}

/**
 * Seed des utilisateurs livreurs EcoDeli
 */
export async function seedDelivererUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('DELIVERER_USERS');
  
  const result: SeedResult = {
    entity: 'deliverer_users',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier si les livreurs existent déjà
  const existingDeliverers = await prisma.user.findMany({
    where: { role: UserRole.DELIVERER }
  });
  
  if (existingDeliverers.length > 0 && !options.force) {
    logger.warning('DELIVERER_USERS', `${existingDeliverers.length} livreurs déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingDeliverers.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.deliverer.deleteMany({});
    await prisma.user.deleteMany({ where: { role: UserRole.DELIVERER } });
    logger.database('NETTOYAGE', 'deliverer users', 0);
  }

  // Zones de livraison disponibles en Île-de-France
  const serviceZones = [
    'Paris 1er', 'Paris 2ème', 'Paris 3ème', 'Paris 4ème', 'Paris 5ème',
    'Paris 6ème', 'Paris 7ème', 'Paris 8ème', 'Paris 9ème', 'Paris 10ème',
    'Paris 11ème', 'Paris 12ème', 'Paris 13ème', 'Paris 14ème', 'Paris 15ème',
    'Paris 16ème', 'Paris 17ème', 'Paris 18ème', 'Paris 19ème', 'Paris 20ème',
    'Boulogne-Billancourt', 'Levallois-Perret', 'Issy-les-Moulineaux',
    'Neuilly-sur-Seine', 'Vincennes', 'Saint-Denis', 'Montreuil', 'Créteil'
  ];

  // Types de véhicules disponibles
  const vehicleTypes = [
    { type: 'bike', name: 'Vélo', capacity: 15, maxWeight: 20, speed: 15 },
    { type: 'e-bike', name: 'Vélo électrique', capacity: 20, maxWeight: 25, speed: 25 },
    { type: 'scooter', name: 'Scooter', capacity: 30, maxWeight: 40, speed: 45 },
    { type: 'e-scooter', name: 'Scooter électrique', capacity: 30, maxWeight: 40, speed: 45 },
    { type: 'motorcycle', name: 'Moto', capacity: 40, maxWeight: 60, speed: 80 },
    { type: 'car', name: 'Voiture', capacity: 80, maxWeight: 200, speed: 50 },
    { type: 'van', name: 'Utilitaire', capacity: 150, maxWeight: 500, speed: 50 }
  ];

  // Générer 35 livreurs avec des profils variés
  const delivererUsers: DelivererData[] = [];
  
  // 20 livreurs actifs et vérifiés
  for (let i = 0; i < 20; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const address = generateFrenchAddress();
    const vehicle = getRandomElement(vehicleTypes);
    const isExperienced = Math.random() > 0.4; // 60% sont expérimentés
    const isFullTime = Math.random() > 0.3; // 70% travaillent à temps plein

    delivererUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'DelivererPass2024!',
      phoneNumber: generateFrenchPhone(),
      image: getRandomElement([
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150',
        undefined, undefined // 30% sans photo
      ]),
      status: UserStatus.ACTIVE,
      address,
      vehicle: {
        type: vehicle.type,
        name: vehicle.name,
        licensePlate: generateLicensePlate(vehicle.type),
        capacity: vehicle.capacity,
        maxWeight: vehicle.maxWeight,
        averageSpeed: vehicle.speed,
        isElectric: vehicle.type.includes('e-'),
        registrationDate: getRandomDate(90, 1095), // Entre 3 mois et 3 ans
        insuranceExpiry: faker.date.future({ years: 1 })
      },
      serviceZones: faker.helpers.arrayElements(serviceZones, { 
        min: isFullTime ? 5 : 2, 
        max: isFullTime ? 12 : 6 
      }),
      availability: {
        isActive: true,
        workingDays: isFullTime 
          ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          : faker.helpers.arrayElements(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], { min: 2, max: 4 }),
        workingHours: isFullTime 
          ? { start: '08:00', end: '20:00' }
          : { start: getRandomElement(['09:00', '10:00', '14:00', '18:00']), end: getRandomElement(['17:00', '18:00', '22:00', '23:00']) },
        maxOrdersPerDay: isFullTime ? faker.number.int({ min: 15, max: 25 }) : faker.number.int({ min: 5, max: 12 }),
        preferredOrderTypes: getRandomElement([
          ['food', 'groceries'],
          ['packages', 'documents'],
          ['pharmacy', 'urgent'],
          ['all']
        ])
      },
      verification: {
        isVerified: true,
        verificationDate: getRandomDate(30, 180),
        documentsStatus: 'APPROVED',
        backgroundCheckStatus: 'PASSED',
        drivingLicenseVerified: ['scooter', 'motorcycle', 'car', 'van'].includes(vehicle.type),
        identityVerified: true,
        addressVerified: true
      },
      performance: {
        rating: faker.number.float({ min: 4.2, max: 5.0 }),
        totalDeliveries: isExperienced ? faker.number.int({ min: 100, max: 1000 }) : faker.number.int({ min: 10, max: 100 }),
        successRate: faker.number.float({ min: 0.92, max: 1.0 }),
        averageDeliveryTime: faker.number.int({ min: 15, max: 45 }), // en minutes
        onTimeRate: faker.number.float({ min: 0.85, max: 0.98 }),
        customerRating: faker.number.float({ min: 4.0, max: 5.0 }),
        lastDeliveryDate: getRandomDate(1, 7),
        totalEarnings: isExperienced ? faker.number.float({ min: 5000, max: 25000 }) : faker.number.float({ min: 500, max: 5000 })
      }
    });
  }

  // 10 livreurs en attente de vérification
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const address = generateFrenchAddress();
    const vehicle = getRandomElement(vehicleTypes);

    delivererUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'DelivererPass2024!',
      phoneNumber: generateFrenchPhone(),
      image: getRandomElement([
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        undefined, undefined, undefined // 60% sans photo pour les nouveaux
      ]),
      status: UserStatus.INACTIVE, // En attente
      address,
      vehicle: {
        type: vehicle.type,
        name: vehicle.name,
        licensePlate: generateLicensePlate(vehicle.type),
        capacity: vehicle.capacity,
        maxWeight: vehicle.maxWeight,
        averageSpeed: vehicle.speed,
        isElectric: vehicle.type.includes('e-'),
        registrationDate: getRandomDate(1, 30), // Récemment enregistré
        insuranceExpiry: faker.date.future({ years: 1 })
      },
      serviceZones: faker.helpers.arrayElements(serviceZones, { min: 1, max: 3 }),
      availability: {
        isActive: false,
        workingDays: faker.helpers.arrayElements(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], { min: 2, max: 5 }),
        workingHours: { start: '09:00', end: '18:00' },
        maxOrdersPerDay: faker.number.int({ min: 5, max: 15 }),
        preferredOrderTypes: ['all']
      },
      verification: {
        isVerified: false,
        verificationDate: null,
        documentsStatus: getRandomElement(['PENDING', 'UNDER_REVIEW', 'MISSING_DOCS']),
        backgroundCheckStatus: 'PENDING',
        drivingLicenseVerified: false,
        identityVerified: Math.random() > 0.3, // 70% ont fourni leur identité
        addressVerified: Math.random() > 0.5 // 50% ont vérifié leur adresse
      },
      performance: {
        rating: null,
        totalDeliveries: 0,
        successRate: null,
        averageDeliveryTime: null,
        onTimeRate: null,
        customerRating: null,
        lastDeliveryDate: null,
        totalEarnings: 0
      }
    });
  }

  // 5 livreurs suspendus/rejetés
  for (let i = 0; i < 5; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const address = generateFrenchAddress();
    const vehicle = getRandomElement(vehicleTypes);
    const suspensionReason = getRandomElement([
      'Documents falsifiés',
      'Comportement inapproprié',
      'Trop de plaintes clients',
      'Violation des conditions de service',
      'Échec de la vérification d\'antécédents'
    ]);

    delivererUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'DelivererPass2024!',
      phoneNumber: generateFrenchPhone(),
      image: undefined,
      status: UserStatus.SUSPENDED,
      address,
      vehicle: {
        type: vehicle.type,
        name: vehicle.name,
        licensePlate: generateLicensePlate(vehicle.type),
        capacity: vehicle.capacity,
        maxWeight: vehicle.maxWeight,
        averageSpeed: vehicle.speed,
        isElectric: vehicle.type.includes('e-'),
        registrationDate: getRandomDate(30, 180),
        insuranceExpiry: faker.date.future({ years: 1 })
      },
      serviceZones: [],
      availability: {
        isActive: false,
        workingDays: [],
        workingHours: { start: '00:00', end: '00:00' },
        maxOrdersPerDay: 0,
        preferredOrderTypes: []
      },
      verification: {
        isVerified: false,
        verificationDate: getRandomDate(15, 60),
        documentsStatus: 'REJECTED',
        backgroundCheckStatus: getRandomElement(['FAILED', 'REJECTED']),
        drivingLicenseVerified: false,
        identityVerified: false,
        addressVerified: false,
        suspensionReason
      },
      performance: {
        rating: faker.number.float({ min: 2.0, max: 3.5 }),
        totalDeliveries: faker.number.int({ min: 5, max: 50 }),
        successRate: faker.number.float({ min: 0.60, max: 0.85 }),
        averageDeliveryTime: faker.number.int({ min: 30, max: 90 }),
        onTimeRate: faker.number.float({ min: 0.50, max: 0.80 }),
        customerRating: faker.number.float({ min: 2.0, max: 3.5 }),
        lastDeliveryDate: getRandomDate(30, 90),
        totalEarnings: faker.number.float({ min: 100, max: 2000 })
      }
    });
  }

  // Créer les utilisateurs livreurs par batch
  const batchSize = 5;
  for (let i = 0; i < delivererUsers.length; i += batchSize) {
    const batch = delivererUsers.slice(i, i + batchSize);
    
    for (const delivererData of batch) {
      try {
        logger.progress('DELIVERER_USERS', i + 1, delivererUsers.length, `Création: ${delivererData.name}`);

        // Hasher le mot de passe
        const hashedPassword = await hashPassword(delivererData.password);

        // Créer l'utilisateur avec le profil livreur
        const user = await prisma.user.create({
          data: {
            name: delivererData.name,
            email: delivererData.email,
            password: hashedPassword,
            role: UserRole.DELIVERER,
            status: delivererData.status,
            phoneNumber: delivererData.phoneNumber,
            image: delivererData.image,
            lastLoginAt: delivererData.status === UserStatus.ACTIVE ? getRandomDate(1, 7) : getRandomDate(7, 30),
            locale: 'fr-FR',
            preferences: {
              theme: getRandomElement(['light', 'dark', 'auto']),
              notifications: {
                email: true,
                push: true,
                sms: Math.random() > 0.5,
                orderAlerts: true,
                weeklyReport: true
              }
            },
            isVerified: delivererData.verification.isVerified,
            hasCompletedOnboarding: delivererData.verification.isVerified,
            onboardingCompletionDate: delivererData.verification.verificationDate,
            createdAt: getRandomDate(30, 180),
            updatedAt: getRandomDate(1, 30),
            // Créer le profil livreur associé
            deliverer: {
              create: {
                address: delivererData.address.street,
                phone: delivererData.phoneNumber,
                vehicleType: delivererData.vehicle.name,
                licensePlate: delivererData.vehicle.licensePlate,
                isVerified: delivererData.verification.isVerified,
                verificationDate: delivererData.verification.verificationDate,
                maxCapacity: delivererData.vehicle.capacity,
                maxWeightCapacity: delivererData.vehicle.maxWeight,
                isActive: delivererData.availability.isActive,
                rating: delivererData.performance.rating,
                serviceZones: delivererData.serviceZones,
                availableHours: delivererData.availability,
                availableDays: delivererData.availability.workingDays,
                bio: delivererData.status === UserStatus.ACTIVE ? faker.lorem.sentence() : null,
                yearsOfExperience: delivererData.performance.totalDeliveries > 100 ? faker.number.int({ min: 1, max: 5 }) : 0,
                preferredVehicle: delivererData.vehicle.type,
                                 bankInfo: delivererData.verification.isVerified ? {
                   iban: 'FR14 2004 1010 0505 0001 3M02 606',
                   bic: 'PSSTFRPPXXX',
                   accountHolder: delivererData.name
                 } : undefined,
                taxIdentifier: delivererData.verification.isVerified ? faker.string.alphanumeric(13).toUpperCase() : null,
                deliveryPreferences: {
                  vehicle: delivererData.vehicle,
                  verification: delivererData.verification,
                  performance: delivererData.performance
                },
                createdAt: getRandomDate(30, 180),
                updatedAt: getRandomDate(1, 30)
              }
            }
          },
          include: {
            deliverer: true
          }
        });

        logger.success('DELIVERER_USERS', `✅ Livreur créé: ${user.name} (${delivererData.status})`);
        result.created++;

      } catch (error: any) {
        logger.error('DELIVERER_USERS', `❌ Erreur création livreur ${delivererData.name}: ${error.message}`);
        result.errors++;
      }
    }
    
    // Progression par batch
    if (i + batchSize < delivererUsers.length) {
      logger.progress('DELIVERER_USERS', Math.min(i + batchSize, delivererUsers.length), delivererUsers.length);
    }
  }

  // Validation des livreurs créés
  const finalDeliverers = await prisma.user.findMany({
    where: { role: UserRole.DELIVERER },
    include: { deliverer: true }
  });
  
  if (finalDeliverers.length >= delivererUsers.length - result.errors) {
    logger.validation('DELIVERER_USERS', 'PASSED', `${finalDeliverers.length} livreurs créés avec succès`);
  } else {
    logger.validation('DELIVERER_USERS', 'FAILED', `Attendu: ${delivererUsers.length}, Créé: ${finalDeliverers.length}`);
  }

  // Statistiques par statut
  const byStatus = finalDeliverers.reduce((acc, deliverer) => {
    acc[deliverer.status] = (acc[deliverer.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('DELIVERER_USERS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques par véhicule
  const byVehicle = finalDeliverers.reduce((acc, deliverer) => {
    const vehicleType = deliverer.deliverer?.vehicleType || 'Non défini';
    acc[vehicleType] = (acc[vehicleType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('DELIVERER_USERS', `🚲 Répartition par véhicule: ${JSON.stringify(byVehicle)}`);

  // Statistiques de vérification
  const verifiedDeliverers = finalDeliverers.filter(deliverer => deliverer.deliverer?.isVerified);
  logger.info('DELIVERER_USERS', `✅ Livreurs vérifiés: ${verifiedDeliverers.length} (${Math.round(verifiedDeliverers.length / finalDeliverers.length * 100)}%)`);

  logger.endSeed('DELIVERER_USERS', result);
  return result;
}

/**
 * Génère une plaque d'immatriculation selon le type de véhicule
 */
function generateLicensePlate(vehicleType: string): string {
  if (['bike', 'e-bike'].includes(vehicleType)) {
    return `VEL${faker.string.numeric(4)}`; // Vélos avec numéro d'identification
  }
  
  // Format français pour véhicules motorisés
  const letters1 = faker.string.alpha({ length: 2, casing: 'upper' });
  const numbers = faker.string.numeric(3);
  const letters2 = faker.string.alpha({ length: 2, casing: 'upper' });
  
  return `${letters1}-${numbers}-${letters2}`;
}

/**
 * Valide l'intégrité des données livreurs
 */
export async function validateDelivererUsers(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des livreurs...');
  
  const deliverers = await prisma.user.findMany({
    where: { role: UserRole.DELIVERER },
    include: { deliverer: true }
  });

  let isValid = true;

  // Vérifier que tous les livreurs ont un profil associé
  const deliverersWithoutProfile = deliverers.filter(deliverer => !deliverer.deliverer);
  if (deliverersWithoutProfile.length > 0) {
    logger.error('VALIDATION', `❌ ${deliverersWithoutProfile.length} livreurs sans profil`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les livreurs ont un profil associé');
  }

  // Vérifier la cohérence statut/vérification
  const activeButNotVerified = deliverers.filter(deliverer => 
    deliverer.status === UserStatus.ACTIVE && !deliverer.deliverer?.isVerified
  );
  
  if (activeButNotVerified.length > 0) {
    logger.error('VALIDATION', `❌ ${activeButNotVerified.length} livreurs actifs mais non vérifiés`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Cohérence statut/vérification respectée');
  }

  // Vérifier les véhicules
  const deliverersWithoutVehicle = deliverers.filter(deliverer => 
    !deliverer.deliverer?.vehicleType || !deliverer.deliverer?.licensePlate
  );
  
  if (deliverersWithoutVehicle.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${deliverersWithoutVehicle.length} livreurs sans véhicule complet`);
  } else {
    logger.success('VALIDATION', '✅ Tous les livreurs ont un véhicule associé');
  }

  // Vérifier les zones de service pour les livreurs actifs
  const activeDeliverers = deliverers.filter(d => d.status === UserStatus.ACTIVE);
  const activeWithoutZones = activeDeliverers.filter(deliverer => {
    try {
      const zones = deliverer.deliverer?.serviceZones as string[];
      return !zones || zones.length === 0;
    } catch {
      return true;
    }
  });
  
  if (activeWithoutZones.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${activeWithoutZones.length} livreurs actifs sans zones de service`);
  } else {
    logger.success('VALIDATION', '✅ Tous les livreurs actifs ont des zones de service');
  }

  return isValid;
} 