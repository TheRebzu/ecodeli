import { PrismaClient } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions } from '../utils/seed-helpers';

/**
 * Seed robuste pour forcer la création des services prestataires
 * Marque d'abord des prestataires comme vérifiés puis crée les services
 */
export async function seedFixProviderServices(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  try {
    logger.info('SEED', '🚀 Démarrage du seed: FIX_PROVIDER_SERVICES');

    let totalCreated = 0;
    let totalErrors = 0;

    // 1. Vérifier et corriger les prestataires vérifiés
    const providerCount = await prisma.provider.count();
    logger.info('FIX_PROVIDER_SERVICES', `📊 Total prestataires: ${providerCount}`);

    if (providerCount === 0) {
      logger.error(
        'FIX_PROVIDER_SERVICES',
        "❌ Aucun prestataire trouvé - exécuter d'abord fix-users.ts"
      );
      return { entity: 'fix_provider_services', created: 0, skipped: 0, errors: 1 };
    }

    // 2. Marquer 70% des prestataires comme vérifiés
    const verifiedUpdateCount = Math.ceil(providerCount * 0.7);

    const providersToVerify = await prisma.provider.findMany({
      take: verifiedUpdateCount,
      orderBy: { createdAt: 'asc' },
    });

    for (const provider of providersToVerify) {
      try {
        await prisma.provider.update({
          where: { id: provider.id },
          data: { isVerified: true },
        });
        logger.info('FIX_PROVIDER_SERVICES', `✅ Prestataire vérifié: ${provider.id}`);
      } catch (error: any) {
        totalErrors++;
        logger.error(
          'FIX_PROVIDER_SERVICES',
          `❌ Erreur vérification ${provider.id}: ${error.message}`
        );
      }
    }

    // 3. Vérifier le nombre de prestataires vérifiés
    const verifiedProviders = await prisma.provider.findMany({
      where: { isVerified: true },
      include: { user: true },
    });

    logger.info('FIX_PROVIDER_SERVICES', `📊 Prestataires vérifiés: ${verifiedProviders.length}`);

    if (verifiedProviders.length === 0) {
      logger.error(
        'FIX_PROVIDER_SERVICES',
        '❌ Aucun prestataire vérifié trouvé après mise à jour'
      );
      return { entity: 'fix_provider_services', created: 0, skipped: 0, errors: 1 };
    }

    // 4. Récupérer les catégories de services
    const serviceCategories = await prisma.serviceCategory.findMany();
    logger.info('FIX_PROVIDER_SERVICES', `📊 Catégories disponibles: ${serviceCategories.length}`);

    if (serviceCategories.length === 0) {
      logger.error('FIX_PROVIDER_SERVICES', '❌ Aucune catégorie de service trouvée');
      return { entity: 'fix_provider_services', created: 0, skipped: 0, errors: 1 };
    }

    // 5. Créer des services pour chaque prestataire vérifié
    const serviceNames = [
      'Réparation plomberie',
      'Installation électrique',
      'Ménage complet',
      'Jardinage et entretien',
      'Bricolage et réparation',
      'Support informatique',
      'Nettoyage bureaux',
      'Jardinage particuliers',
      'Dépannage plomberie',
      'Électricité domestique',
      'Nettoyage après travaux',
      'Entretien jardin',
    ];

    for (const provider of verifiedProviders) {
      // Créer 2-4 services par prestataire
      const servicesCount = Math.floor(Math.random() * 3) + 2; // 2-4 services

      for (let i = 0; i < servicesCount; i++) {
        try {
          const randomCategory =
            serviceCategories[Math.floor(Math.random() * serviceCategories.length)];
          const randomServiceName = serviceNames[Math.floor(Math.random() * serviceNames.length)];

          const service = await prisma.service.create({
            data: {
              providerId: provider.userId, // Utiliser userId du provider
              categoryId: randomCategory.id,
              name: `${randomServiceName} - ${provider.user.name}`,
              description: `Service professionnel de ${randomServiceName.toLowerCase()} proposé par ${provider.user.name}. Expérience confirmée et qualité garantie. Service de qualité avec matériel professionnel.`,
              price: parseFloat((25 + Math.random() * 75).toFixed(2)), // 25-100€
              duration: Math.floor(Math.random() * 180) + 60, // 60-240 minutes
              isActive: Math.random() > 0.1, // 90% actifs
              isOnline: Math.random() > 0.7, // 30% en ligne
              isAtHome: Math.random() > 0.4, // 60% à domicile
              isAtShop: Math.random() > 0.5, // 50% en atelier
              maxParticipants: Math.random() > 0.7 ? Math.floor(Math.random() * 8) + 1 : null, // Parfois groupe
              preparationTime: Math.floor(Math.random() * 60) + 15, // 15-75 minutes
              tags: [
                randomServiceName.toLowerCase().split(' ')[0],
                'professionnel',
                'qualité',
                'rapide',
              ],
              images: [], // Images vides pour l'instant
              requirements: `Matériel fourni pour ${randomServiceName.toLowerCase()}. Espace de travail requis.`,
              cancellationPolicy: "Annulation gratuite jusqu'à 24h avant le rendez-vous.",
            },
          });

          totalCreated++;
          logger.info('FIX_PROVIDER_SERVICES', `✅ Service créé: ${service.name}`);
        } catch (error: any) {
          totalErrors++;
          logger.error(
            'FIX_PROVIDER_SERVICES',
            `❌ Erreur service ${provider.id}: ${error.message}`
          );
        }
      }
    }

    // 6. Statistiques finales
    const finalServiceCount = await prisma.service.count();
    const activeServiceCount = await prisma.service.count({ where: { isActive: true } });

    logger.info(
      'FIX_PROVIDER_SERVICES',
      `📊 Services créés: ${finalServiceCount} (${activeServiceCount} actifs)`
    );
    logger.success(
      'FIX_PROVIDER_SERVICES',
      `✅ Total créé: ${totalCreated}, Erreurs: ${totalErrors}`
    );

    return {
      entity: 'fix_provider_services',
      created: totalCreated,
      skipped: 0,
      errors: totalErrors,
    };
  } catch (error: any) {
    logger.error(
      'FIX_PROVIDER_SERVICES',
      `❌ Erreur dans seedFixProviderServices: ${error.message}`
    );
    throw error;
  }
}
