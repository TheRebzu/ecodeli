import { PrismaClient, UserRole, BookingStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { defaultSeedConfig } from '../seed.config';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir une réservation de service
 */
interface ServiceBookingData {
  serviceId: string;
  clientId: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  totalPrice: number;
  notes?: string;
}

/**
 * Seed des réservations de services EcoDeli
 * Crée des réservations pour les services disponibles
 */
export async function seedServiceBookings(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('SERVICE_BOOKINGS');
  
  const result: SeedResult = {
    entity: 'ServiceBooking',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer les services actifs
  const activeServices = await prisma.service.findMany({
    where: { isActive: true },
    include: { 
      provider: true,
      category: true 
    }
  });

  if (activeServices.length === 0) {
    logger.warning('SERVICE_BOOKINGS', 'Aucun service actif trouvé - exécuter d\'abord les seeds services');
    return result;
  }

  // Récupérer les clients
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    include: { client: true }
  });

  if (clients.length === 0) {
    logger.warning('SERVICE_BOOKINGS', 'Aucun client trouvé - exécuter d\'abord les seeds clients');
    return result;
  }

  // Vérifier si des réservations existent déjà
  const existingBookings = await prisma.serviceBooking.findMany();
  
  if (existingBookings.length > 0 && !options.force) {
    logger.warning('SERVICE_BOOKINGS', `${existingBookings.length} réservations déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingBookings.length;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    const deleted = await prisma.serviceBooking.deleteMany({});
    logger.database('NETTOYAGE', 'ServiceBooking', deleted.count);
  }

  const config = defaultSeedConfig.quantities;
  const targetBookings = Math.min(config.serviceBookings || 150, activeServices.length * 3);

  let totalBookings = 0;

  // Créer des réservations
  for (let i = 0; i < targetBookings; i++) {
    try {
      logger.progress('SERVICE_BOOKINGS', i + 1, targetBookings, 
        `Création réservation ${i + 1}`);

      const service = getRandomElement(activeServices);
      const client = getRandomElement(clients);
      
      // Générer une date dans les 3 derniers mois ou les 2 prochains mois
      const startTime = faker.date.between({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 mois passés
        to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)    // 2 mois futurs
      });

      // Calculer endTime en ajoutant la durée du service
      const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);

      // Déterminer le statut en fonction de la date
      let status: BookingStatus;
      const now = new Date();
      
      if (startTime < now) {
        // Réservation passée : 80% completed, 15% cancelled, 5% autres
        const rand = Math.random();
        if (rand < 0.8) status = BookingStatus.COMPLETED;
        else if (rand < 0.95) status = BookingStatus.CANCELLED;
        else status = BookingStatus.CONFIRMED;
      } else {
        // Réservation future : 70% confirmed, 20% pending, 10% cancelled
        const rand = Math.random();
        if (rand < 0.7) status = BookingStatus.CONFIRMED;
        else if (rand < 0.9) status = BookingStatus.PENDING;
        else status = BookingStatus.CANCELLED;
      }

      const bookingData: ServiceBookingData = {
        serviceId: service.id,
        clientId: client.id,
        providerId: service.providerId,
        startTime,
        endTime,
        status,
        totalPrice: Number(service.price),
        notes: faker.datatype.boolean(0.3) ? 
          faker.lorem.sentence() : undefined
      };

      const booking = await prisma.serviceBooking.create({
        data: {
          service: { connect: { id: bookingData.serviceId } },
          client: { connect: { id: bookingData.clientId } },
          provider: { connect: { id: bookingData.providerId } },
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          status: bookingData.status,
          totalPrice: bookingData.totalPrice,
          notes: bookingData.notes,
          createdAt: faker.date.between({ 
            from: new Date('2023-01-01'), 
            to: startTime 
          }),
          updatedAt: new Date()
        }
      });

      totalBookings++;
      result.created++;

    } catch (error: any) {
      logger.error('SERVICE_BOOKINGS', `❌ Erreur création réservation: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des réservations créées
  const finalBookings = await prisma.serviceBooking.findMany({
    include: { 
      service: { include: { category: true } },
      client: true 
    }
  });
  
  const bookingsByStatus = finalBookings.reduce((acc: Record<string, number>, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {});

  const bookingsByCategory = finalBookings.reduce((acc: Record<string, number>, booking) => {
    const category = booking.service.category.name;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  if (finalBookings.length > 0) {
    logger.validation('SERVICE_BOOKINGS', 'PASSED', `${finalBookings.length} réservations créées`);
    logger.info('SERVICE_BOOKINGS', `📊 Réservations par statut: ${JSON.stringify(bookingsByStatus)}`);
    logger.info('SERVICE_BOOKINGS', `📋 Réservations par catégorie: ${JSON.stringify(bookingsByCategory)}`);
  } else {
    logger.validation('SERVICE_BOOKINGS', 'FAILED', 'Aucune réservation créée');
  }

  // Statistiques financières
  const totalRevenue = finalBookings
    .filter(b => b.status === BookingStatus.COMPLETED)
    .reduce((sum, b) => sum + Number(b.totalPrice), 0);

  const completedBookings = finalBookings.filter(b => b.status === BookingStatus.COMPLETED).length;
  const pendingBookings = finalBookings.filter(b => b.status === BookingStatus.PENDING).length;
  const cancelledBookings = finalBookings.filter(b => b.status === BookingStatus.CANCELLED).length;

  logger.info('SERVICE_BOOKINGS', `💰 Chiffre d'affaires réalisé: ${totalRevenue.toFixed(2)}€`);
  logger.info('SERVICE_BOOKINGS', `📈 Taux de conversion: ${((completedBookings / finalBookings.length) * 100).toFixed(1)}%`);
  logger.info('SERVICE_BOOKINGS', `⏳ En attente: ${pendingBookings}, Annulées: ${cancelledBookings}`);

  // Réservations cette semaine
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

  const thisWeekBookings = finalBookings.filter(b => 
    b.startTime >= thisWeekStart && b.startTime <= thisWeekEnd
  ).length;

  logger.info('SERVICE_BOOKINGS', `📅 Réservations cette semaine: ${thisWeekBookings}`);

  logger.endSeed('SERVICE_BOOKINGS', result);
  return result;
}

/**
 * Valide l'intégrité des réservations de services
 */
export async function validateServiceBookings(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des réservations de services...');
  
  const bookings = await prisma.serviceBooking.findMany({
    include: { 
      service: true,
      client: true 
    }
  });
  
  let isValid = true;

  // Vérifier que toutes les réservations ont un service et un client valides
  const invalidBookings = bookings.filter(b => !b.service || !b.client);
  if (invalidBookings.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidBookings.length} réservations avec relations invalides`);
    isValid = false;
  }

  // Vérifier la cohérence des montants
  const invalidAmounts = bookings.filter(b => Number(b.totalPrice) <= 0);
  if (invalidAmounts.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidAmounts.length} réservations avec montant invalide`);
    isValid = false;
  }

  // Vérifier les dates
  const invalidDates = bookings.filter(b => b.startTime >= b.endTime);
  if (invalidDates.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidDates.length} réservations avec dates invalides`);
    isValid = false;
  }

  // Statistiques générales
  logger.success('VALIDATION', `✅ Validation terminée: ${bookings.length} réservations vérifiées`);
  
  const statusCounts = bookings.reduce((acc: Record<string, number>, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {});
  
  logger.info('VALIDATION', `📊 Distribution par statut: ${JSON.stringify(statusCounts)}`);

  return isValid;
} 