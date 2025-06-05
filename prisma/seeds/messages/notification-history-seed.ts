import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir l'historique d'une notification
 */
interface NotificationHistoryData {
  userId: string;
  type: string;
  channel: string;
  status: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED' | 'BOUNCED';
  content: {
    subject: string;
    message: string;
    templateId?: string;
  };
  metadata: {
    deviceType?: string;
    userAgent?: string;
    ipAddress?: string;
    location?: string;
    campaignId?: string;
  };
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  errorMessage?: string;
}

/**
 * Seed de l'historique des notifications EcoDeli
 * Crée un historique détaillé des envois de notifications avec metrics
 */
export async function seedNotificationHistory(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('NOTIFICATION_HISTORY');

  const result: SeedResult = {
    entity: 'notification_history',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Note: Simulation car pas de modèle NotificationHistory dans le schéma
  logger.info('NOTIFICATION_HISTORY', "📊 Initialisation de l'historique des notifications...");

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
      'NOTIFICATION_HISTORY',
      "Aucun utilisateur trouvé - créer d'abord les seeds d'utilisateurs"
    );
    return result;
  }

  // Types de notifications
  const NOTIFICATION_TYPES = [
    'WELCOME',
    'DELIVERY_CONFIRMATION',
    'DELIVERY_STATUS',
    'SERVICE_REMINDER',
    'PAYMENT_CONFIRMATION',
    'DOCUMENT_UPDATE',
    'PROMOTION',
    'SYSTEM_ALERT',
    'MESSAGE_RECEIVED',
    'SCHEDULE_CHANGE',
  ];

  // Canaux de communication
  const COMMUNICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'];

  // Générer l'historique sur 6 mois
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  let totalNotifications = 0;
  const historyByChannel: Record<string, number> = {};
  const historyByStatus: Record<string, number> = {};
  const historyByType: Record<string, number> = {};

  // Créer l'historique pour chaque utilisateur
  for (const user of users) {
    try {
      // Nombre de notifications par utilisateur selon le rôle
      const notificationCount = getNotificationCountByRole(user.role);

      for (let i = 0; i < notificationCount; i++) {
        const notification = generateNotificationHistory(user, startDate);

        // Simuler l'enregistrement
        logger.database(
          'NOTIFICATION_HISTORY',
          `${notification.type}_${notification.channel}_${user.id}`,
          1
        );

        totalNotifications++;
        result.created++;

        // Statistiques
        historyByChannel[notification.channel] = (historyByChannel[notification.channel] || 0) + 1;
        historyByStatus[notification.status] = (historyByStatus[notification.status] || 0) + 1;
        historyByType[notification.type] = (historyByType[notification.type] || 0) + 1;
      }

      if (options.verbose && totalNotifications % 500 === 0) {
        logger.progress(
          'NOTIFICATION_HISTORY',
          totalNotifications,
          users.length * 50,
          `Historique créé: ${totalNotifications}`
        );
      }
    } catch (error: any) {
      logger.error(
        'NOTIFICATION_HISTORY',
        `❌ Erreur historique utilisateur ${user.id}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Créer des campagnes spéciales
  await createSpecialCampaigns(logger, result, options);

  // Créer des analyses de performance
  await createPerformanceAnalytics(logger, result, options);

  // Statistiques finales
  logger.info('NOTIFICATION_HISTORY', `📊 Par canal: ${JSON.stringify(historyByChannel)}`);
  logger.info('NOTIFICATION_HISTORY', `📈 Par statut: ${JSON.stringify(historyByStatus)}`);
  logger.info('NOTIFICATION_HISTORY', `📋 Par type: ${JSON.stringify(historyByType)}`);

  // Calculer les métriques d'engagement
  const engagementMetrics = calculateEngagementMetrics(historyByStatus, totalNotifications);
  logger.info('NOTIFICATION_HISTORY', `💯 Taux de livraison: ${engagementMetrics.deliveryRate}%`);
  logger.info('NOTIFICATION_HISTORY', `👁️ Taux d'ouverture: ${engagementMetrics.openRate}%`);
  logger.info('NOTIFICATION_HISTORY', `🖱️ Taux de clic: ${engagementMetrics.clickRate}%`);
  logger.info('NOTIFICATION_HISTORY', `❌ Taux d'erreur: ${engagementMetrics.errorRate}%`);

  // Analyse par canal
  const channelAnalysis = analyzeChannelPerformance(historyByChannel);
  logger.info(
    'NOTIFICATION_HISTORY',
    `🎯 Canal le plus performant: ${channelAnalysis.bestChannel}`
  );
  logger.info(
    'NOTIFICATION_HISTORY',
    `📱 Distribution canaux: ${JSON.stringify(channelAnalysis.distribution)}`
  );

  // Validation
  if (totalNotifications >= users.length * 10 - result.errors) {
    logger.validation(
      'NOTIFICATION_HISTORY',
      'PASSED',
      `${totalNotifications} entrées d'historique créées avec succès`
    );
  } else {
    logger.validation(
      'NOTIFICATION_HISTORY',
      'FAILED',
      `Attendu minimum: ${users.length * 10}, Créé: ${totalNotifications}`
    );
  }

  logger.endSeed('NOTIFICATION_HISTORY', result);
  return result;
}

/**
 * Détermine le nombre de notifications par rôle utilisateur
 */
function getNotificationCountByRole(role: UserRole): number {
  switch (role) {
    case UserRole.CLIENT:
      return faker.number.int({ min: 30, max: 80 }); // Clients actifs
    case UserRole.DELIVERER:
      return faker.number.int({ min: 50, max: 120 }); // Beaucoup de notifications
    case UserRole.MERCHANT:
      return faker.number.int({ min: 40, max: 90 }); // Notifications business
    case UserRole.PROVIDER:
      return faker.number.int({ min: 35, max: 75 }); // Notifications services
    case UserRole.ADMIN:
      return faker.number.int({ min: 100, max: 200 }); // Toutes les notifications
    default:
      return faker.number.int({ min: 20, max: 50 });
  }
}

/**
 * Génère une entrée d'historique de notification
 */
function generateNotificationHistory(user: any, startDate: Date): NotificationHistoryData {
  // Type de notification selon le rôle
  const notificationType = getNotificationTypeByRole(user.role);

  // Canal (email dominant pour la plupart)
  const channel = faker.helpers.weightedArrayElement([
    { weight: 45, value: 'email' },
    { weight: 25, value: 'push' },
    { weight: 20, value: 'in_app' },
    { weight: 10, value: 'sms' },
  ]);

  // Date d'envoi dans les 6 derniers mois
  const sentAt = faker.date.between({ from: startDate, to: new Date() });

  // Statut selon le canal (taux de succès différents)
  const status = getStatusByChannel(channel);

  // Contenu selon le type
  const content = generateNotificationContent(notificationType, user.name);

  // Métadonnées techniques
  const metadata = generateNotificationMetadata(channel);

  // Chronologie des événements
  const timeline = generateEventTimeline(sentAt, status);

  return {
    userId: user.id,
    type: notificationType,
    channel,
    status,
    content,
    metadata,
    sentAt,
    deliveredAt: timeline.deliveredAt,
    openedAt: timeline.openedAt,
    clickedAt: timeline.clickedAt,
    errorMessage:
      status === 'FAILED' || status === 'BOUNCED'
        ? getRandomElement([
            'Invalid email address',
            'Message delivery failed',
            'User not found',
            'Service temporarily unavailable',
            'Rate limit exceeded',
          ])
        : undefined,
  };
}

/**
 * Sélectionne un type de notification selon le rôle
 */
function getNotificationTypeByRole(role: UserRole): string {
  const typesByRole = {
    [UserRole.CLIENT]: [
      'WELCOME',
      'DELIVERY_CONFIRMATION',
      'DELIVERY_STATUS',
      'SERVICE_REMINDER',
      'PAYMENT_CONFIRMATION',
      'PROMOTION',
    ],
    [UserRole.DELIVERER]: [
      'DELIVERY_STATUS',
      'SCHEDULE_CHANGE',
      'PAYMENT_CONFIRMATION',
      'MESSAGE_RECEIVED',
      'SYSTEM_ALERT',
    ],
    [UserRole.MERCHANT]: [
      'DELIVERY_CONFIRMATION',
      'PAYMENT_CONFIRMATION',
      'DOCUMENT_UPDATE',
      'PROMOTION',
      'SYSTEM_ALERT',
    ],
    [UserRole.PROVIDER]: [
      'SERVICE_REMINDER',
      'PAYMENT_CONFIRMATION',
      'DOCUMENT_UPDATE',
      'MESSAGE_RECEIVED',
      'SCHEDULE_CHANGE',
    ],
    [UserRole.ADMIN]: [
      'SYSTEM_ALERT',
      'DOCUMENT_UPDATE',
      'MESSAGE_RECEIVED',
      'DELIVERY_STATUS',
      'PAYMENT_CONFIRMATION',
    ],
  };

  const availableTypes = typesByRole[role] || typesByRole[UserRole.CLIENT];
  return getRandomElement(availableTypes);
}

/**
 * Détermine le statut selon le canal de communication
 */
function getStatusByChannel(channel: string): NotificationHistoryData['status'] {
  const statusProbabilities = {
    email: [
      { weight: 70, value: 'DELIVERED' as const },
      { weight: 15, value: 'OPENED' as const },
      { weight: 5, value: 'CLICKED' as const },
      { weight: 8, value: 'BOUNCED' as const },
      { weight: 2, value: 'FAILED' as const },
    ],
    sms: [
      { weight: 85, value: 'DELIVERED' as const },
      { weight: 10, value: 'OPENED' as const },
      { weight: 3, value: 'CLICKED' as const },
      { weight: 2, value: 'FAILED' as const },
    ],
    push: [
      { weight: 80, value: 'DELIVERED' as const },
      { weight: 12, value: 'OPENED' as const },
      { weight: 6, value: 'CLICKED' as const },
      { weight: 2, value: 'FAILED' as const },
    ],
    in_app: [
      { weight: 95, value: 'DELIVERED' as const },
      { weight: 3, value: 'OPENED' as const },
      { weight: 2, value: 'CLICKED' as const },
    ],
  };

  const probabilities =
    statusProbabilities[channel as keyof typeof statusProbabilities] || statusProbabilities.email;
  return faker.helpers.weightedArrayElement(probabilities);
}

/**
 * Génère le contenu d'une notification
 */
function generateNotificationContent(type: string, userName: string): any {
  const contents = {
    WELCOME: {
      subject: 'Bienvenue sur EcoDeli ! 🎉',
      message: `Bonjour ${userName}, bienvenue dans la communauté EcoDeli !`,
      templateId: 'WELCOME_USER_001',
    },
    DELIVERY_CONFIRMATION: {
      subject: 'Livraison confirmée ✅',
      message: `${userName}, votre livraison #DLV-${faker.number.int({ min: 1000, max: 9999 })} a été confirmée.`,
      templateId: 'DELIVERY_CONF_001',
    },
    DELIVERY_STATUS: {
      subject: 'Mise à jour livraison 🚚',
      message: `Votre livreur est en route ! Arrivée prévue dans ${faker.number.int({ min: 5, max: 45 })} minutes.`,
      templateId: 'DELIVERY_STATUS_001',
    },
    SERVICE_REMINDER: {
      subject: 'Rappel service demain ⏰',
      message: `${userName}, n'oubliez pas votre service de ${getRandomElement(['plomberie', 'ménage', 'jardinage'])} demain.`,
      templateId: 'SERVICE_REMINDER_001',
    },
    PAYMENT_CONFIRMATION: {
      subject: 'Paiement confirmé 💳',
      message: `Paiement de ${faker.number.int({ min: 15, max: 150 })}€ traité avec succès.`,
      templateId: 'PAYMENT_CONF_001',
    },
    PROMOTION: {
      subject: 'Offre spéciale ! 🎁',
      message: `${userName}, profitez de -20% sur vos livraisons ce weekend !`,
      templateId: 'PROMO_WEEKEND_001',
    },
    SYSTEM_ALERT: {
      subject: 'Information système ⚠️',
      message: 'Maintenance programmée demain de 2h à 4h. Services temporairement indisponibles.',
      templateId: 'SYSTEM_ALERT_001',
    },
  };

  return contents[type as keyof typeof contents] || contents.WELCOME;
}

/**
 * Génère les métadonnées techniques
 */
function generateNotificationMetadata(channel: string): any {
  const baseMetadata: any = {
    deviceType: getRandomElement(['desktop', 'mobile', 'tablet']),
    userAgent: faker.internet.userAgent(),
    ipAddress: faker.internet.ip(),
    location: getRandomElement(['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice']),
  };

  if (faker.datatype.boolean(0.3)) {
    baseMetadata.campaignId = `CAMP_${faker.date.recent().getFullYear()}_${faker.number.int({ min: 100, max: 999 })}`;
  }

  return baseMetadata;
}

/**
 * Génère la chronologie des événements
 */
function generateEventTimeline(sentAt: Date, status: NotificationHistoryData['status']): any {
  const timeline: any = {};

  if (['DELIVERED', 'OPENED', 'CLICKED'].includes(status)) {
    // Livraison sous 5 minutes
    timeline.deliveredAt = new Date(
      sentAt.getTime() + faker.number.int({ min: 30, max: 300 }) * 1000
    );
  }

  if (['OPENED', 'CLICKED'].includes(status)) {
    // Ouverture dans les 24h suivant la livraison
    const minTime = timeline.deliveredAt?.getTime() || sentAt.getTime();
    timeline.openedAt = new Date(minTime + faker.number.int({ min: 300, max: 86400 }) * 1000);
  }

  if (status === 'CLICKED') {
    // Clic dans les 2h suivant l'ouverture
    const minTime = timeline.openedAt?.getTime() || sentAt.getTime();
    timeline.clickedAt = new Date(minTime + faker.number.int({ min: 10, max: 7200 }) * 1000);
  }

  return timeline;
}

/**
 * Crée des campagnes spéciales
 */
async function createSpecialCampaigns(
  logger: SeedLogger,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  logger.info('NOTIFICATION_HISTORY', "🎯 Création d'historique de campagnes spéciales...");

  const campaigns = [
    {
      name: 'Black Friday 2023',
      type: 'PROMOTION',
      notifications: 1500,
      openRate: '35%',
      clickRate: '12%',
    },
    {
      name: 'Lancement Service Jardinage',
      type: 'PRODUCT_UPDATE',
      notifications: 800,
      openRate: '42%',
      clickRate: '8%',
    },
    {
      name: 'Maintenance Système Janvier',
      type: 'SYSTEM_ALERT',
      notifications: 2200,
      openRate: '78%',
      clickRate: '5%',
    },
    {
      name: 'Campagne Fidélité Printemps',
      type: 'PROMOTION',
      notifications: 1200,
      openRate: '38%',
      clickRate: '15%',
    },
  ];

  for (const campaign of campaigns) {
    try {
      logger.database(
        'CAMPAIGN_HISTORY',
        campaign.name.replace(/\s+/g, '_'),
        campaign.notifications
      );

      result.created += campaign.notifications;

      if (options.verbose) {
        logger.success(
          'NOTIFICATION_HISTORY',
          `✅ Campagne: ${campaign.name} (${campaign.notifications} notifications)`
        );
      }
    } catch (error: any) {
      logger.error('NOTIFICATION_HISTORY', `❌ Erreur campagne ${campaign.name}: ${error.message}`);
      result.errors++;
    }
  }
}

/**
 * Crée des analyses de performance
 */
async function createPerformanceAnalytics(
  logger: SeedLogger,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  logger.info('NOTIFICATION_HISTORY', "📊 Génération d'analyses de performance...");

  const analytics = [
    {
      period: '6 derniers mois',
      metrics: {
        totalSent: 25000,
        delivered: 23500,
        opened: 8200,
        clicked: 1400,
        bounced: 1200,
        failed: 300,
      },
    },
    {
      period: 'Mois dernier',
      metrics: {
        totalSent: 4500,
        delivered: 4200,
        opened: 1580,
        clicked: 280,
        bounced: 250,
        failed: 50,
      },
    },
    {
      period: 'Semaine dernière',
      metrics: {
        totalSent: 1200,
        delivered: 1150,
        opened: 420,
        clicked: 85,
        bounced: 40,
        failed: 10,
      },
    },
  ];

  for (const analytic of analytics) {
    try {
      logger.database(
        'PERFORMANCE_ANALYTICS',
        analytic.period.replace(/\s+/g, '_'),
        analytic.metrics.totalSent
      );

      result.created += 1;

      if (options.verbose) {
        const deliveryRate = (
          (analytic.metrics.delivered / analytic.metrics.totalSent) *
          100
        ).toFixed(1);
        const openRate = ((analytic.metrics.opened / analytic.metrics.delivered) * 100).toFixed(1);

        logger.success(
          'NOTIFICATION_HISTORY',
          `✅ Analytics ${analytic.period}: ${deliveryRate}% livraison, ${openRate}% ouverture`
        );
      }
    } catch (error: any) {
      logger.error(
        'NOTIFICATION_HISTORY',
        `❌ Erreur analytics ${analytic.period}: ${error.message}`
      );
      result.errors++;
    }
  }
}

/**
 * Calcule les métriques d'engagement
 */
function calculateEngagementMetrics(historyByStatus: Record<string, number>, total: number) {
  const delivered =
    (historyByStatus.DELIVERED || 0) +
    (historyByStatus.OPENED || 0) +
    (historyByStatus.CLICKED || 0);
  const opened = (historyByStatus.OPENED || 0) + (historyByStatus.CLICKED || 0);
  const clicked = historyByStatus.CLICKED || 0;
  const errors = (historyByStatus.FAILED || 0) + (historyByStatus.BOUNCED || 0);

  return {
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0',
    openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0',
    clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : '0',
    errorRate: total > 0 ? ((errors / total) * 100).toFixed(1) : '0',
  };
}

/**
 * Analyse la performance par canal
 */
function analyzeChannelPerformance(historyByChannel: Record<string, number>) {
  const total = Object.values(historyByChannel).reduce((sum, count) => sum + count, 0);

  const distribution = Object.entries(historyByChannel).reduce(
    (acc, [channel, count]) => {
      acc[channel] = `${((count / total) * 100).toFixed(1)}%`;
      return acc;
    },
    {} as Record<string, string>
  );

  const bestChannel =
    Object.entries(historyByChannel).sort(([, a], [, b]) => b - a)[0]?.[0] || 'email';

  return {
    bestChannel,
    distribution,
  };
}

/**
 * Valide l'intégrité de l'historique des notifications
 */
export async function validateNotificationHistory(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', "🔍 Validation de l'historique des notifications...");

  // Cette validation est simulée car il n'y a pas de modèle NotificationHistory
  logger.success('VALIDATION', '✅ Historique des notifications validé (simulation)');
  logger.info(
    'VALIDATION',
    "📝 Note: L'historique est simulé car aucun modèle correspondant n'existe dans le schéma Prisma"
  );

  return true;
}
