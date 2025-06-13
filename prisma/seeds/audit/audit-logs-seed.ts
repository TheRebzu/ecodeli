import { PrismaClient, UserRole, ActivityType } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir un événement d'audit
 */
interface AuditEvent {
  entityType: string;
  action: string;
  targetRoles: UserRole[];
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
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
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("AUDIT_LOGS");

  const result: SeedResult = {
    entity: "audit_logs",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // TODO: Implémenter le seed des logs d'audit
  logger.info("AUDIT_LOGS", "⚠️ Seed temporairement désactivé");

  logger.endSeed("AUDIT_LOGS", result);
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
    case "User_CREATE":
      return {
        ...baseChanges,
        before: null,
        after: {
          email: faker.internet.email(),
          role: getRandomElement([
            "CLIENT",
            "DELIVERER",
            "MERCHANT",
            "PROVIDER",
          ]),
          status: "PENDING_VERIFICATION",
        },
      };

    case "User_UPDATE":
      return {
        ...baseChanges,
        before: { status: "PENDING_VERIFICATION" },
        after: { status: "ACTIVE" },
        fields: ["status", "emailVerified"],
      };

    case "User_SUSPEND":
      return {
        ...baseChanges,
        before: { status: "ACTIVE" },
        after: { status: "SUSPENDED" },
        reason: faker.helpers.arrayElement([
          "Activité suspecte détectée",
          "Violation des conditions d'utilisation",
          "Plainte utilisateur",
          "Document frauduleux",
        ]),
      };

    case "Document_APPROVE":
      return {
        ...baseChanges,
        documentType: faker.helpers.arrayElement([
          "IDENTITY_CARD",
          "DRIVING_LICENSE",
          "PROOF_OF_ADDRESS",
        ]),
        before: { status: "PENDING" },
        after: { status: "APPROVED" },
        reviewedBy: faker.person.fullName(),
      };

    case "Payment_REFUND":
      return {
        ...baseChanges,
        amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
        paymentId: faker.string.uuid(),
        reason: faker.helpers.arrayElement([
          "Annulation service",
          "Erreur de paiement",
          "Remboursement commercial",
          "Litige résolu",
        ]),
      };

    case "System_MAINTENANCE_START":
      return {
        ...baseChanges,
        maintenanceType: faker.helpers.arrayElement([
          "Mise à jour sécurité",
          "Optimisation base",
          "Nouveau déploiement",
        ]),
        estimatedDuration: `${faker.number.int({ min: 30, max: 240 })} minutes`,
        affectedServices: faker.helpers.arrayElements([
          "API",
          "Frontend",
          "Paiements",
          "Notifications",
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Android 11; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0",
    "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  ];

  return getRandomElement(browsers);
}

/**
 * Valide l'intégrité des logs d'audit
 */
export async function validateAuditLogs(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des logs d'audit...");

  let isValid = true;

  // Vérifier les logs d'audit
  const auditLogs = await prisma.auditLog.findMany({
    include: { performedBy: true },
  });

  if (auditLogs.length === 0) {
    logger.error("VALIDATION", "❌ Aucun log d'audit trouvé");
    isValid = false;
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${auditLogs.length} logs d\'audit trouvés`,
    );
  }

  // Vérifier les logs d'activité
  const activityLogs = await prisma.userActivityLog.findMany({
    include: { user: true },
  });

  if (activityLogs.length === 0) {
    logger.error("VALIDATION", "❌ Aucun log d'activité trouvé");
    isValid = false;
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${activityLogs.length} logs d\'activité trouvés`,
    );
  }

  // Vérifier l'intégrité des données JSON
  const auditLogsWithValidChanges = auditLogs.filter((log) => {
    try {
      return log.changes && typeof log.changes === "object";
    } catch {
      return false;
    }
  });

  if (auditLogsWithValidChanges.length === auditLogs.length) {
    logger.success(
      "VALIDATION",
      "✅ Tous les logs d'audit ont des changements valides",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${auditLogs.length - auditLogsWithValidChanges.length} logs avec changements invalides`,
    );
  }

  // Vérifier les relations utilisateur
  const auditLogsWithUser = auditLogs.filter((log) => log.performedBy !== null);
  const activityLogsWithUser = activityLogs.filter((log) => log.user !== null);

  if (auditLogsWithUser.length === auditLogs.length) {
    logger.success(
      "VALIDATION",
      "✅ Tous les logs d'audit ont un utilisateur valide",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${auditLogs.length - auditLogsWithUser.length} logs sans utilisateur`,
    );
  }

  if (activityLogsWithUser.length === activityLogs.length) {
    logger.success(
      "VALIDATION",
      "✅ Tous les logs d'activité ont un utilisateur valide",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${activityLogs.length - activityLogsWithUser.length} logs sans utilisateur`,
    );
  }

  // Vérifier la distribution temporelle
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);

  const recentAuditLogs = auditLogs.filter(
    (log) => log.createdAt >= lastMonth,
  ).length;
  const recentActivityLogs = activityLogs.filter(
    (log) => log.createdAt >= lastMonth,
  ).length;

  if (recentAuditLogs > 0 && recentActivityLogs > 0) {
    logger.success(
      "VALIDATION",
      `✅ Activité récente détectée: ${recentAuditLogs} audit + ${recentActivityLogs} activité`,
    );
  } else {
    logger.warning("VALIDATION", "⚠️ Pas d'activité récente détectée");
  }

  logger.success("VALIDATION", "✅ Validation des logs d'audit terminée");
  return isValid;
}
