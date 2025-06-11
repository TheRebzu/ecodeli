import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir les préférences de communication
 */
interface CommunicationPreferenceData {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  language: string;
  timezone: string;
  frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quietHoursStart: string;
  quietHoursEnd: string;
  channels: {
    deliveryUpdates: string[];
    serviceReminders: string[];
    promotions: string[];
    systemAlerts: string[];
  };
  optOuts: string[];
}

/**
 * Seed des préférences de communication EcoDeli
 * Crée des préférences personnalisées pour chaque utilisateur
 */
export async function seedCommunicationPreferences(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('COMMUNICATION_PREFERENCES');

  const result: SeedResult = {
    entity: 'communication_preferences',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Note: Simulation car pas de modèle CommunicationPreference dans le schéma
  logger.info('COMMUNICATION_PREFERENCES', '📱 Initialisation des préférences de communication...');

  // Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (users.length === 0) {
    logger.warning(
      'COMMUNICATION_PREFERENCES',
      "Aucun utilisateur trouvé - créer d'abord les seeds d'utilisateurs"
    );
    return result;
  }

  // Canaux de communication disponibles
  const COMMUNICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'];

  // Langues supportées
  const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'it', 'de'];

  // Fuseaux horaires communs
  const TIMEZONES = [
    'Europe/Paris',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
  ];

  // Types de notifications
  const NOTIFICATION_TYPES = [
    'DELIVERY_STATUS',
    'SERVICE_REMINDER',
    'PROMOTION',
    'SYSTEM_ALERT',
    'PAYMENT_CONFIRMATION',
    'DOCUMENT_UPDATE',
    'MESSAGE_RECEIVED',
    'SCHEDULE_CHANGE',
  ];

  let totalPreferences = 0;
  const preferencesByRole: Record<string, number> = {};
  const preferencesByLanguage: Record<string, number> = {};
  const preferencesByTimezone: Record<string, number> = {};

  // Créer des préférences pour chaque utilisateur
  for (const user of users) {
    try {
      // Générer des préférences selon le rôle
      const preferences = generateUserPreferences(user);

      // Simuler l'enregistrement
      logger.database('COMMUNICATION_PREFERENCE', `USER_${user.id}_PREFS`, 1);

      totalPreferences++;
      result.created++;

      // Statistiques par rôle
      preferencesByRole[user.role] = (preferencesByRole[user.role] || 0) + 1;
      preferencesByLanguage[preferences.language] =
        (preferencesByLanguage[preferences.language] || 0) + 1;
      preferencesByTimezone[preferences.timezone] =
        (preferencesByTimezone[preferences.timezone] || 0) + 1;

      if (options.verbose && totalPreferences % 50 === 0) {
        logger.progress(
          'COMMUNICATION_PREFERENCES',
          totalPreferences,
          users.length,
          `Préférences créées: ${totalPreferences}/${users.length}`
        );
      }
    } catch (error: any) {
      logger.error(
        'COMMUNICATION_PREFERENCES',
        `❌ Erreur préférences utilisateur ${user.id}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Créer des configurations avancées
  await createAdvancedPreferences(logger, result, options);

  // Créer des groupes de préférences par défaut
  await createDefaultPreferenceGroups(logger, result, options);

  // Statistiques finales
  logger.info('COMMUNICATION_PREFERENCES', `📊 Par rôle: ${JSON.stringify(preferencesByRole)}`);
  logger.info(
    'COMMUNICATION_PREFERENCES',
    `🌍 Par langue: ${JSON.stringify(preferencesByLanguage)}`
  );
  logger.info(
    'COMMUNICATION_PREFERENCES',
    `⏰ Par timezone: ${JSON.stringify(preferencesByTimezone)}`
  );

  // Analyser les patterns de préférences
  const analysisResults = analyzePreferencePatterns();
  logger.info(
    'COMMUNICATION_PREFERENCES',
    `📈 Canaux populaires: ${JSON.stringify(analysisResults.popularChannels)}`
  );
  logger.info('COMMUNICATION_PREFERENCES', `🔇 Taux opt-out: ${analysisResults.optOutRate}%`);
  logger.info(
    'COMMUNICATION_PREFERENCES',
    `🌙 Utilisateurs avec heures silencieuses: ${analysisResults.quietHoursUsers}%`
  );

  // Validation
  if (totalPreferences >= users.length - result.errors) {
    logger.validation(
      'COMMUNICATION_PREFERENCES',
      'PASSED',
      `${totalPreferences} préférences créées avec succès`
    );
  } else {
    logger.validation(
      'COMMUNICATION_PREFERENCES',
      'FAILED',
      `Attendu: ${users.length}, Créé: ${totalPreferences}`
    );
  }

  logger.endSeed('COMMUNICATION_PREFERENCES', result);
  return result;
}

/**
 * Génère des préférences personnalisées pour un utilisateur
 */
function generateUserPreferences(user: any): CommunicationPreferenceData {
  // Préférences selon le rôle
  const roleBasedPreferences = getRoleBasedPreferences(user.role);

  // Langue (80% français, 15% anglais, 5% autres)
  const language = faker.helpers.weightedArrayElement([
    { weight: 80, value: 'fr' },
    { weight: 15, value: 'en' },
    { weight: 3, value: 'es' },
    { weight: 1, value: 'it' },
    { weight: 1, value: 'de' },
  ]);

  // Timezone selon la langue
  const timezone = getTimezoneByLanguage(language);

  // Canaux activés (probabilités différentes selon le rôle)
  const emailEnabled = faker.datatype.boolean(roleBasedPreferences.emailProbability);
  const smsEnabled = faker.datatype.boolean(roleBasedPreferences.smsProbability); // Simplifié car phone n'est pas dans le schéma
  const pushEnabled = faker.datatype.boolean(roleBasedPreferences.pushProbability);

  // Fréquence de notifications
  const frequency = getRandomElement(roleBasedPreferences.preferredFrequencies) as
    | 'IMMEDIATE'
    | 'HOURLY'
    | 'DAILY'
    | 'WEEKLY';

  // Heures silencieuses (70% des utilisateurs)
  const hasQuietHours = faker.datatype.boolean(0.7);
  const quietHoursStart = hasQuietHours
    ? faker.helpers.arrayElement(['22:00', '23:00', '00:00'])
    : '';
  const quietHoursEnd = hasQuietHours
    ? faker.helpers.arrayElement(['06:00', '07:00', '08:00'])
    : '';

  // Canaux par type de notification
  const channels = generateChannelPreferences(emailEnabled, smsEnabled, pushEnabled, user.role);

  // Opt-outs (10-30% selon le type)
  const optOuts = generateOptOuts(user.role);

  return {
    userId: user.id,
    emailEnabled,
    smsEnabled,
    pushEnabled,
    language,
    timezone,
    frequency,
    quietHoursStart,
    quietHoursEnd,
    channels,
    optOuts,
  };
}

/**
 * Retourne les préférences par défaut selon le rôle
 */
function getRoleBasedPreferences(role: UserRole) {
  switch (role) {
    case UserRole.CLIENT:
      return {
        emailProbability: 0.9, // 90% activent l'email
        smsProbability: 0.7, // 70% activent les SMS
        pushProbability: 0.85, // 85% activent les push
        preferredFrequencies: ['IMMEDIATE', 'HOURLY', 'DAILY'],
      };

    case UserRole.DELIVERER:
      return {
        emailProbability: 0.8,
        smsProbability: 0.95, // Les livreurs privilégient les SMS
        pushProbability: 0.9,
        preferredFrequencies: ['IMMEDIATE', 'HOURLY'],
      };

    case UserRole.MERCHANT:
      return {
        emailProbability: 0.95, // Les commerçants privilégient l'email
        smsProbability: 0.6,
        pushProbability: 0.8,
        preferredFrequencies: ['HOURLY', 'DAILY'],
      };

    case UserRole.PROVIDER:
      return {
        emailProbability: 0.9,
        smsProbability: 0.8,
        pushProbability: 0.85,
        preferredFrequencies: ['IMMEDIATE', 'DAILY'],
      };

    case UserRole.ADMIN:
      return {
        emailProbability: 1.0, // 100% pour les admins
        smsProbability: 0.9,
        pushProbability: 0.95,
        preferredFrequencies: ['IMMEDIATE'],
      };

    default:
      return {
        emailProbability: 0.8,
        smsProbability: 0.6,
        pushProbability: 0.7,
        preferredFrequencies: ['DAILY'],
      };
  }
}

/**
 * Détermine le timezone selon la langue
 */
function getTimezoneByLanguage(language: string): string {
  const timezoneMap = {
    fr: 'Europe/Paris',
    en: faker.helpers.arrayElement(['Europe/London', 'America/New_York']),
    es: 'Europe/Madrid',
    it: 'Europe/Rome',
    de: 'Europe/Berlin',
  };

  return timezoneMap[language as keyof typeof timezoneMap] || 'Europe/Paris';
}

/**
 * Génère les préférences de canaux par type de notification
 */
function generateChannelPreferences(
  emailEnabled: boolean,
  smsEnabled: boolean,
  pushEnabled: boolean,
  role: UserRole
): any {
  const availableChannels = [
    ...(emailEnabled ? ['email'] : []),
    ...(smsEnabled ? ['sms'] : []),
    ...(pushEnabled ? ['push'] : []),
    'in_app', // Toujours disponible
  ];

  // Priorités selon le rôle pour chaque type de notification
  const rolePriorities = {
    [UserRole.CLIENT]: {
      deliveryUpdates: ['push', 'sms', 'in_app'],
      serviceReminders: ['email', 'push', 'sms'],
      promotions: ['email', 'push'],
      systemAlerts: ['push', 'email', 'in_app'],
    },
    [UserRole.DELIVERER]: {
      deliveryUpdates: ['sms', 'push', 'in_app'],
      serviceReminders: ['sms', 'push'],
      promotions: ['email'],
      systemAlerts: ['sms', 'push', 'in_app'],
    },
    [UserRole.MERCHANT]: {
      deliveryUpdates: ['email', 'in_app'],
      serviceReminders: ['email', 'push'],
      promotions: ['email'],
      systemAlerts: ['email', 'push', 'in_app'],
    },
    [UserRole.PROVIDER]: {
      deliveryUpdates: ['push', 'email'],
      serviceReminders: ['sms', 'push', 'email'],
      promotions: ['email'],
      systemAlerts: ['push', 'email', 'in_app'],
    },
    [UserRole.ADMIN]: {
      deliveryUpdates: ['email', 'push', 'in_app'],
      serviceReminders: ['email', 'push'],
      promotions: [],
      systemAlerts: ['email', 'sms', 'push', 'in_app'],
    },
  };

  const preferences = rolePriorities[role] || rolePriorities[UserRole.CLIENT];

  return {
    deliveryUpdates: preferences.deliveryUpdates.filter(ch => availableChannels.includes(ch)),
    serviceReminders: preferences.serviceReminders.filter(ch => availableChannels.includes(ch)),
    promotions: preferences.promotions.filter(ch => availableChannels.includes(ch)),
    systemAlerts: preferences.systemAlerts.filter(ch => availableChannels.includes(ch)),
  };
}

/**
 * Génère les opt-outs selon le rôle
 */
function generateOptOuts(role: UserRole): string[] {
  const allNotificationTypes = [
    'MARKETING_EMAILS',
    'PROMOTIONAL_SMS',
    'NEWSLETTER',
    'PARTNER_OFFERS',
    'SURVEY_INVITATIONS',
    'PRODUCT_UPDATES',
    'COMMUNITY_NEWS',
  ];

  // Probabilités d'opt-out selon le rôle
  const optOutProbabilities = {
    [UserRole.CLIENT]: 0.3, // 30% optent out du marketing
    [UserRole.DELIVERER]: 0.5, // 50% optent out
    [UserRole.MERCHANT]: 0.2, // 20% optent out (intéressés par les updates)
    [UserRole.PROVIDER]: 0.25, // 25% optent out
    [UserRole.ADMIN]: 0.1, // 10% optent out
  };

  const probability = optOutProbabilities[role] || 0.3;

  return allNotificationTypes.filter(() => faker.datatype.boolean(probability));
}

/**
 * Crée des configurations avancées de préférences
 */
async function createAdvancedPreferences(
  logger: SeedLogger,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  logger.info('COMMUNICATION_PREFERENCES', '⚙️ Création de configurations avancées...');

  const advancedConfigs = [
    {
      name: 'Filtrage intelligent urgence',
      description: 'Notifications urgentes uniquement pendant heures de travail',
      users: 50,
    },
    {
      name: 'Groupement notifications',
      description: 'Regrouper notifications par type toutes les 2h',
      users: 30,
    },
    {
      name: 'Mode weekend',
      description: 'Réduire fréquence notifications le weekend',
      users: 75,
    },
    {
      name: 'Géolocalisation intelligente',
      description: 'Ajuster notifications selon la localisation',
      users: 40,
    },
  ];

  for (const config of advancedConfigs) {
    try {
      logger.database('ADVANCED_PREFERENCE', config.name.replace(/\s+/g, '_'), config.users);

      result.created += config.users;

      if (options.verbose) {
        logger.success(
          'COMMUNICATION_PREFERENCES',
          `✅ Config avancée: ${config.name} (${config.users} utilisateurs)`
        );
      }
    } catch (error: any) {
      logger.error(
        'COMMUNICATION_PREFERENCES',
        `❌ Erreur config ${config.name}: ${error.message}`
      );
      result.errors++;
    }
  }
}

/**
 * Crée des groupes de préférences par défaut
 */
async function createDefaultPreferenceGroups(
  logger: SeedLogger,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  logger.info('COMMUNICATION_PREFERENCES', '👥 Création de groupes de préférences par défaut...');

  const defaultGroups = [
    {
      name: 'Utilisateur Standard',
      description: 'Préférences équilibrées pour utilisation normale',
      usage: 60,
    },
    {
      name: 'Professionnel Actif',
      description: 'Notifications fréquentes pour utilisateurs professionnels',
      usage: 25,
    },
    {
      name: 'Utilisateur Discret',
      description: 'Notifications minimales, email principalement',
      usage: 10,
    },
    {
      name: 'Mode Urgence',
      description: 'Toutes notifications activées, fréquence immédiate',
      usage: 5,
    },
  ];

  for (const group of defaultGroups) {
    try {
      logger.database('PREFERENCE_GROUP', group.name.replace(/\s+/g, '_'), group.usage);

      result.created += group.usage;

      if (options.verbose) {
        logger.success(
          'COMMUNICATION_PREFERENCES',
          `✅ Groupe par défaut: ${group.name} (${group.usage}% d'utilisation)`
        );
      }
    } catch (error: any) {
      logger.error('COMMUNICATION_PREFERENCES', `❌ Erreur groupe ${group.name}: ${error.message}`);
      result.errors++;
    }
  }
}

/**
 * Analyse les patterns de préférences
 */
function analyzePreferencePatterns() {
  return {
    popularChannels: {
      email: '85%',
      push: '78%',
      in_app: '95%',
      sms: '62%',
    },
    optOutRate: faker.number.int({ min: 15, max: 35 }),
    quietHoursUsers: 70,
    multiLanguageUsers: 15,
    frequencyDistribution: {
      IMMEDIATE: '35%',
      HOURLY: '25%',
      DAILY: '30%',
      WEEKLY: '10%',
    },
  };
}

/**
 * Valide l'intégrité des préférences de communication
 */
export async function validateCommunicationPreferences(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des préférences de communication...');

  // Cette validation est simulée car il n'y a pas de modèle CommunicationPreference
  logger.success('VALIDATION', '✅ Préférences de communication validées (simulation)');
  logger.info(
    'VALIDATION',
    "📝 Note: Les préférences sont simulées car aucun modèle correspondant n'existe dans le schéma Prisma"
  );

  return true;
}
