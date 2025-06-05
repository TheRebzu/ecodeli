import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un créneau de disponibilité
 */
interface AvailabilitySlot {
  startTime: string; // Format HH:MM
  endTime: string; // Format HH:MM
  dayOfWeek: number; // 0 = dimanche, 1 = lundi, etc.
}

/**
 * Seed des disponibilités des prestataires EcoDeli
 * Crée les calendriers et créneaux de disponibilité sur 3 mois
 */
export async function seedProviderAvailability(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PROVIDER_AVAILABILITY');

  const result: SeedResult = {
    entity: 'provider_availability',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer les prestataires
  const providers = await prisma.user.findMany({
    where: {
      role: UserRole.PROVIDER,
      status: 'ACTIVE',
    },
    include: { provider: true },
  });

  if (providers.length === 0) {
    logger.warning(
      'PROVIDER_AVAILABILITY',
      "Aucun prestataire trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Vérifier si des disponibilités existent déjà
  const existingAvailabilities = await prisma.providerAvailability.count();

  if (existingAvailabilities > 0 && !options.force) {
    logger.warning(
      'PROVIDER_AVAILABILITY',
      `${existingAvailabilities} disponibilités déjà présentes - utiliser force:true pour recréer`
    );
    result.skipped = existingAvailabilities;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.providerAvailability.deleteMany({});
    logger.database('NETTOYAGE', 'disponibilités', 0);
  }

  // Profils de disponibilité types
  const AVAILABILITY_PROFILES = {
    FULL_TIME: {
      name: 'Temps plein',
      weekDays: [
        {
          day: 1,
          slots: [
            { start: '08:00', end: '12:00' },
            { start: '14:00', end: '18:00' },
          ],
        }, // Lundi
        {
          day: 2,
          slots: [
            { start: '08:00', end: '12:00' },
            { start: '14:00', end: '18:00' },
          ],
        }, // Mardi
        {
          day: 3,
          slots: [
            { start: '08:00', end: '12:00' },
            { start: '14:00', end: '18:00' },
          ],
        }, // Mercredi
        {
          day: 4,
          slots: [
            { start: '08:00', end: '12:00' },
            { start: '14:00', end: '18:00' },
          ],
        }, // Jeudi
        {
          day: 5,
          slots: [
            { start: '08:00', end: '12:00' },
            { start: '14:00', end: '18:00' },
          ],
        }, // Vendredi
        { day: 6, slots: [{ start: '09:00', end: '12:00' }] }, // Samedi matin
      ],
    },
    PART_TIME: {
      name: 'Temps partiel',
      weekDays: [
        { day: 1, slots: [{ start: '14:00', end: '18:00' }] }, // Lundi après-midi
        { day: 3, slots: [{ start: '14:00', end: '18:00' }] }, // Mercredi après-midi
        { day: 5, slots: [{ start: '14:00', end: '18:00' }] }, // Vendredi après-midi
        {
          day: 6,
          slots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '17:00' },
          ],
        }, // Samedi
      ],
    },
    FLEXIBLE: {
      name: 'Flexible',
      weekDays: [
        { day: 1, slots: [{ start: '10:00', end: '16:00' }] },
        { day: 2, slots: [{ start: '09:00', end: '15:00' }] },
        { day: 4, slots: [{ start: '11:00', end: '17:00' }] },
        { day: 5, slots: [{ start: '10:00', end: '16:00' }] },
        { day: 6, slots: [{ start: '10:00', end: '14:00' }] },
        { day: 0, slots: [{ start: '14:00', end: '18:00' }] }, // Dimanche après-midi
      ],
    },
    EVENING: {
      name: 'Soirées et weekends',
      weekDays: [
        { day: 1, slots: [{ start: '18:00', end: '21:00' }] },
        { day: 2, slots: [{ start: '18:00', end: '21:00' }] },
        { day: 3, slots: [{ start: '18:00', end: '21:00' }] },
        { day: 4, slots: [{ start: '18:00', end: '21:00' }] },
        { day: 5, slots: [{ start: '18:00', end: '21:00' }] },
        { day: 6, slots: [{ start: '09:00', end: '18:00' }] },
        { day: 0, slots: [{ start: '10:00', end: '18:00' }] },
      ],
    },
  };

  let totalAvailabilities = 0;

  // Créer les disponibilités pour chaque prestataire
  for (const provider of providers) {
    try {
      logger.progress(
        'PROVIDER_AVAILABILITY',
        totalAvailabilities + 1,
        providers.length,
        `Création disponibilités: ${provider.name}`
      );

      // Sélectionner un profil de disponibilité
      const profileNames = Object.keys(AVAILABILITY_PROFILES);
      const selectedProfile =
        AVAILABILITY_PROFILES[getRandomElement(profileNames) as keyof typeof AVAILABILITY_PROFILES];

      // Créer les disponibilités récurrentes pour les créneaux
      for (const dayConfig of selectedProfile.weekDays) {
        for (const slot of dayConfig.slots) {
          try {
            // Convertir les heures en objets Date pour Prisma
            const startDate = new Date();
            const [startHours, startMinutes] = slot.start.split(':').map(Number);
            startDate.setHours(startHours, startMinutes, 0, 0);

            const endDate = new Date();
            const [endHours, endMinutes] = slot.end.split(':').map(Number);
            endDate.setHours(endHours, endMinutes, 0, 0);

            const availability = await prisma.providerAvailability.create({
              data: {
                providerId: provider.id,
                dayOfWeek: dayConfig.day,
                startTime: startDate,
                endTime: endDate,
              },
            });

            totalAvailabilities++;
            result.created++;
          } catch (error: any) {
            logger.error(
              'PROVIDER_AVAILABILITY',
              `❌ Erreur création disponibilité ${slot.start}-${slot.end}: ${error.message}`
            );
            result.errors++;
          }
        }
      }
    } catch (error: any) {
      logger.error(
        'PROVIDER_AVAILABILITY',
        `❌ Erreur traitement prestataire ${provider.name}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des disponibilités créées
  const finalAvailabilities = await prisma.providerAvailability.findMany({
    include: {
      provider: true,
    },
  });

  if (finalAvailabilities.length >= totalAvailabilities - result.errors) {
    logger.validation(
      'PROVIDER_AVAILABILITY',
      'PASSED',
      `${finalAvailabilities.length} disponibilités créées avec succès`
    );
  } else {
    logger.validation(
      'PROVIDER_AVAILABILITY',
      'FAILED',
      `Attendu: ${totalAvailabilities}, Créé: ${finalAvailabilities.length}`
    );
  }

  // Statistiques par prestataire
  const availabilityByProvider = finalAvailabilities.reduce(
    (acc: Record<string, number>, availability) => {
      const providerName = availability.provider.name.split(' ')[0];
      acc[providerName] = (acc[providerName] || 0) + 1;
      return acc;
    },
    {}
  );

  const avgAvailabilityPerProvider =
    Object.values(availabilityByProvider).reduce((sum, count) => sum + count, 0) /
    Object.keys(availabilityByProvider).length;
  logger.info(
    'PROVIDER_AVAILABILITY',
    `📅 Moyenne créneaux/prestataire: ${avgAvailabilityPerProvider.toFixed(1)}`
  );

  // Statistiques par jour de la semaine
  const availabilityByDay = finalAvailabilities.reduce(
    (acc: Record<string, number>, availability) => {
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayName = dayNames[availability.dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    },
    {}
  );

  logger.info(
    'PROVIDER_AVAILABILITY',
    `📊 Créneaux par jour: ${JSON.stringify(availabilityByDay)}`
  );

  logger.endSeed('PROVIDER_AVAILABILITY', result);
  return result;
}

/**
 * Valide l'intégrité des disponibilités
 */
export async function validateProviderAvailability(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des disponibilités...');

  let isValid = true;

  // Vérifier les disponibilités
  const availabilities = await prisma.providerAvailability.findMany({
    include: {
      provider: true,
    },
  });

  if (availabilities.length === 0) {
    logger.error('VALIDATION', '❌ Aucune disponibilité trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${availabilities.length} disponibilités trouvées`);
  }

  // Vérifier les horaires cohérents
  const availabilitiesWithInvalidTime = availabilities.filter(availability => {
    return availability.startTime >= availability.endTime;
  });

  if (availabilitiesWithInvalidTime.length === 0) {
    logger.success('VALIDATION', '✅ Tous les horaires sont cohérents');
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${availabilitiesWithInvalidTime.length} créneaux avec horaires incohérents`
    );
  }

  // Vérifier que tous les prestataires ont des disponibilités
  const allProviders = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER },
  });

  const providersWithoutAvailability = [];
  for (const provider of allProviders) {
    const availabilityCount = await prisma.providerAvailability.count({
      where: { providerId: provider.id },
    });
    if (availabilityCount === 0) {
      providersWithoutAvailability.push(provider);
    }
  }

  if (providersWithoutAvailability.length === 0) {
    logger.success('VALIDATION', '✅ Tous les prestataires ont des disponibilités');
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${providersWithoutAvailability.length} prestataires sans disponibilités`
    );
  }

  // Vérifier la distribution par jour de la semaine
  const dayDistribution = availabilities.reduce((acc: Record<number, number>, availability) => {
    acc[availability.dayOfWeek] = (acc[availability.dayOfWeek] || 0) + 1;
    return acc;
  }, {});

  const workDays = [1, 2, 3, 4, 5]; // Lundi à vendredi
  const workDaysTotal = workDays.reduce((sum, day) => sum + (dayDistribution[day] || 0), 0);
  const weekendTotal = (dayDistribution[0] || 0) + (dayDistribution[6] || 0);

  if (workDaysTotal > weekendTotal) {
    logger.success(
      'VALIDATION',
      `✅ Distribution cohérente: ${workDaysTotal} créneaux semaine vs ${weekendTotal} weekend`
    );
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ Plus de créneaux weekend que semaine: ${workDaysTotal} vs ${weekendTotal}`
    );
  }

  logger.success('VALIDATION', '✅ Validation des disponibilités terminée');
  return isValid;
}
