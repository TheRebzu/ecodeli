import { PrismaClient } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions } from '../utils/seed-helpers';

/**
 * Seed des catégories de services EcoDeli
 */
export async function seedServiceCategories(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('SERVICE_CATEGORIES');

  const result: SeedResult = {
    entity: 'service_categories',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Définition des catégories de services EcoDeli
  const serviceCategories = [
    {
      name: 'Réparation électroménager',
      description: "Réparation et maintenance d'appareils électroménagers",
      icon: 'wrench',
      color: '#3B82F6',
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Jardinage et espaces verts',
      description: "Entretien d'espaces verts, jardins et balcons",
      icon: 'flower',
      color: '#10B981',
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Plomberie et sanitaire',
      description: 'Interventions de plomberie et sanitaire',
      icon: 'droplet',
      color: '#06B6D4',
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'Électricité et éclairage',
      description: "Travaux électriques et installations d'éclairage",
      icon: 'zap',
      color: '#F59E0B',
      isActive: true,
      sortOrder: 4,
    },
    {
      name: 'Ménage et nettoyage',
      description: 'Services de ménage et nettoyage à domicile',
      icon: 'home',
      color: '#8B5CF6',
      isActive: true,
      sortOrder: 5,
    },
    {
      name: 'Peinture et décoration',
      description: 'Travaux de peinture et décoration intérieure',
      icon: 'paintbrush',
      color: '#EF4444',
      isActive: true,
      sortOrder: 6,
    },
    {
      name: 'Informatique et technologie',
      description: 'Dépannage informatique et assistance technologique',
      icon: 'monitor',
      color: '#6366F1',
      isActive: true,
      sortOrder: 7,
    },
    {
      name: 'Cours et formation',
      description: 'Cours particuliers et formations diverses',
      icon: 'graduation-cap',
      color: '#84CC16',
      isActive: true,
      sortOrder: 8,
    },
    {
      name: 'Bien-être et santé',
      description: 'Services de bien-être et soins à domicile',
      icon: 'heart',
      color: '#EC4899',
      isActive: true,
      sortOrder: 9,
    },
    {
      name: 'Transport et livraison',
      description: 'Services de transport et livraison spécialisés',
      icon: 'truck',
      color: '#F97316',
      isActive: true,
      sortOrder: 10,
    },
    {
      name: "Garde d'animaux",
      description: "Garde et promenade d'animaux de compagnie",
      icon: 'dog',
      color: '#14B8A6',
      isActive: true,
      sortOrder: 11,
    },
    {
      name: 'Aide administrative',
      description: 'Assistance pour démarches administratives',
      icon: 'file-text',
      color: '#64748B',
      isActive: true,
      sortOrder: 12,
    },
  ];

  // Créer les catégories de services
  for (const categoryData of serviceCategories) {
    try {
      // Vérifier si la catégorie existe déjà
      const existing = await prisma.serviceCategory.findFirst({
        where: { name: categoryData.name },
      });

      if (existing && !options.force) {
        logger.warning('SERVICE_CATEGORIES', `Catégorie ${categoryData.name} déjà existante`);
        result.skipped++;
        continue;
      }

      // Supprimer l'existante si force activé
      if (existing && options.force) {
        await prisma.serviceCategory.delete({
          where: { id: existing.id },
        });
      }

      const category = await prisma.serviceCategory.create({
        data: {
          name: categoryData.name,
          description: categoryData.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.success('SERVICE_CATEGORIES', `✅ Catégorie créée: ${categoryData.name}`);
      result.created++;
    } catch (error: any) {
      logger.error(
        'SERVICE_CATEGORIES',
        `❌ Erreur création catégorie ${categoryData.name}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des catégories créées
  const finalCategories = await prisma.serviceCategory.findMany();
  if (finalCategories.length >= serviceCategories.length) {
    logger.validation(
      'SERVICE_CATEGORIES',
      'PASSED',
      `${finalCategories.length} catégories créées`
    );
  } else {
    logger.validation(
      'SERVICE_CATEGORIES',
      'FAILED',
      `Attendu: ${serviceCategories.length}, Créé: ${finalCategories.length}`
    );
  }

  logger.endSeed('SERVICE_CATEGORIES', result);
  return result;
}

/**
 * Vérifie l'intégrité des catégories de services
 */
export async function validateServiceCategories(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des catégories de services...');

  const categories = await prisma.serviceCategory.findMany();
  let isValid = true;

  // Vérifier les catégories essentielles
  const essentialCategories = [
    'Réparation électroménager',
    'Jardinage et espaces verts',
    'Plomberie et sanitaire',
    'Électricité et éclairage',
    'Ménage et nettoyage',
  ];

  for (const name of essentialCategories) {
    const category = categories.find(c => c.name === name);
    if (!category) {
      logger.error('VALIDATION', `❌ Catégorie essentielle manquante: ${name}`);
      isValid = false;
    } else {
      logger.success('VALIDATION', `✅ Catégorie essentielle valide: ${name}`);
    }
  }

  logger.success('VALIDATION', `✅ Total: ${categories.length} catégories de services`);

  return isValid;
}
