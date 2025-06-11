import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour les templates de notifications
 */
interface NotificationTemplate {
  type: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  language: 'fr' | 'en';
  title: string;
  message: string;
  variables: string[];
  targetRoles: UserRole[];
  isActive: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

/**
 * Seed des templates de notifications EcoDeli
 * Crée tous les templates multilingues pour différents canaux
 */
export async function seedNotificationTemplates(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('NOTIFICATION_TEMPLATES');

  const result: SeedResult = {
    entity: 'notification_templates',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier les notifications existantes
  const existingNotifications = await prisma.notification.count();

  if (existingNotifications > 50 && !options.force) {
    logger.warning(
      'NOTIFICATION_TEMPLATES',
      `${existingNotifications} notifications déjà présentes - utiliser force:true pour recréer`
    );
    result.skipped = existingNotifications;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.notification.deleteMany({});
    logger.database('NETTOYAGE', 'notifications', 0);
  }

  // Templates de base pour chaque type d'événement
  const BASE_TEMPLATES: Omit<NotificationTemplate, 'language' | 'title' | 'message'>[] = [
    {
      type: 'WELCOME',
      channel: 'email',
      variables: ['userName', 'userRole', 'activationLink'],
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'EMAIL_VERIFICATION',
      channel: 'email',
      variables: ['userName', 'verificationLink', 'expirationTime'],
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'PASSWORD_RESET',
      channel: 'email',
      variables: ['userName', 'resetLink', 'expirationTime'],
      targetRoles: [
        UserRole.CLIENT,
        UserRole.DELIVERER,
        UserRole.MERCHANT,
        UserRole.PROVIDER,
        UserRole.ADMIN,
      ],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'DOCUMENT_APPROVED',
      channel: 'push',
      variables: ['documentType', 'approvalDate'],
      targetRoles: [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'MEDIUM',
    },
    {
      type: 'DOCUMENT_REJECTED',
      channel: 'in_app',
      variables: ['documentType', 'rejectionReason', 'resubmissionDeadline'],
      targetRoles: [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'DELIVERY_ASSIGNED',
      channel: 'push',
      variables: ['deliveryId', 'pickupAddress', 'estimatedTime'],
      targetRoles: [UserRole.DELIVERER],
      isActive: true,
      priority: 'URGENT',
    },
    {
      type: 'DELIVERY_COMPLETED',
      channel: 'sms',
      variables: ['deliveryId', 'completionTime', 'rating'],
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'MEDIUM',
    },
    {
      type: 'PAYMENT_RECEIVED',
      channel: 'email',
      variables: ['amount', 'paymentMethod', 'transactionId'],
      targetRoles: [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'MEDIUM',
    },
    {
      type: 'PAYMENT_FAILED',
      channel: 'push',
      variables: ['amount', 'failureReason', 'retryLink'],
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'BOX_RESERVED',
      channel: 'in_app',
      variables: ['boxNumber', 'warehouseName', 'reservationPeriod'],
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'MEDIUM',
    },
    {
      type: 'BOX_EXPIRING',
      channel: 'sms',
      variables: ['boxNumber', 'expirationDate', 'renewalLink'],
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'SERVICE_BOOKING',
      channel: 'email',
      variables: ['serviceType', 'providerName', 'appointmentDate'],
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'MEDIUM',
    },
    {
      type: 'SERVICE_REMINDER',
      channel: 'push',
      variables: ['serviceType', 'appointmentTime', 'providerContact'],
      targetRoles: [UserRole.CLIENT, UserRole.PROVIDER],
      isActive: true,
      priority: 'HIGH',
    },
    {
      type: 'MAINTENANCE_ALERT',
      channel: 'in_app',
      variables: ['startTime', 'endTime', 'affectedServices'],
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'MEDIUM',
    },
    {
      type: 'SECURITY_ALERT',
      channel: 'email',
      variables: ['alertType', 'detectionTime', 'securityAction'],
      targetRoles: [
        UserRole.CLIENT,
        UserRole.DELIVERER,
        UserRole.MERCHANT,
        UserRole.PROVIDER,
        UserRole.ADMIN,
      ],
      isActive: true,
      priority: 'URGENT',
    },
  ];

  // Messages localisés
  const LOCALIZED_MESSAGES = {
    fr: {
      WELCOME: {
        title: 'Bienvenue sur EcoDeli {{userName}} !',
        message:
          'Votre compte {{userRole}} a été créé avec succès. Activez-le via ce lien : {{activationLink}}',
      },
      EMAIL_VERIFICATION: {
        title: 'Vérifiez votre adresse email',
        message:
          'Bonjour {{userName}}, cliquez ici pour vérifier votre email : {{verificationLink}} (expire dans {{expirationTime}})',
      },
      PASSWORD_RESET: {
        title: 'Réinitialisation de mot de passe',
        message:
          'Bonjour {{userName}}, réinitialisez votre mot de passe : {{resetLink}} (expire dans {{expirationTime}})',
      },
      DOCUMENT_APPROVED: {
        title: 'Document approuvé ✅',
        message:
          'Votre {{documentType}} a été approuvé le {{approvalDate}}. Vous pouvez maintenant accéder à tous les services.',
      },
      DOCUMENT_REJECTED: {
        title: 'Document refusé ❌',
        message:
          'Votre {{documentType}} a été refusé : {{rejectionReason}}. Resoumettez avant le {{resubmissionDeadline}}',
      },
      DELIVERY_ASSIGNED: {
        title: 'Nouvelle livraison assignée 🚚',
        message: 'Livraison {{deliveryId}} : récupérez à {{pickupAddress}} dans {{estimatedTime}}',
      },
      DELIVERY_COMPLETED: {
        title: 'Livraison terminée',
        message:
          'Votre livraison {{deliveryId}} est terminée ({{completionTime}}). Notez votre expérience : {{rating}}/5',
      },
      PAYMENT_RECEIVED: {
        title: 'Paiement reçu 💰',
        message: 'Vous avez reçu {{amount}}€ via {{paymentMethod}} (ID: {{transactionId}})',
      },
      PAYMENT_FAILED: {
        title: 'Échec de paiement',
        message: 'Paiement de {{amount}}€ échoué : {{failureReason}}. Réessayez : {{retryLink}}',
      },
      BOX_RESERVED: {
        title: 'Box réservée 📦',
        message: 'Box {{boxNumber}} réservée à {{warehouseName}} pour {{reservationPeriod}}',
      },
      BOX_EXPIRING: {
        title: 'Box expire bientôt ⏰',
        message:
          'Votre box {{boxNumber}} expire le {{expirationDate}}. Renouvelez : {{renewalLink}}',
      },
      SERVICE_BOOKING: {
        title: 'Service réservé',
        message: 'Service {{serviceType}} avec {{providerName}} programmé le {{appointmentDate}}',
      },
      SERVICE_REMINDER: {
        title: 'Rappel service',
        message:
          'Votre {{serviceType}} commence dans 1h ({{appointmentTime}}). Contact : {{providerContact}}',
      },
      MAINTENANCE_ALERT: {
        title: 'Maintenance programmée',
        message:
          'Maintenance de {{startTime}} à {{endTime}}. Services affectés : {{affectedServices}}',
      },
      SECURITY_ALERT: {
        title: 'Alerte sécurité 🚨',
        message:
          'Alerte {{alertType}} détectée à {{detectionTime}}. Action prise : {{securityAction}}',
      },
    },
    en: {
      WELCOME: {
        title: 'Welcome to EcoDeli {{userName}}!',
        message:
          'Your {{userRole}} account has been created successfully. Activate it via this link: {{activationLink}}',
      },
      EMAIL_VERIFICATION: {
        title: 'Verify your email address',
        message:
          'Hello {{userName}}, click here to verify your email: {{verificationLink}} (expires in {{expirationTime}})',
      },
      PASSWORD_RESET: {
        title: 'Password reset',
        message:
          'Hello {{userName}}, reset your password: {{resetLink}} (expires in {{expirationTime}})',
      },
      DOCUMENT_APPROVED: {
        title: 'Document approved ✅',
        message:
          'Your {{documentType}} was approved on {{approvalDate}}. You can now access all services.',
      },
      DOCUMENT_REJECTED: {
        title: 'Document rejected ❌',
        message:
          'Your {{documentType}} was rejected: {{rejectionReason}}. Resubmit before {{resubmissionDeadline}}',
      },
      DELIVERY_ASSIGNED: {
        title: 'New delivery assigned 🚚',
        message: 'Delivery {{deliveryId}}: pickup at {{pickupAddress}} in {{estimatedTime}}',
      },
      DELIVERY_COMPLETED: {
        title: 'Delivery completed',
        message:
          'Your delivery {{deliveryId}} is completed ({{completionTime}}). Rate your experience: {{rating}}/5',
      },
      PAYMENT_RECEIVED: {
        title: 'Payment received 💰',
        message: 'You received {{amount}}€ via {{paymentMethod}} (ID: {{transactionId}})',
      },
      PAYMENT_FAILED: {
        title: 'Payment failed',
        message: 'Payment of {{amount}}€ failed: {{failureReason}}. Retry: {{retryLink}}',
      },
      BOX_RESERVED: {
        title: 'Box reserved 📦',
        message: 'Box {{boxNumber}} reserved at {{warehouseName}} for {{reservationPeriod}}',
      },
      BOX_EXPIRING: {
        title: 'Box expiring soon ⏰',
        message: 'Your box {{boxNumber}} expires on {{expirationDate}}. Renew: {{renewalLink}}',
      },
      SERVICE_BOOKING: {
        title: 'Service booked',
        message: 'Service {{serviceType}} with {{providerName}} scheduled for {{appointmentDate}}',
      },
      SERVICE_REMINDER: {
        title: 'Service reminder',
        message:
          'Your {{serviceType}} starts in 1h ({{appointmentTime}}). Contact: {{providerContact}}',
      },
      MAINTENANCE_ALERT: {
        title: 'Scheduled maintenance',
        message:
          'Maintenance from {{startTime}} to {{endTime}}. Affected services: {{affectedServices}}',
      },
      SECURITY_ALERT: {
        title: 'Security alert 🚨',
        message:
          'Alert {{alertType}} detected at {{detectionTime}}. Action taken: {{securityAction}}',
      },
    },
  };

  // Récupérer les utilisateurs pour créer des notifications de test
  const users = await prisma.user.findMany({
    take: 20, // Limiter pour éviter trop de notifications
    select: { id: true, role: true, name: true },
  });

  if (users.length === 0) {
    logger.warning(
      'NOTIFICATION_TEMPLATES',
      "Aucun utilisateur trouvé - créer d'abord les seeds utilisateurs"
    );
    return result;
  }

  let totalNotifications = 0;

  // Créer des notifications pour chaque template et langue
  for (const template of BASE_TEMPLATES) {
    for (const lang of ['fr', 'en'] as const) {
      const localizedMessage =
        LOCALIZED_MESSAGES[lang][template.type as keyof (typeof LOCALIZED_MESSAGES)['fr']];

      if (!localizedMessage) continue;

      // Créer des notifications de test pour des utilisateurs correspondants
      const eligibleUsers = users.filter(user => template.targetRoles.includes(user.role));

      for (const user of eligibleUsers.slice(0, 3)) {
        // Max 3 par template
        try {
          // Remplacer les variables par des valeurs de test
          let title = localizedMessage.title;
          let message = localizedMessage.message;

          // Remplacements dynamiques basiques
          title = title.replace('{{userName}}', user.name || 'Utilisateur');
          message = message.replace('{{userName}}', user.name || 'Utilisateur');
          message = message.replace('{{userRole}}', user.role.toLowerCase());

          // Autres variables avec des valeurs de test
          template.variables.forEach(variable => {
            const testValue = generateTestValue(variable);
            title = title.replace(`{{${variable}}}`, testValue);
            message = message.replace(`{{${variable}}}`, testValue);
          });

          const notification = await prisma.notification.create({
            data: {
              userId: user.id,
              title: title,
              message: message,
              type: `${template.type}_${template.channel.toUpperCase()}_${lang.toUpperCase()}`,
              link: template.type.includes('LINK') ? faker.internet.url() : null,
              data: JSON.stringify({
                channel: template.channel,
                language: lang,
                priority: template.priority,
                variables: template.variables,
                originalTemplate: template.type,
              }),
              read: faker.datatype.boolean(0.3), // 30% de chances d'être lues
              readAt: faker.datatype.boolean(0.3) ? faker.date.recent() : null,
            },
          });

          totalNotifications++;
          result.created++;

          if (options.verbose && totalNotifications % 10 === 0) {
            logger.progress(
              'NOTIFICATION_TEMPLATES',
              totalNotifications,
              BASE_TEMPLATES.length * 2 * 3,
              `Notifications créées: ${totalNotifications}`
            );
          }
        } catch (error: any) {
          logger.error(
            'NOTIFICATION_TEMPLATES',
            `❌ Erreur création notification ${template.type}: ${error.message}`
          );
          result.errors++;
        }
      }
    }
  }

  // Statistiques finales
  const finalNotifications = await prisma.notification.findMany({
    include: { user: true },
  });

  // Distribution par type
  const notificationsByType = finalNotifications.reduce(
    (acc: Record<string, number>, notification) => {
      const baseType = notification.type.split('_')[0];
      acc[baseType] = (acc[baseType] || 0) + 1;
      return acc;
    },
    {}
  );

  // Distribution par canal (depuis data)
  const notificationsByChannel = finalNotifications.reduce(
    (acc: Record<string, number>, notification) => {
      try {
        const data = JSON.parse(notification.data || '{}');
        const channel = data.channel || 'unknown';
        acc[channel] = (acc[channel] || 0) + 1;
      } catch {
        acc['unknown'] = (acc['unknown'] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  // Distribution par langue
  const notificationsByLanguage = finalNotifications.reduce(
    (acc: Record<string, number>, notification) => {
      try {
        const data = JSON.parse(notification.data || '{}');
        const language = data.language || 'unknown';
        acc[language] = (acc[language] || 0) + 1;
      } catch {
        acc['unknown'] = (acc['unknown'] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  // Taux de lecture
  const readNotifications = finalNotifications.filter(n => n.read).length;
  const readRate =
    finalNotifications.length > 0
      ? ((readNotifications / finalNotifications.length) * 100).toFixed(1)
      : '0';

  logger.info('NOTIFICATION_TEMPLATES', `📊 Types: ${JSON.stringify(notificationsByType)}`);
  logger.info('NOTIFICATION_TEMPLATES', `📱 Canaux: ${JSON.stringify(notificationsByChannel)}`);
  logger.info('NOTIFICATION_TEMPLATES', `🌍 Langues: ${JSON.stringify(notificationsByLanguage)}`);
  logger.info(
    'NOTIFICATION_TEMPLATES',
    `📖 Taux de lecture: ${readRate}% (${readNotifications}/${finalNotifications.length})`
  );

  // Validation
  if (finalNotifications.length >= totalNotifications - result.errors) {
    logger.validation(
      'NOTIFICATION_TEMPLATES',
      'PASSED',
      `${finalNotifications.length} notifications créées avec succès`
    );
  } else {
    logger.validation(
      'NOTIFICATION_TEMPLATES',
      'FAILED',
      `Attendu: ${totalNotifications}, Créé: ${finalNotifications.length}`
    );
  }

  logger.endSeed('NOTIFICATION_TEMPLATES', result);
  return result;
}

/**
 * Génère une valeur de test pour une variable de template
 */
function generateTestValue(variable: string): string {
  switch (variable) {
    case 'activationLink':
    case 'verificationLink':
    case 'resetLink':
    case 'retryLink':
    case 'renewalLink':
      return faker.internet.url();
    case 'expirationTime':
      return '24 heures';
    case 'documentType':
      return faker.helpers.arrayElement([
        'Permis de conduire',
        "Carte d'identité",
        'Justificatif domicile',
      ]);
    case 'approvalDate':
    case 'completionTime':
    case 'appointmentDate':
    case 'appointmentTime':
    case 'detectionTime':
      return faker.date.recent().toLocaleDateString('fr-FR');
    case 'rejectionReason':
      return faker.helpers.arrayElement([
        'Document illisible',
        'Information manquante',
        'Format incorrect',
      ]);
    case 'resubmissionDeadline':
      return faker.date.future().toLocaleDateString('fr-FR');
    case 'deliveryId':
    case 'transactionId':
      return faker.string.alphanumeric(8).toUpperCase();
    case 'pickupAddress':
      return `${faker.location.streetAddress()}, ${faker.location.city()}`;
    case 'estimatedTime':
      return `${faker.number.int({ min: 15, max: 120 })} minutes`;
    case 'amount':
      return faker.number.float({ min: 10, max: 500, fractionDigits: 2 }).toString();
    case 'paymentMethod':
      return faker.helpers.arrayElement(['Carte bancaire', 'PayPal', 'Virement']);
    case 'failureReason':
      return faker.helpers.arrayElement(['Fonds insuffisants', 'Carte expirée', 'Erreur réseau']);
    case 'rating':
      return faker.number.int({ min: 1, max: 5 }).toString();
    case 'boxNumber':
      return `BOX-${faker.string.numeric(3)}`;
    case 'warehouseName':
      return `Entrepôt ${faker.location.city()}`;
    case 'reservationPeriod':
      return `${faker.number.int({ min: 1, max: 12 })} mois`;
    case 'expirationDate':
      return faker.date.future().toLocaleDateString('fr-FR');
    case 'serviceType':
      return faker.helpers.arrayElement(['Plomberie', 'Électricité', 'Ménage', 'Jardinage']);
    case 'providerName':
      return faker.person.fullName();
    case 'providerContact':
      return faker.phone.number();
    case 'startTime':
    case 'endTime':
      return faker.date.future().toLocaleTimeString('fr-FR');
    case 'affectedServices':
      return faker.helpers.arrayElement(['Livraisons', 'Stockage', 'Services', 'Paiements']);
    case 'alertType':
      return faker.helpers.arrayElement([
        'Tentative intrusion',
        'Connexion suspecte',
        'Modification sensible',
      ]);
    case 'securityAction':
      return faker.helpers.arrayElement(['Compte bloqué', 'Alerte envoyée', 'Session fermée']);
    default:
      return faker.lorem.words(2);
  }
}

/**
 * Valide l'intégrité des templates de notifications
 */
export async function validateNotificationTemplates(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des templates de notifications...');

  let isValid = true;

  // Vérifier les notifications
  const notifications = await prisma.notification.findMany({
    include: { user: true },
  });

  if (notifications.length === 0) {
    logger.error('VALIDATION', '❌ Aucune notification trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${notifications.length} notifications trouvées`);
  }

  // Vérifier la structure des données
  const notificationsWithValidData = notifications.filter(notification => {
    try {
      const data = JSON.parse(notification.data || '{}');
      return data.channel && data.language && data.priority;
    } catch {
      return false;
    }
  });

  if (notificationsWithValidData.length === notifications.length) {
    logger.success('VALIDATION', '✅ Toutes les notifications ont des données structurées valides');
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${notifications.length - notificationsWithValidData.length} notifications avec données invalides`
    );
  }

  // Vérifier la multilingue
  const languages = new Set(
    notifications
      .map(n => {
        try {
          return JSON.parse(n.data || '{}').language;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );

  if (languages.has('fr') && languages.has('en')) {
    logger.success('VALIDATION', '✅ Support multilingue détecté (FR, EN)');
  } else {
    logger.warning('VALIDATION', `⚠️ Langues détectées: ${Array.from(languages).join(', ')}`);
  }

  logger.success('VALIDATION', '✅ Validation des templates de notifications terminée');
  return isValid;
}
