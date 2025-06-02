import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, generateFrenchPhone, generateFrenchAddress, generateFrenchEmail, generateSiret, hashPassword, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un commerçant
 */
interface MerchantData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  image?: string;
  status: UserStatus;
  business: any;
  verification: any;
  address: any;
  operationalData: any;
}

/**
 * Seed des utilisateurs commerçants EcoDeli
 */
export async function seedMerchantUsers(
  prisma: PrismaClient, 
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('MERCHANT_USERS');
  
  const result: SeedResult = {
    entity: 'merchant_users',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier si les commerçants existent déjà
  const existingMerchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT }
  });
  
  if (existingMerchants.length > 0 && !options.force) {
    logger.warning('MERCHANT_USERS', `${existingMerchants.length} commerçants déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingMerchants.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.merchant.deleteMany({});
    await prisma.user.deleteMany({ where: { role: UserRole.MERCHANT } });
    logger.database('NETTOYAGE', 'merchant users', 0);
  }

  // Types de commerces disponibles
  const businessTypes = [
    {
      type: 'restaurant',
      category: 'Restauration',
      subcategories: ['Restaurant traditionnel', 'Fast-food', 'Pizzeria', 'Boulangerie-pâtisserie', 'Traiteur'],
      avgOrderValue: { min: 15, max: 45 },
      workingHours: { start: '11:00', end: '22:00' },
      deliveryRange: { min: 2, max: 8 }
    },
    {
      type: 'pharmacy',
      category: 'Pharmacie',
      subcategories: ['Pharmacie générale', 'Parapharmacie', 'Pharmacie de garde'],
      avgOrderValue: { min: 8, max: 35 },
      workingHours: { start: '08:30', end: '19:30' },
      deliveryRange: { min: 1, max: 5 }
    },
    {
      type: 'grocery',
      category: 'Alimentation',
      subcategories: ['Épicerie fine', 'Superette', 'Primeur', 'Fromagerie', 'Boucherie'],
      avgOrderValue: { min: 12, max: 60 },
      workingHours: { start: '09:00', end: '19:00' },
      deliveryRange: { min: 3, max: 10 }
    },
    {
      type: 'electronics',
      category: 'Électronique',
      subcategories: ['Informatique', 'Téléphonie', 'Électroménager', 'Hi-Fi/Vidéo'],
      avgOrderValue: { min: 50, max: 800 },
      workingHours: { start: '10:00', end: '19:00' },
      deliveryRange: { min: 5, max: 15 }
    },
    {
      type: 'fashion',
      category: 'Mode & Beauté',
      subcategories: ['Prêt-à-porter', 'Chaussures', 'Cosmétiques', 'Bijouterie'],
      avgOrderValue: { min: 25, max: 200 },
      workingHours: { start: '10:00', end: '19:00' },
      deliveryRange: { min: 3, max: 12 }
    }
  ];

  // Générer 20 commerçants avec des profils variés
  const merchantUsers: MerchantData[] = [];
  
  // 15 commerçants actifs avec boutiques
  for (let i = 0; i < 15; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const businessType = getRandomElement(businessTypes);
    const subcategory = getRandomElement(businessType.subcategories);
    const address = generateFrenchAddress();
    const companyName = generateCompanyName(businessType.category, address.city);
    const isEstablished = Math.random() > 0.3; // 70% sont établis depuis longtemps
    
    merchantUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'MerchantPass2024!',
      phoneNumber: generateFrenchPhone(),
      image: getRandomElement([
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        undefined, undefined // 30% sans photo
      ]),
      status: UserStatus.ACTIVE,
      business: {
        companyName,
        businessType: businessType.type,
        category: businessType.category,
        subcategory,
        siret: generateSiret(),
        vatNumber: `FR${faker.string.numeric(11)}`,
        description: generateBusinessDescription(businessType.category, subcategory),
        foundingYear: isEstablished 
          ? faker.number.int({ min: 1995, max: 2020 }) 
          : faker.number.int({ min: 2021, max: 2024 }),
        employeeCount: faker.number.int({ min: 1, max: 25 }),
        websiteUrl: Math.random() > 0.4 ? `https://www.${companyName.toLowerCase().replace(/\s+/g, '-')}.fr` : null
      },
      address,
      verification: {
        isVerified: true,
        verificationDate: getRandomDate(30, 180),
        documentsStatus: 'APPROVED',
        businessLicenseVerified: true,
        taxDocumentsVerified: true,
        bankAccountVerified: true,
        identityVerified: true,
        addressVerified: true
      },
      operationalData: {
        openingHours: generateOpeningHours(businessType.workingHours),
        deliveryOptions: getRandomElement([
          ['express', 'standard'],
          ['standard', 'scheduled'],
          ['express', 'standard', 'scheduled'],
          ['standard']
        ]),
        paymentMethods: getRandomElement([
          ['card', 'cash', 'digital'],
          ['card', 'digital'],
          ['card', 'cash'],
          ['card', 'cash', 'digital', 'check']
        ]),
        deliveryRange: faker.number.int(businessType.deliveryRange),
        averageOrderValue: faker.number.float({
          min: businessType.avgOrderValue.min,
          max: businessType.avgOrderValue.max
        }),
        monthlyOrders: isEstablished 
          ? faker.number.int({ min: 80, max: 400 })
          : faker.number.int({ min: 20, max: 80 }),
        customerRating: faker.number.float({ min: 4.0, max: 5.0 }),
        totalRevenue: isEstablished 
          ? faker.number.float({ min: 15000, max: 80000 })
          : faker.number.float({ min: 2000, max: 15000 })
      }
    });
  }

  // 5 commerçants en cours de validation
  for (let i = 0; i < 5; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const businessType = getRandomElement(businessTypes);
    const subcategory = getRandomElement(businessType.subcategories);
    const address = generateFrenchAddress();
    const companyName = generateCompanyName(businessType.category, address.city);
    
    merchantUsers.push({
      name: `${firstName} ${lastName}`,
      email: generateFrenchEmail(firstName, lastName),
      password: 'MerchantPass2024!',
      phoneNumber: generateFrenchPhone(),
      image: getRandomElement([
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        undefined, undefined, undefined // 75% sans photo pour les nouveaux
      ]),
      status: UserStatus.INACTIVE, // En cours de validation
      business: {
        companyName,
        businessType: businessType.type,
        category: businessType.category,
        subcategory,
        siret: generateSiret(),
        vatNumber: `FR${faker.string.numeric(11)}`,
        description: generateBusinessDescription(businessType.category, subcategory),
        foundingYear: faker.number.int({ min: 2023, max: 2024 }), // Récents
        employeeCount: faker.number.int({ min: 1, max: 5 }),
        websiteUrl: Math.random() > 0.7 ? `https://www.${companyName.toLowerCase().replace(/\s+/g, '-')}.fr` : null
      },
      address,
      verification: {
        isVerified: false,
        verificationDate: null,
        documentsStatus: getRandomElement(['PENDING', 'UNDER_REVIEW', 'MISSING_DOCS']),
        businessLicenseVerified: Math.random() > 0.4, // 60% ont fourni
        taxDocumentsVerified: Math.random() > 0.6, // 40% ont fourni
        bankAccountVerified: Math.random() > 0.5, // 50% ont fourni
        identityVerified: Math.random() > 0.2, // 80% ont fourni
        addressVerified: Math.random() > 0.3 // 70% ont fourni
      },
      operationalData: {
        openingHours: generateOpeningHours(businessType.workingHours),
        deliveryOptions: ['standard'],
        paymentMethods: ['card'],
        deliveryRange: faker.number.int({ min: 1, max: 5 }),
        averageOrderValue: 0,
        monthlyOrders: 0,
        customerRating: null,
        totalRevenue: 0
      }
    });
  }

  // Créer les utilisateurs commerçants par batch
  const batchSize = 5;
  for (let i = 0; i < merchantUsers.length; i += batchSize) {
    const batch = merchantUsers.slice(i, i + batchSize);
    
    for (const merchantData of batch) {
      try {
        logger.progress('MERCHANT_USERS', i + 1, merchantUsers.length, `Création: ${merchantData.name}`);

        // Hasher le mot de passe
        const hashedPassword = await hashPassword(merchantData.password);
        
        // Créer l'utilisateur avec le profil commerçant
        const user = await prisma.user.create({
          data: {
            name: merchantData.name,
            email: merchantData.email,
            password: hashedPassword,
            role: UserRole.MERCHANT,
            status: merchantData.status,
            phoneNumber: merchantData.phoneNumber,
            image: merchantData.image,
            lastLoginAt: merchantData.status === UserStatus.ACTIVE ? getRandomDate(1, 7) : getRandomDate(7, 30),
            locale: 'fr-FR',
            preferences: {
              theme: getRandomElement(['light', 'dark', 'auto']),
              notifications: {
                email: true,
                push: true,
                sms: Math.random() > 0.3, // 70% acceptent SMS
                orderAlerts: true,
                weeklyReport: true,
                promotionalEmails: Math.random() > 0.4
              },
              business: {
                autoAcceptOrders: merchantData.status === UserStatus.ACTIVE && Math.random() > 0.3,
                workingMode: getRandomElement(['full_time', 'part_time', 'weekends_only']),
                preferredPaymentMethod: getRandomElement(['bank_transfer', 'digital_wallet'])
              }
            },
            isVerified: merchantData.verification.isVerified,
            hasCompletedOnboarding: merchantData.verification.isVerified,
            onboardingCompletionDate: merchantData.verification.verificationDate,
            createdAt: getRandomDate(30, 180),
            updatedAt: getRandomDate(1, 30),
            // Créer le profil commerçant associé
            merchant: {
              create: {
                companyName: merchantData.business.companyName,
                address: merchantData.address.street,
                phone: merchantData.phoneNumber,
                businessType: merchantData.business.subcategory,
                vatNumber: merchantData.business.vatNumber,
                businessName: merchantData.business.companyName,
                businessAddress: merchantData.address.street,
                businessCity: merchantData.address.city,
                businessState: merchantData.address.state || 'Île-de-France',
                businessPostal: merchantData.address.zipCode,
                businessCountry: merchantData.address.country,
                taxId: merchantData.business.siret,
                websiteUrl: merchantData.business.websiteUrl,
                isVerified: merchantData.verification.isVerified,
                verificationDate: merchantData.verification.verificationDate,
                description: merchantData.business.description,
                openingHours: merchantData.operationalData.openingHours,
                paymentMethods: merchantData.operationalData.paymentMethods,
                deliveryOptions: merchantData.operationalData.deliveryOptions,
                foundingYear: merchantData.business.foundingYear,
                employeeCount: merchantData.business.employeeCount,
                createdAt: getRandomDate(30, 180),
                updatedAt: getRandomDate(1, 30)
              }
            }
          },
          include: {
            merchant: true
          }
        });

        logger.success('MERCHANT_USERS', `✅ Commerçant créé: ${user.name} - ${merchantData.business.companyName}`);
        result.created++;
        
      } catch (error: any) {
        logger.error('MERCHANT_USERS', `❌ Erreur création commerçant ${merchantData.name}: ${error.message}`);
        result.errors++;
      }
    }
    
    // Progression par batch
    if (i + batchSize < merchantUsers.length) {
      logger.progress('MERCHANT_USERS', Math.min(i + batchSize, merchantUsers.length), merchantUsers.length);
    }
  }

  // Validation des commerçants créés
  const finalMerchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT },
    include: { merchant: true }
  });
  
  if (finalMerchants.length >= merchantUsers.length - result.errors) {
    logger.validation('MERCHANT_USERS', 'PASSED', `${finalMerchants.length} commerçants créés avec succès`);
  } else {
    logger.validation('MERCHANT_USERS', 'FAILED', `Attendu: ${merchantUsers.length}, Créé: ${finalMerchants.length}`);
  }

  // Statistiques par statut
  const byStatus = finalMerchants.reduce((acc, merchant) => {
    acc[merchant.status] = (acc[merchant.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('MERCHANT_USERS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques par type d'activité
  const byBusinessType = finalMerchants.reduce((acc, merchant) => {
    const businessType = merchant.merchant?.businessType || 'Non défini';
    acc[businessType] = (acc[businessType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info('MERCHANT_USERS', `🏪 Répartition par activité: ${JSON.stringify(byBusinessType)}`);

  // Statistiques de vérification
  const verifiedMerchants = finalMerchants.filter(merchant => merchant.merchant?.isVerified);
  logger.info('MERCHANT_USERS', `✅ Commerçants vérifiés: ${verifiedMerchants.length} (${Math.round(verifiedMerchants.length / finalMerchants.length * 100)}%)`);

  logger.endSeed('MERCHANT_USERS', result);
  return result;
}

/**
 * Génère un nom de société selon le type d'activité et la ville
 */
function generateCompanyName(category: string, city: string): string {
  const prefixes = {
    'Restauration': ['Restaurant', 'Brasserie', 'Café', 'Bistrot', 'Chez'],
    'Pharmacie': ['Pharmacie', 'Parapharmacie'],
    'Alimentation': ['Épicerie', 'Marché', 'Primeur', 'Les Saveurs de'],
    'Électronique': ['TechStore', 'Digital', 'Électro', 'High-Tech'],
    'Mode & Beauté': ['Boutique', 'Mode', 'Style', 'Élégance']
  };

     const suffixes = [
     `du ${city}`,
     'Central',
     'Plus',
     'Express',
     faker.person.lastName(),
     faker.location.street()
   ];

   const categoryPrefixes = prefixes[category as keyof typeof prefixes] || ['Commerce'];
  const prefix = getRandomElement(categoryPrefixes);
  const suffix = getRandomElement(suffixes);

  return `${prefix} ${suffix}`;
}

/**
 * Génère une description d'entreprise
 */
function generateBusinessDescription(category: string, subcategory: string): string {
  const descriptions = {
    'Restauration': [
      `${subcategory} proposant une cuisine authentique et des produits frais`,
      `Spécialisé dans la ${subcategory.toLowerCase()}, nous privilégions les circuits courts`,
      `${subcategory} familial avec des recettes traditionnelles revisitées`
    ],
    'Pharmacie': [
      `${subcategory} de proximité, conseil personnalisé et livraison rapide`,
      `Votre ${subcategory.toLowerCase()} de confiance pour tous vos besoins santé et bien-être`,
      `${subcategory} moderne avec un large choix de produits de santé et beauté`
    ],
    'Alimentation': [
      `${subcategory} proposant des produits frais et de qualité`,
      `Spécialisé en produits bio et locaux, ${subcategory.toLowerCase()} de quartier`,
      `${subcategory} avec un choix varié de produits du terroir français`
    ],
    'Électronique': [
      `${subcategory} avec les dernières technologies et un service client expert`,
      `Spécialisé en ${subcategory.toLowerCase()}, vente et service après-vente`,
      `${subcategory} proposant les meilleures marques aux meilleurs prix`
    ],
    'Mode & Beauté': [
      `${subcategory} tendance avec les dernières collections de mode`,
      `Spécialisé en ${subcategory.toLowerCase()}, style et élégance`,
      `${subcategory} proposant un large choix de marques et conseils personnalisés`
    ]
  };

     const categoryDescriptions = descriptions[category as keyof typeof descriptions] || [`${subcategory} de qualité avec un service client exceptionnel`];
  return getRandomElement(categoryDescriptions);
}

/**
 * Génère des horaires d'ouverture réalistes
 */
function generateOpeningHours(baseHours: { start: string; end: string }): any {
  const openingHours = {
    monday: { open: baseHours.start, close: baseHours.end, closed: false },
    tuesday: { open: baseHours.start, close: baseHours.end, closed: false },
    wednesday: { open: baseHours.start, close: baseHours.end, closed: false },
    thursday: { open: baseHours.start, close: baseHours.end, closed: false },
    friday: { open: baseHours.start, close: baseHours.end, closed: false },
    saturday: { 
      open: baseHours.start, 
      close: getRandomElement([baseHours.end, '18:00', '17:00']), 
      closed: Math.random() > 0.8 // 20% fermés le samedi
    },
    sunday: { 
      open: '10:00', 
      close: '17:00', 
      closed: Math.random() > 0.3 // 70% fermés le dimanche
    }
  };

  // Certains commerces ferment le lundi
  if (Math.random() > 0.85) {
    openingHours.monday.closed = true;
  }

  return openingHours;
}

/**
 * Valide l'intégrité des données commerçants
 */
export async function validateMerchantUsers(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des commerçants...');
  
  const merchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT },
    include: { merchant: true }
  });

  let isValid = true;

  // Vérifier que tous les commerçants ont un profil associé
  const merchantsWithoutProfile = merchants.filter(merchant => !merchant.merchant);
  if (merchantsWithoutProfile.length > 0) {
    logger.error('VALIDATION', `❌ ${merchantsWithoutProfile.length} commerçants sans profil`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les commerçants ont un profil associé');
  }

  // Vérifier la cohérence statut/vérification
  const activeButNotVerified = merchants.filter(merchant => 
    merchant.status === UserStatus.ACTIVE && !merchant.merchant?.isVerified
  );
  
  if (activeButNotVerified.length > 0) {
    logger.error('VALIDATION', `❌ ${activeButNotVerified.length} commerçants actifs mais non vérifiés`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Cohérence statut/vérification respectée');
  }

  // Vérifier les données d'entreprise obligatoires
  const merchantsWithoutBusinessData = merchants.filter(merchant => 
    !merchant.merchant?.companyName || !merchant.merchant?.address || !merchant.merchant?.businessType
  );
  
  if (merchantsWithoutBusinessData.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${merchantsWithoutBusinessData.length} commerçants avec données d'entreprise incomplètes`);
  } else {
    logger.success('VALIDATION', '✅ Toutes les données d\'entreprise sont complètes');
  }

  // Vérifier la diversité des types d'activité
  const businessTypes = new Set(merchants.map(m => m.merchant?.businessType).filter(Boolean));
  if (businessTypes.size < 3) {
    logger.warning('VALIDATION', `⚠️ Faible diversité d'activités: ${businessTypes.size} types`);
  } else {
    logger.success('VALIDATION', `✅ Bonne diversité d'activités: ${businessTypes.size} types différents`);
  }

  return isValid;
} 