import { PrismaClient, BookingStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomDate } from '../utils/seed-helpers';

/**
 * Seed des réservations de services EcoDeli
 * Crée les services de Pierre Martin et leurs réservations
 */
export async function seedServiceBookings(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('SERVICE_BOOKINGS');

  const result: SeedResult = {
    entity: 'service_bookings',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer Pierre Martin
  const pierreMartin = await prisma.user.findUnique({
    where: { email: 'pierre.martin@transportservices.fr' },
    include: { provider: true },
  });

  if (!pierreMartin || !pierreMartin.provider) {
    logger.warning(
      'SERVICE_BOOKINGS',
      "Pierre Martin (provider) non trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Récupérer quelques clients pour les réservations
  const clients = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      status: 'ACTIVE',
    },
    take: 3,
  });

  if (clients.length === 0) {
    logger.warning(
      'SERVICE_BOOKINGS',
      "Aucun client trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Vérifier si des services existent déjà
  const existingServices = await prisma.service.count({
    where: { providerId: pierreMartin.id },
  });

  if (existingServices > 0 && !options.force) {
    logger.warning(
      'SERVICE_BOOKINGS',
      `${existingServices} services de Pierre déjà présents - utiliser force:true pour recréer`
    );
    result.skipped = existingServices;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.serviceBooking.deleteMany({
      where: { providerId: pierreMartin.id },
    });
    await prisma.service.deleteMany({
      where: { providerId: pierreMartin.id },
    });
    logger.database('NETTOYAGE', 'services et réservations Pierre Martin', 0);
  }

  try {
    // 1. CRÉER OU RÉCUPÉRER LES CATÉGORIES DE SERVICE
    let transportCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Transport' },
    });

    if (!transportCategory) {
      transportCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Transport',
          description: 'Services de transport et accompagnement',
        },
      });
    }

    let shoppingCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Courses' },
    });

    if (!shoppingCategory) {
      shoppingCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Courses',
          description: 'Services de courses et achats',
        },
      });
    }

    // 2. CRÉER LES SERVICES DE PIERRE MARTIN
    logger.progress('SERVICE_BOOKINGS', 1, 5, 'Création service transport personne âgée');

    const transportService = await prisma.service.create({
      data: {
        name: 'Transport personne âgée',
        description:
          'Service de transport adapté pour personnes âgées ou à mobilité réduite. Véhicule confortable, aide à la montée/descente, accompagnement bienveillant.',
        price: 50.0,
        duration: 120, // 2 heures
        categoryId: transportCategory.id,
        providerId: pierreMartin.id,
        isActive: true,
      },
    });

    result.created++;

    logger.progress('SERVICE_BOOKINGS', 2, 5, 'Création service courses et achats');

    const shoppingService = await prisma.service.create({
      data: {
        name: 'Courses et achats',
        description:
          'Service de courses à domicile : pharmacie, alimentation, petites commissions. Idéal pour personnes âgées ou occupées.',
        price: 25.0,
        duration: 60, // 1 heure
        categoryId: shoppingCategory.id,
        providerId: pierreMartin.id,
        isActive: true,
      },
    });

    result.created++;

    logger.success('SERVICE_BOOKINGS', '✅ 2 services Pierre Martin créés');

    // 3. CRÉER LES RÉSERVATIONS
    // Réservation 1: Transport dans 2 jours
    logger.progress('SERVICE_BOOKINGS', 3, 5, 'Création réservation transport');

    const startTime1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Dans 2 jours
    startTime1.setHours(14, 0, 0, 0); // 14h00
    const endTime1 = new Date(startTime1.getTime() + 2 * 60 * 60 * 1000); // +2h

    await prisma.serviceBooking.create({
      data: {
        serviceId: transportService.id,
        clientId: clients[0].id,
        providerId: pierreMartin.id,
        startTime: startTime1,
        endTime: endTime1,
        status: BookingStatus.CONFIRMED,
        totalPrice: 50.0,
        notes: "Rendez-vous médical à l'hôpital Saint-Louis, aide pour marcher nécessaire",
        createdAt: getRandomDate(3, 1), // Réservée récemment
      },
    });

    result.created++;

    // Réservation 2: Courses dans 4 jours
    logger.progress('SERVICE_BOOKINGS', 4, 5, 'Création réservation courses');

    const startTime2 = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // Dans 4 jours
    startTime2.setHours(10, 0, 0, 0); // 10h00
    const endTime2 = new Date(startTime2.getTime() + 1 * 60 * 60 * 1000); // +1h

    await prisma.serviceBooking.create({
      data: {
        serviceId: shoppingService.id,
        clientId: clients[1].id,
        providerId: pierreMartin.id,
        startTime: startTime2,
        endTime: endTime2,
        status: BookingStatus.CONFIRMED,
        totalPrice: 25.0,
        notes: 'Courses hebdomadaires + pharmacie, liste envoyée par message',
        createdAt: getRandomDate(3, 1), // Réservée récemment
      },
    });

    result.created++;

    // Réservation 3: Transport historique (terminé)
    if (clients.length >= 3) {
      logger.progress('SERVICE_BOOKINGS', 5, 5, 'Création réservation historique');

      const pastDate = getRandomDate(7, 2); // Il y a 2-7 jours
      const startTime3 = new Date(pastDate);
      startTime3.setHours(15, 30, 0, 0);
      const endTime3 = new Date(startTime3.getTime() + 2 * 60 * 60 * 1000);

      await prisma.serviceBooking.create({
        data: {
          serviceId: transportService.id,
          clientId: clients[2].id,
          providerId: pierreMartin.id,
          startTime: startTime3,
          endTime: endTime3,
          status: BookingStatus.COMPLETED,
          totalPrice: 50.0,
          notes: 'Transport pour kinésithérapeute, très satisfait du service',
          createdAt: getRandomDate(10, 7), // Réservée il y a 7-10 jours
        },
      });

      result.created++;
    }

    logger.success('SERVICE_BOOKINGS', '✅ Réservations créées');
  } catch (error: any) {
    logger.error('SERVICE_BOOKINGS', `❌ Erreur création services/réservations: ${error.message}`);
    result.errors++;
  }

  // Validation des services et réservations créés
  const finalServices = await prisma.service.findMany({
    where: { providerId: pierreMartin.id },
    include: {
      bookings: true,
      category: true,
    },
  });

  const totalBookings = finalServices.reduce((sum, service) => sum + service.bookings.length, 0);

  if (finalServices.length >= 2 && totalBookings >= 3) {
    logger.validation(
      'SERVICE_BOOKINGS',
      'PASSED',
      `${finalServices.length} services et ${totalBookings} réservations créés`
    );
  } else {
    logger.validation(
      'SERVICE_BOOKINGS',
      'FAILED',
      `Attendu: 2 services + 3 réservations, Créé: ${finalServices.length} services + ${totalBookings} réservations`
    );
  }

  // Statistiques par service
  finalServices.forEach(service => {
    logger.info(
      'SERVICE_BOOKINGS',
      `📋 ${service.name}: ${service.price}€, ${service.bookings.length} réservations`
    );
  });

  // Statistiques par statut de réservation
  const allBookings = await prisma.serviceBooking.findMany({
    where: { providerId: pierreMartin.id },
  });

  const byStatus = allBookings.reduce((acc: Record<string, number>, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('SERVICE_BOOKINGS', `📊 Réservations par statut: ${JSON.stringify(byStatus)}`);

  // Chiffre d'affaires
  const totalRevenue = allBookings
    .filter(b => b.status === BookingStatus.COMPLETED)
    .reduce((sum, booking) => sum + parseFloat(booking.totalPrice.toString()), 0);

  const pendingRevenue = allBookings
    .filter(b => b.status === BookingStatus.CONFIRMED)
    .reduce((sum, booking) => sum + parseFloat(booking.totalPrice.toString()), 0);

  logger.info(
    'SERVICE_BOOKINGS',
    `💰 CA réalisé: ${totalRevenue}€, En attente: ${pendingRevenue}€`
  );

  logger.endSeed('SERVICE_BOOKINGS', result);
  return result;
}

/**
 * Valide l'intégrité des services et réservations
 */
export async function validateServiceBookings(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des services et réservations...');

  let isValid = true;

  // Vérifier les services de Pierre
  const pierreMartin = await prisma.user.findUnique({
    where: { email: 'pierre.martin@transportservices.fr' },
  });

  if (!pierreMartin) {
    logger.error('VALIDATION', '❌ Pierre Martin non trouvé');
    return false;
  }

  const services = await prisma.service.findMany({
    where: { providerId: pierreMartin.id },
    include: {
      bookings: true,
      category: true,
    },
  });

  if (services.length === 0) {
    logger.error('VALIDATION', '❌ Aucun service Pierre Martin trouvé');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${services.length} services Pierre Martin trouvés`);
  }

  // Vérifier que les services ont les bonnes catégories
  const transportService = services.find(s => s.category.name === 'Transport');
  const shoppingService = services.find(s => s.category.name === 'Courses');

  if (transportService && shoppingService) {
    logger.success('VALIDATION', '✅ Services transport et courses trouvés');
  } else {
    logger.warning('VALIDATION', '⚠️ Services transport ou courses manquants');
  }

  // Vérifier les réservations
  const allBookings = services.reduce(
    (bookings, service) => [...bookings, ...service.bookings],
    [] as any[]
  );

  if (allBookings.length >= 3) {
    logger.success('VALIDATION', `✅ ${allBookings.length} réservations trouvées`);
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ Seulement ${allBookings.length} réservations trouvées (attendu: 3+)`
    );
  }

  // Vérifier qu'il y a des réservations confirmées pour cette semaine
  const upcomingBookings = allBookings.filter(
    b => b.status === BookingStatus.CONFIRMED && b.startTime > new Date()
  );

  if (upcomingBookings.length >= 2) {
    logger.success('VALIDATION', `✅ ${upcomingBookings.length} réservations confirmées à venir`);
  } else {
    logger.warning('VALIDATION', `⚠️ ${upcomingBookings.length} réservations à venir (attendu: 2)`);
  }

  // Vérifier la cohérence des prix
  const invalidPrices = services.filter(s => parseFloat(s.price.toString()) <= 0);

  if (invalidPrices.length === 0) {
    logger.success('VALIDATION', '✅ Tous les prix sont valides');
  } else {
    logger.warning('VALIDATION', `⚠️ ${invalidPrices.length} services avec prix invalides`);
  }

  logger.success('VALIDATION', '✅ Validation des services et réservations terminée');
  return isValid;
}
