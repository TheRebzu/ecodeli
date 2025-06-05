import { PrismaClient, ServiceCategory } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { defaultSeedConfig } from '../seed.config';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un service de prestataire
 */
interface ProviderServiceData {
  providerId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
}

/**
 * Seed des services de prestataires EcoDeli
 * Crée des services variés pour chaque prestataire vérifié
 */
export async function seedProviderServices(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PROVIDER_SERVICES');

  const result: SeedResult = {
    entity: 'Service',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer les prestataires vérifiés
  const verifiedProviders = await prisma.provider.findMany({
    where: { isVerified: true },
    include: { user: true },
  });

  if (verifiedProviders.length === 0) {
    logger.warning(
      'PROVIDER_SERVICES',
      "Aucun prestataire vérifié trouvé - exécuter d'abord les seeds prestataires"
    );
    return result;
  }

  // Récupérer les catégories de services
  const serviceCategories = await prisma.serviceCategory.findMany();

  if (serviceCategories.length === 0) {
    logger.warning(
      'PROVIDER_SERVICES',
      "Aucune catégorie de service trouvée - exécuter d'abord les seeds catégories"
    );
    return result;
  }

  // Vérifier si des services existent déjà
  const existingServices = await prisma.service.findMany();

  if (existingServices.length > 0 && !options.force) {
    logger.warning(
      'PROVIDER_SERVICES',
      `${existingServices.length} services déjà présents - utiliser force:true pour recréer`
    );
    result.skipped = existingServices.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    const deleted = await prisma.service.deleteMany({});
    logger.database('NETTOYAGE', 'Service', deleted.count);
  }

  // Modèles de services par catégorie
  const serviceTemplates: Record<string, any[]> = {
    Nettoyage: [
      {
        name: 'Nettoyage domicile standard',
        price: 25,
        duration: 120,
        description: 'Nettoyage complet de votre domicile',
      },
      {
        name: 'Nettoyage bureaux',
        price: 35,
        duration: 180,
        description: "Nettoyage professionnel d'espaces de travail",
      },
      {
        name: 'Nettoyage après travaux',
        price: 45,
        duration: 240,
        description: 'Remise en état après rénovation',
      },
      {
        name: 'Nettoyage vitres',
        price: 15,
        duration: 60,
        description: 'Nettoyage des vitres intérieures et extérieures',
      },
    ],
    Jardinage: [
      {
        name: 'Tonte de pelouse',
        price: 20,
        duration: 90,
        description: "Tonte et ramassage de l'herbe",
      },
      {
        name: 'Taille de haies',
        price: 30,
        duration: 120,
        description: 'Taille et mise en forme des haies',
      },
      {
        name: 'Plantation saisonnière',
        price: 40,
        duration: 180,
        description: 'Plantation de fleurs et arbustes',
      },
      {
        name: 'Entretien jardin complet',
        price: 60,
        duration: 240,
        description: 'Entretien complet de votre jardin',
      },
    ],
    Bricolage: [
      {
        name: 'Montage meubles',
        price: 25,
        duration: 120,
        description: 'Montage et installation de mobilier',
      },
      {
        name: 'Petites réparations',
        price: 35,
        duration: 90,
        description: 'Réparations diverses du quotidien',
      },
      {
        name: 'Installation électrique',
        price: 50,
        duration: 180,
        description: "Installation d'équipements électriques",
      },
      {
        name: 'Peinture intérieure',
        price: 40,
        duration: 300,
        description: 'Peinture de pièces et surfaces',
      },
    ],
    Livraisons: [
      {
        name: 'Livraison express',
        price: 12,
        duration: 30,
        description: "Livraison rapide en moins d'1h",
      },
      {
        name: 'Livraison standard',
        price: 8,
        duration: 60,
        description: 'Livraison dans la journée',
      },
      {
        name: 'Livraison volumineux',
        price: 25,
        duration: 90,
        description: "Transport d'objets encombrants",
      },
      {
        name: 'Livraison fragile',
        price: 18,
        duration: 45,
        description: "Transport sécurisé d'objets fragiles",
      },
    ],
  };

  let totalServices = 0;

  // Créer des services pour chaque prestataire
  for (const provider of verifiedProviders) {
    try {
      logger.progress(
        'PROVIDER_SERVICES',
        totalServices + 1,
        verifiedProviders.length,
        `Services pour: ${provider.user.name}`
      );

      // Chaque prestataire propose 2-4 services
      const serviceCount = faker.number.int({ min: 2, max: 4 });

      for (let i = 0; i < serviceCount; i++) {
        // Sélectionner une catégorie aléatoire
        const category = getRandomElement(serviceCategories);
        const categoryName = category.name;

        // Sélectionner un modèle de service approprié
        const templates = serviceTemplates[categoryName] || serviceTemplates['Livraisons'];
        const template = getRandomElement(templates);

        const serviceData: ProviderServiceData = {
          providerId: provider.id,
          categoryId: category.id,
          name: template.name,
          description: template.description,
          price: template.price + faker.number.int({ min: -5, max: 10 }), // Variation de prix
          duration: template.duration,
          isActive: faker.datatype.boolean(0.9), // 90% des services sont actifs
        };

        const service = await prisma.service.create({
          data: {
            provider: { connect: { id: serviceData.providerId } },
            category: { connect: { id: serviceData.categoryId } },
            name: serviceData.name,
            description: serviceData.description,
            price: serviceData.price,
            duration: serviceData.duration,
            isActive: serviceData.isActive,
            createdAt: faker.date.between({
              from: new Date('2023-01-01'),
              to: new Date(),
            }),
            updatedAt: new Date(),
          },
        });

        totalServices++;
        result.created++;
      }
    } catch (error: any) {
      logger.error(
        'PROVIDER_SERVICES',
        `❌ Erreur création services pour ${provider.user.name}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des services créés
  const finalServices = await prisma.service.findMany({
    include: {
      provider: true,
      category: true,
    },
  });

  const servicesByCategory = finalServices.reduce((acc: Record<string, number>, service) => {
    const category = service.category.name;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  if (finalServices.length > 0) {
    logger.validation('PROVIDER_SERVICES', 'PASSED', `${finalServices.length} services créés`);
    logger.info(
      'PROVIDER_SERVICES',
      `📊 Services par catégorie: ${JSON.stringify(servicesByCategory)}`
    );
  } else {
    logger.validation('PROVIDER_SERVICES', 'FAILED', 'Aucun service créé');
  }

  // Statistiques des prix
  const prices = finalServices.map(s => Number(s.price));
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  logger.info(
    'PROVIDER_SERVICES',
    `💰 Prix moyen: ${avgPrice.toFixed(2)}€ (min: ${minPrice}€, max: ${maxPrice}€)`
  );

  // Services actifs vs inactifs
  const activeServices = finalServices.filter(s => s.isActive).length;
  const inactiveServices = finalServices.length - activeServices;

  logger.info(
    'PROVIDER_SERVICES',
    `📈 Services actifs: ${activeServices}, inactifs: ${inactiveServices}`
  );

  logger.endSeed('PROVIDER_SERVICES', result);
  return result;
}

/**
 * Valide l'intégrité des services de prestataires
 */
export async function validateProviderServices(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des services prestataires...');

  const services = await prisma.service.findMany({
    include: {
      provider: true,
      category: true,
    },
  });

  let isValid = true;

  // Vérifier que chaque prestataire a au moins un service
  const providers = await prisma.provider.findMany({ where: { isVerified: true } });
  const providersWithServices = new Set(services.map(s => s.providerId));

  for (const provider of providers) {
    if (!providersWithServices.has(provider.id)) {
      logger.warning('VALIDATION', `⚠️ Prestataire sans service: ${provider.id}`);
    }
  }

  // Vérifier la cohérence des prix
  const invalidPrices = services.filter(s => Number(s.price) <= 0);
  if (invalidPrices.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidPrices.length} services avec prix invalide`);
    isValid = false;
  }

  // Vérifier la durée des services
  const invalidDurations = services.filter(s => s.duration <= 0);
  if (invalidDurations.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidDurations.length} services avec durée invalide`);
    isValid = false;
  }

  logger.success('VALIDATION', `✅ Validation terminée: ${services.length} services vérifiés`);
  return isValid;
}
