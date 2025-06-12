import { PrismaClient, UserRole, ActivityType } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un événement d'audit
 */
interface AuditEvent {
  entityType: string;
  action: string;
  targetRoles: UserRole[];
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  frequency: number; // Nombre approximatif par mois
}

/**
 * Interface pour les activités utilisateur
 */
interface UserActivity {
  type: ActivityType;
  targetRoles: UserRole[];
  details: string[];
  frequency: number;
}

/**
 * Seed des logs d'audit EcoDeli
 * Crée l'historique d'actions administratives et utilisateur
 */
export async function seedAuditLogs(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('AUDIT_LOGS');

  const result: SeedResult = {
    entity: 'audit_logs',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier les logs existants
  const existingAuditLogs = await prisma.auditLog.count();
  const existingActivityLogs = await prisma.userActivityLog.count();

  if (existingAuditLogs + existingActivityLogs > 100 && !options.force) {
    logger.warning(
      'AUDIT_LOGS',
      `${existingAuditLogs + existingActivityLogs} logs déjà présents - utiliser force:true pour recréer`
    );
    result.skipped = existingAuditLogs + existingActivityLogs;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.auditLog.deleteMany({});
    await prisma.userActivityLog.deleteMany({});
    logger.database('NETTOYAGE', 'audit_logs + user_activity_logs', 0);
  }

  // Récupérer les utilisateurs
  const users = await prisma.user.findMany({
    select: { id: true, role: true, name: true, email: true },
  });

  if (users.length === 0) {
    logger.warning('AUDIT_LOGS', "Aucun utilisateur trouvé - créer d'abord les seeds utilisateurs");
    return result;
  }

  const admins = users.filter(user => user.role === UserRole.ADMIN);
  const allUsers = users;

  // Configuration des événements d'audit administratif
  const AUDIT_EVENTS: AuditEvent[] = [
    {
      entityType: 'User',
      action: 'CREATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 50,
    },
    {
      entityType: 'User',
      action: 'UPDATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 100,
    },
    {
      entityType: 'User',
      action: 'DELETE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'CRITICAL',
      frequency: 5,
    },
    {
      entityType: 'User',
      action: 'SUSPEND',
      targetRoles: [UserRole.ADMIN],
      criticality: 'HIGH',
      frequency: 20,
    },
    {
      entityType: 'User',
      action: 'ACTIVATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 30,
    },
    {
      entityType: 'Document',
      action: 'APPROVE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 80,
    },
    {
      entityType: 'Document',
      action: 'REJECT',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 25,
    },
    {
      entityType: 'Payment',
      action: 'REFUND',
      targetRoles: [UserRole.ADMIN],
      criticality: 'HIGH',
      frequency: 15,
    },
    {
      entityType: 'Commission',
      action: 'UPDATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'HIGH',
      frequency: 10,
    },
    {
      entityType: 'System',
      action: 'MAINTENANCE_START',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 4,
    },
    {
      entityType: 'System',
      action: 'MAINTENANCE_END',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 4,
    },
    {
      entityType: 'SecurityAlert',
      action: 'INVESTIGATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'CRITICAL',
      frequency: 8,
    },
    {
      entityType: 'Report',
      action: 'EXPORT',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 40,
    },
    {
      entityType: 'Warehouse',
      action: 'CREATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'HIGH',
      frequency: 2,
    },
    {
      entityType: 'ServiceCategory',
      action: 'UPDATE',
      targetRoles: [UserRole.ADMIN],
      criticality: 'MEDIUM',
      frequency: 6,
    },
  ];

  // Configuration des activités utilisateur
  const USER_ACTIVITIES: UserActivity[] = [
    {
      type: ActivityType.LOGIN,
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      details: ['Connexion web', 'Connexion mobile', 'Connexion tablette'],
      frequency: 1200,
    },
    {
      type: ActivityType.LOGOUT,
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      details: ['Déconnexion manuelle', 'Déconnexion automatique', 'Timeout session'],
      frequency: 800,
    },
    {
      type: ActivityType.PASSWORD_CHANGE,
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      details: ['Changement mot de passe', 'Réinitialisation mot de passe', 'Mise à jour sécurité'],
      frequency: 120,
    },
    {
      type: ActivityType.PROFILE_UPDATE,
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      details: [
        'Modification informations personnelles',
        'Mise à jour adresse',
        'Modification photo profil',
        'Changement coordonnées',
      ],
      frequency: 300,
    },
    {
      type: ActivityType.DOCUMENT_UPLOAD,
      targetRoles: [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      details: ['Upload permis conduire', 'Upload justificatif domicile', 'Upload carte identité'],
      frequency: 150,
    },
    {
      type: ActivityType.OTHER,
      targetRoles: [UserRole.CLIENT],
      details: ['Commande livraison', 'Réservation service', 'Location box'],
      frequency: 800,
    },
  ];

  let totalAuditLogs = 0;
  let totalActivityLogs = 0;

  // 1. Créer les logs d'audit administratif
  logger.info('AUDIT_LOGS', "🔒 Création des logs d'audit administratif...");

  for (const auditEvent of AUDIT_EVENTS) {
    const eventCount = Math.floor(auditEvent.frequency / 12); // Répartir sur l'année écoulée

    for (let i = 0; i < eventCount; i++) {
      try {
        const performer = getRandomElement(admins);
        if (!performer) continue;

        // Générer des changements simulés selon le type d'action
        const changes = generateAuditChanges(auditEvent.entityType, auditEvent.action);

        const auditLog = await prisma.auditLog.create({
          data: {
            entityType: auditEvent.entityType,
            entityId: faker.string.uuid(),
            action: auditEvent.action,
            performedById: performer.id,
            changes: changes,
            createdAt: faker.date.past({ years: 1 }),
          },
        });

        totalAuditLogs++;
        result.created++;

        if (options.verbose && totalAuditLogs % 50 === 0) {
          logger.progress(
            'AUDIT_LOGS',
            totalAuditLogs,
            AUDIT_EVENTS.length,
            `Logs audit créés: ${totalAuditLogs}`
          );
        }
      } catch (error: any) {
        logger.error(
          'AUDIT_LOGS',
          `❌ Erreur création audit log ${auditEvent.action}: ${error.message}`
        );
        result.errors++;
      }
    }
  }

  // 2. Créer les logs d'activité utilisateur
  logger.info('AUDIT_LOGS', "👤 Création des logs d'activité utilisateur...");

  for (const activity of USER_ACTIVITIES) {
    const activityCount = Math.floor(activity.frequency / 12); // Répartir sur l'année écoulée

    for (let i = 0; i < activityCount; i++) {
      try {
        // Sélectionner un utilisateur éligible
        const eligibleUsers = allUsers.filter(user => activity.targetRoles.includes(user.role));
        const user = getRandomElement(eligibleUsers);

        if (!user) continue;

        // Générer les détails de l'activité
        const activityDetail = getRandomElement(activity.details);
        const ipAddress = faker.internet.ip();
        const userAgent = generateUserAgent();

        const activityLog = await prisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: activity.type,
            details: activityDetail,
            ipAddress: ipAddress,
            userAgent: userAgent,
            createdAt: faker.date.past({ years: 1 }),
          },
        });

        totalActivityLogs++;
        result.created++;

        if (options.verbose && totalActivityLogs % 100 === 0) {
          logger.progress(
            'AUDIT_LOGS',
            totalActivityLogs,
            USER_ACTIVITIES.length,
            `Logs activité créés: ${totalActivityLogs}`
          );
        }
      } catch (error: any) {
        logger.error(
          'AUDIT_LOGS',
          `❌ Erreur création activity log ${activity.type}: ${error.message}`
        );
        result.errors++;
      }
    }
  }

  // Statistiques finales
  const finalAuditLogs = await prisma.auditLog.findMany({
    include: { performedBy: true },
  });

  const finalActivityLogs = await prisma.userActivityLog.findMany({
    include: { user: true },
  });

  // Distribution des logs d'audit par action
  const auditByAction = finalAuditLogs.reduce((acc: Record<string, number>, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  // Distribution des logs d'activité par type
  const activityByType = finalActivityLogs.reduce((acc: Record<string, number>, log) => {
    acc[log.activityType] = (acc[log.activityType] || 0) + 1;
    return acc;
  }, {});

  // Analyse temporelle (derniers 7 jours)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const recentAuditLogs = finalAuditLogs.filter(log => log.createdAt >= lastWeek).length;
  const recentActivityLogs = finalActivityLogs.filter(log => log.createdAt >= lastWeek).length;

  logger.info('AUDIT_LOGS', `📊 Actions admin: ${JSON.stringify(auditByAction)}`);
  logger.info('AUDIT_LOGS', `📱 Activités user: ${JSON.stringify(activityByType)}`);
  logger.info(
    'AUDIT_LOGS',
    `📅 7 derniers jours: ${recentAuditLogs} audit + ${recentActivityLogs} activité`
  );
  logger.info(
    'AUDIT_LOGS',
    `🔢 Total: ${finalAuditLogs.length} audit logs + ${finalActivityLogs.length} activity logs`
  );

  // Validation
  const totalExpected = totalAuditLogs + totalActivityLogs;
  const totalCreated = finalAuditLogs.length + finalActivityLogs.length;

  if (totalCreated >= totalExpected - result.errors) {
    logger.validation('AUDIT_LOGS', 'PASSED', `${totalCreated} logs créés avec succès`);
  } else {
    logger.validation('AUDIT_LOGS', 'FAILED', `Attendu: ${totalExpected}, Créé: ${totalCreated}`);
  }

  logger.endSeed('AUDIT_LOGS', result);
  return result;
}

/**
 * Génère des changements simulés pour les logs d'audit
 */
function generateAuditChanges(entityType: string, action: string): any {
  const baseChanges = {
    timestamp: new Date().toISOString(),
    action: action,
    entityType: entityType,
  };

  switch (`${entityType}_${action}`) {
    case 'User_CREATE':
      return {
        ...baseChanges,
        before: null,
        after: {
          email: faker.internet.email(),
          role: getRandomElement(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']),
          status: 'PENDING_VERIFICATION',
        },
      };

    case 'User_UPDATE':
      return {
        ...baseChanges,
        before: { status: 'PENDING_VERIFICATION' },
        after: { status: 'ACTIVE' },
        fields: ['status', 'emailVerified'],
      };

    case 'User_SUSPEND':
      return {
        ...baseChanges,
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED' },
        reason: faker.helpers.arrayElement([
          'Activité suspecte détectée',
          "Violation des conditions d'utilisation",
          'Plainte utilisateur',
          'Document frauduleux',
        ]),
      };

    case 'Document_APPROVE':
      return {
        ...baseChanges,
        documentType: faker.helpers.arrayElement([
          'IDENTITY_CARD',
          'DRIVING_LICENSE',
          'PROOF_OF_ADDRESS',
        ]),
        before: { status: 'PENDING' },
        after: { status: 'APPROVED' },
        reviewedBy: faker.person.fullName(),
      };

    case 'Payment_REFUND':
      return {
        ...baseChanges,
        amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
        paymentId: faker.string.uuid(),
        reason: faker.helpers.arrayElement([
          'Annulation service',
          'Erreur de paiement',
          'Remboursement commercial',
          'Litige résolu',
        ]),
      };

    case 'System_MAINTENANCE_START':
      return {
        ...baseChanges,
        maintenanceType: faker.helpers.arrayElement([
          'Mise à jour sécurité',
          'Optimisation base',
          'Nouveau déploiement',
        ]),
        estimatedDuration: `${faker.number.int({ min: 30, max: 240 })} minutes`,
        affectedServices: faker.helpers.arrayElements([
          'API',
          'Frontend',
          'Paiements',
          'Notifications',
        ]),
      };

    default:
      return {
        ...baseChanges,
        details: `Action ${action} sur ${entityType}`,
        metadata: {
          userAgent: generateUserAgent(),
          ipAddress: faker.internet.ip(),
        },
      };
  }
}

/**
 * Génère un User-Agent réaliste
 */
function generateUserAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 11; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  ];

  return getRandomElement(browsers);
}

/**
 * Valide l'intégrité des logs d'audit
 */
export async function validateAuditLogs(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', "🔍 Validation des logs d'audit...");

  let isValid = true;

  // Vérifier les logs d'audit
  const auditLogs = await prisma.auditLog.findMany({
    include: { performedBy: true },
  });

  if (auditLogs.length === 0) {
    logger.error('VALIDATION', "❌ Aucun log d'audit trouvé");
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${auditLogs.length} logs d\'audit trouvés`);
  }

  // Vérifier les logs d'activité
  const activityLogs = await prisma.userActivityLog.findMany({
    include: { user: true },
  });

  if (activityLogs.length === 0) {
    logger.error('VALIDATION', "❌ Aucun log d'activité trouvé");
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${activityLogs.length} logs d\'activité trouvés`);
  }

  // Vérifier l'intégrité des données JSON
  const auditLogsWithValidChanges = auditLogs.filter(log => {
    try {
      return log.changes && typeof log.changes === 'object';
    } catch {
      return false;
    }
  });

  if (auditLogsWithValidChanges.length === auditLogs.length) {
    logger.success('VALIDATION', "✅ Tous les logs d'audit ont des changements valides");
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${auditLogs.length - auditLogsWithValidChanges.length} logs avec changements invalides`
    );
  }

  // Vérifier les relations utilisateur
  const auditLogsWithUser = auditLogs.filter(log => log.performedBy !== null);
  const activityLogsWithUser = activityLogs.filter(log => log.user !== null);

  if (auditLogsWithUser.length === auditLogs.length) {
    logger.success('VALIDATION', "✅ Tous les logs d'audit ont un utilisateur valide");
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${auditLogs.length - auditLogsWithUser.length} logs sans utilisateur`
    );
  }

  if (activityLogsWithUser.length === activityLogs.length) {
    logger.success('VALIDATION', "✅ Tous les logs d'activité ont un utilisateur valide");
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${activityLogs.length - activityLogsWithUser.length} logs sans utilisateur`
    );
  }

  // Vérifier la distribution temporelle
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);

  const recentAuditLogs = auditLogs.filter(log => log.createdAt >= lastMonth).length;
  const recentActivityLogs = activityLogs.filter(log => log.createdAt >= lastMonth).length;

  if (recentAuditLogs > 0 && recentActivityLogs > 0) {
    logger.success(
      'VALIDATION',
      `✅ Activité récente détectée: ${recentAuditLogs} audit + ${recentActivityLogs} activité`
    );
  } else {
    logger.warning('VALIDATION', "⚠️ Pas d'activité récente détectée");
  }

  logger.success('VALIDATION', "✅ Validation des logs d'audit terminée");
  return isValid;
}
