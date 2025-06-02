import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomDate } from '../utils/seed-helpers';

/**
 * Seed des candidatures de livraison EcoDeli
 */
export async function seedDeliveryApplications(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('DELIVERY_APPLICATIONS');
  
  const result: SeedResult = {
    entity: 'delivery_applications',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer les utilisateurs clés
  const jeanDupont = await prisma.user.findUnique({
    where: { email: 'jean.dupont@orange.fr' }
  });

  const marieLaurent = await prisma.user.findUnique({
    where: { email: 'marie.laurent@orange.fr' },
    include: { deliverer: true }
  });

  if (!jeanDupont || !marieLaurent) {
    logger.warning('DELIVERY_APPLICATIONS', 'Utilisateurs Jean Dupont ou Marie Laurent non trouvés');
    return result;
  }

  // Récupérer l'annonce de Jean Dupont
  const jeanAnnouncement = await prisma.announcement.findFirst({
    where: {
      clientId: jeanDupont.id,
      title: { contains: 'Livraison urgente d\'un ordinateur portable vers Marseille' }
    }
  });

  if (!jeanAnnouncement) {
    logger.warning('DELIVERY_APPLICATIONS', 'Annonce de Jean Dupont non trouvée - exécuter d\'abord les seeds d\'annonces');
    return result;
  }

  // Vérifier si des candidatures existent déjà
  const existingApplications = await prisma.deliveryApplication.count();
  
  if (existingApplications > 0 && !options.force) {
    logger.warning('DELIVERY_APPLICATIONS', `${existingApplications} candidatures déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingApplications;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.deliveryApplication.deleteMany({});
    logger.database('NETTOYAGE', 'delivery applications', 0);
  }

  try {
    logger.progress('DELIVERY_APPLICATIONS', 1, 1, 'Création candidature Marie Laurent');

    // Créer la candidature de Marie Laurent sur l'annonce de Jean Dupont
    await prisma.deliveryApplication.create({
      data: {
        // Lien avec l'annonce et le livreur
        announcementId: jeanAnnouncement.id,
        delivererId: marieLaurent.id,
        
        // Détails de la candidature
        proposedPrice: 45.00,
        status: ApplicationStatus.ACCEPTED,
        
        // Message de candidature
        message: 'Bonjour, je suis Marie Laurent, livreuse expérimentée avec plus de 850 livraisons réussies. Je connais parfaitement l\'axe Paris-Marseille que je fais régulièrement. Mon véhicule Peugeot 208 est parfaitement adapté pour transporter votre ordinateur portable en sécurité. Je peux assurer la livraison dans les délais demandés avec un taux de ponctualité de 95%. Je propose le tarif de 45€ comme indiqué.',
        
        // Métadonnées
        createdAt: getRandomDate(3, 5),
        updatedAt: getRandomDate(1, 2)
      }
    });

    result.created++;
    logger.success('DELIVERY_APPLICATIONS', '✅ Candidature Marie Laurent créée et acceptée');

  } catch (error: any) {
    logger.error('DELIVERY_APPLICATIONS', `❌ Erreur création candidature: ${error.message}`);
    result.errors++;
  }

  // Validation des candidatures créées
  const finalApplications = await prisma.deliveryApplication.findMany({
    include: { 
      announcement: { include: { client: true } },
      deliverer: true
    }
  });
  
  if (finalApplications.length >= result.created) {
    logger.validation('DELIVERY_APPLICATIONS', 'PASSED', `${finalApplications.length} candidature(s) créée(s) avec succès`);
  } else {
    logger.validation('DELIVERY_APPLICATIONS', 'FAILED', `Attendu: ${result.created}, Créé: ${finalApplications.length}`);
  }

  // Statistiques
  const acceptedApplications = finalApplications.filter(app => app.status === ApplicationStatus.ACCEPTED);
  logger.info('DELIVERY_APPLICATIONS', `📊 Candidatures acceptées: ${acceptedApplications.length}/${finalApplications.length}`);

  logger.endSeed('DELIVERY_APPLICATIONS', result);
  return result;
}

/**
 * Valide l'intégrité des candidatures de livraison
 */
export async function validateDeliveryApplications(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des candidatures de livraison...');
  
  const applications = await prisma.deliveryApplication.findMany({
    include: { 
      announcement: true,
      deliverer: true
    }
  });

  let isValid = true;

  // Vérifier que toutes les candidatures ont une annonce et un livreur valides
  const incompleteApplications = applications.filter(app => 
    !app.announcement || !app.deliverer
  );
  
  if (incompleteApplications.length > 0) {
    logger.error('VALIDATION', `❌ ${incompleteApplications.length} candidatures avec données manquantes`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Toutes les candidatures ont des données complètes');
  }

  // Vérifier la cohérence des prix proposés
  const applicationsWithInvalidPrice = applications.filter(app => 
    !app.proposedPrice || app.proposedPrice <= 0
  );
  
  if (applicationsWithInvalidPrice.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${applicationsWithInvalidPrice.length} candidatures avec prix invalide`);
  } else {
    logger.success('VALIDATION', '✅ Tous les prix proposés sont valides');
  }

  // Vérifier les dates de candidature
  const applicationsWithInvalidDates = applications.filter(app => 
    app.rejectedAt && app.createdAt && app.rejectedAt < app.createdAt
  );
  
  if (applicationsWithInvalidDates.length > 0) {
    logger.error('VALIDATION', `❌ ${applicationsWithInvalidDates.length} candidatures avec dates incohérentes`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Toutes les dates de candidature sont cohérentes');
  }

  return isValid;
} 