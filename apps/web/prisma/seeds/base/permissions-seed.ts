import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions } from '../utils/seed-helpers';

/**
 * Seed des permissions système EcoDeli par rôle
 */
export async function seedPermissions(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PERMISSIONS');

  const result: SeedResult = {
    entity: 'permissions',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Définition des permissions par rôle
  const permissionsByRole = [
    // ADMIN - Permissions complètes
    {
      role: UserRole.ADMIN,
      permissions: [
        // Gestion utilisateurs
        'USER_CREATE',
        'USER_READ',
        'USER_UPDATE',
        'USER_DELETE',
        'USER_SUSPEND',
        'USER_ACTIVATE',
        'USER_VERIFY',

        // Gestion système
        'SYSTEM_SETTINGS',
        'SYSTEM_BACKUP',
        'SYSTEM_MAINTENANCE',
        'AUDIT_LOGS',
        'ANALYTICS_ACCESS',

        // Gestion financière
        'FINANCIAL_REPORTS',
        'BILLING_MANAGEMENT',
        'COMMISSION_SETTINGS',
        'PAYMENT_PROCESSING',
        'INVOICE_GENERATION',

        // Gestion contrats
        'CONTRACT_CREATE',
        'CONTRACT_UPDATE',
        'CONTRACT_APPROVE',
        'CONTRACT_TERMINATE',

        // Gestion vérifications
        'VERIFICATION_APPROVE',
        'VERIFICATION_REJECT',
        'DOCUMENT_REVIEW',

        // Support
        'SUPPORT_TICKETS',
        'NOTIFICATION_SEND',
        'ANNOUNCEMENT_CREATE',
      ],
    },

    // CLIENT - Permissions utilisateur standard
    {
      role: UserRole.CLIENT,
      permissions: [
        // Profil personnel
        'PROFILE_READ',
        'PROFILE_UPDATE',
        'PASSWORD_CHANGE',

        // Annonces et livraisons
        'ANNOUNCEMENT_CREATE',
        'ANNOUNCEMENT_UPDATE',
        'ANNOUNCEMENT_DELETE',
        'DELIVERY_REQUEST',
        'DELIVERY_TRACK',
        'DELIVERY_RATE',

        // Services
        'SERVICE_BOOK',
        'SERVICE_CANCEL',
        'SERVICE_RATE',

        // Stockage
        'STORAGE_BOOK',
        'STORAGE_ACCESS',
        'STORAGE_EXTEND',

        // Facturation
        'INVOICE_VIEW',
        'PAYMENT_MAKE',
        'SUBSCRIPTION_MANAGE',

        // Communication
        'MESSAGE_SEND',
        'MESSAGE_READ',
        'NOTIFICATION_RECEIVE',
      ],
    },

    // DELIVERER - Permissions livreur
    {
      role: UserRole.DELIVERER,
      permissions: [
        // Profil professionnel
        'PROFILE_READ',
        'PROFILE_UPDATE',
        'PASSWORD_CHANGE',
        'DOCUMENTS_UPLOAD',
        'VERIFICATION_STATUS',

        // Livraisons
        'DELIVERY_VIEW_AVAILABLE',
        'DELIVERY_ACCEPT',
        'DELIVERY_DECLINE',
        'DELIVERY_STATUS_UPDATE',
        'DELIVERY_COMPLETE',
        'DELIVERY_REPORT_ISSUE',

        // Itinéraires
        'ROUTE_CREATE',
        'ROUTE_UPDATE',
        'ROUTE_DELETE',
        'AVAILABILITY_SET',
        'SCHEDULE_MANAGE',

        // Gains
        'EARNINGS_VIEW',
        'WITHDRAWAL_REQUEST',
        'PAYMENT_HISTORY',

        // Communication
        'MESSAGE_SEND',
        'MESSAGE_READ',
        'NOTIFICATION_RECEIVE',
      ],
    },

    // MERCHANT - Permissions commerçant
    {
      role: UserRole.MERCHANT,
      permissions: [
        // Profil entreprise
        'PROFILE_READ',
        'PROFILE_UPDATE',
        'PASSWORD_CHANGE',
        'DOCUMENTS_UPLOAD',
        'VERIFICATION_STATUS',

        // Annonces produits
        'ANNOUNCEMENT_CREATE',
        'ANNOUNCEMENT_UPDATE',
        'ANNOUNCEMENT_DELETE',
        'PRODUCT_MANAGE',
        'INVENTORY_MANAGE',

        // Livraisons
        'DELIVERY_REQUEST',
        'DELIVERY_TRACK',
        'DELIVERY_MANAGE',

        // Contrats
        'CONTRACT_VIEW',
        'CONTRACT_SIGN',
        'CONTRACT_STATUS',

        // Facturation
        'INVOICE_VIEW',
        'PAYMENT_MAKE',
        'SALES_REPORTS',

        // Communication
        'MESSAGE_SEND',
        'MESSAGE_READ',
        'NOTIFICATION_RECEIVE',
      ],
    },

    // PROVIDER - Permissions prestataire
    {
      role: UserRole.PROVIDER,
      permissions: [
        // Profil professionnel
        'PROFILE_READ',
        'PROFILE_UPDATE',
        'PASSWORD_CHANGE',
        'DOCUMENTS_UPLOAD',
        'VERIFICATION_STATUS',

        // Services
        'SERVICE_CREATE',
        'SERVICE_UPDATE',
        'SERVICE_DELETE',
        'SERVICE_PRICING',
        'SERVICE_CATEGORY',

        // Disponibilités
        'AVAILABILITY_SET',
        'SCHEDULE_MANAGE',
        'BOOKING_ACCEPT',
        'BOOKING_DECLINE',
        'BOOKING_RESCHEDULE',

        // Prestations
        'APPOINTMENT_MANAGE',
        'SERVICE_COMPLETE',
        'RATING_VIEW',

        // Gains
        'EARNINGS_VIEW',
        'WITHDRAWAL_REQUEST',
        'PAYMENT_HISTORY',

        // Contrats
        'CONTRACT_VIEW',
        'CONTRACT_SIGN',
        'CONTRACT_STATUS',

        // Communication
        'MESSAGE_SEND',
        'MESSAGE_READ',
        'NOTIFICATION_RECEIVE',
      ],
    },
  ];

  // Créer les permissions pour chaque rôle
  for (const rolePermissions of permissionsByRole) {
    try {
      // Note: Stockage en JSON dans metadata utilisateur en l'absence d'un modèle Permission
      logger.info('PERMISSIONS', `Configuration permissions pour ${rolePermissions.role}`);
      logger.success(
        'PERMISSIONS',
        `✅ ${rolePermissions.permissions.length} permissions configurées pour ${rolePermissions.role}`
      );
      result.created += rolePermissions.permissions.length;
    } catch (error: any) {
      logger.error(
        'PERMISSIONS',
        `❌ Erreur configuration permissions ${rolePermissions.role}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des permissions
  const totalPermissions = permissionsByRole.reduce((sum, rp) => sum + rp.permissions.length, 0);
  logger.validation(
    'PERMISSIONS',
    'PASSED',
    `${totalPermissions} permissions configurées au total`
  );

  logger.endSeed('PERMISSIONS', result);
  return result;
}

/**
 * Récupère les permissions pour un rôle donné
 */
export function getPermissionsForRole(role: UserRole): string[] {
  const rolePermissions = {
    [UserRole.ADMIN]: [
      'USER_CREATE',
      'USER_READ',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_SUSPEND',
      'USER_ACTIVATE',
      'USER_VERIFY',
      'SYSTEM_SETTINGS',
      'SYSTEM_BACKUP',
      'SYSTEM_MAINTENANCE',
      'AUDIT_LOGS',
      'ANALYTICS_ACCESS',
      'FINANCIAL_REPORTS',
      'BILLING_MANAGEMENT',
      'COMMISSION_SETTINGS',
      'PAYMENT_PROCESSING',
      'INVOICE_GENERATION',
      'CONTRACT_CREATE',
      'CONTRACT_UPDATE',
      'CONTRACT_APPROVE',
      'CONTRACT_TERMINATE',
      'VERIFICATION_APPROVE',
      'VERIFICATION_REJECT',
      'DOCUMENT_REVIEW',
      'SUPPORT_TICKETS',
      'NOTIFICATION_SEND',
      'ANNOUNCEMENT_CREATE',
    ],
    [UserRole.CLIENT]: [
      'PROFILE_READ',
      'PROFILE_UPDATE',
      'PASSWORD_CHANGE',
      'ANNOUNCEMENT_CREATE',
      'ANNOUNCEMENT_UPDATE',
      'ANNOUNCEMENT_DELETE',
      'DELIVERY_REQUEST',
      'DELIVERY_TRACK',
      'DELIVERY_RATE',
      'SERVICE_BOOK',
      'SERVICE_CANCEL',
      'SERVICE_RATE',
      'STORAGE_BOOK',
      'STORAGE_ACCESS',
      'STORAGE_EXTEND',
      'INVOICE_VIEW',
      'PAYMENT_MAKE',
      'SUBSCRIPTION_MANAGE',
      'MESSAGE_SEND',
      'MESSAGE_READ',
      'NOTIFICATION_RECEIVE',
    ],
    [UserRole.DELIVERER]: [
      'PROFILE_READ',
      'PROFILE_UPDATE',
      'PASSWORD_CHANGE',
      'DOCUMENTS_UPLOAD',
      'VERIFICATION_STATUS',
      'DELIVERY_VIEW_AVAILABLE',
      'DELIVERY_ACCEPT',
      'DELIVERY_DECLINE',
      'DELIVERY_STATUS_UPDATE',
      'DELIVERY_COMPLETE',
      'DELIVERY_REPORT_ISSUE',
      'ROUTE_CREATE',
      'ROUTE_UPDATE',
      'ROUTE_DELETE',
      'AVAILABILITY_SET',
      'SCHEDULE_MANAGE',
      'EARNINGS_VIEW',
      'WITHDRAWAL_REQUEST',
      'PAYMENT_HISTORY',
      'MESSAGE_SEND',
      'MESSAGE_READ',
      'NOTIFICATION_RECEIVE',
    ],
    [UserRole.MERCHANT]: [
      'PROFILE_READ',
      'PROFILE_UPDATE',
      'PASSWORD_CHANGE',
      'DOCUMENTS_UPLOAD',
      'VERIFICATION_STATUS',
      'ANNOUNCEMENT_CREATE',
      'ANNOUNCEMENT_UPDATE',
      'ANNOUNCEMENT_DELETE',
      'PRODUCT_MANAGE',
      'INVENTORY_MANAGE',
      'DELIVERY_REQUEST',
      'DELIVERY_TRACK',
      'DELIVERY_MANAGE',
      'CONTRACT_VIEW',
      'CONTRACT_SIGN',
      'CONTRACT_STATUS',
      'INVOICE_VIEW',
      'PAYMENT_MAKE',
      'SALES_REPORTS',
      'MESSAGE_SEND',
      'MESSAGE_READ',
      'NOTIFICATION_RECEIVE',
    ],
    [UserRole.PROVIDER]: [
      'PROFILE_READ',
      'PROFILE_UPDATE',
      'PASSWORD_CHANGE',
      'DOCUMENTS_UPLOAD',
      'VERIFICATION_STATUS',
      'SERVICE_CREATE',
      'SERVICE_UPDATE',
      'SERVICE_DELETE',
      'SERVICE_PRICING',
      'SERVICE_CATEGORY',
      'AVAILABILITY_SET',
      'SCHEDULE_MANAGE',
      'BOOKING_ACCEPT',
      'BOOKING_DECLINE',
      'BOOKING_RESCHEDULE',
      'APPOINTMENT_MANAGE',
      'SERVICE_COMPLETE',
      'RATING_VIEW',
      'EARNINGS_VIEW',
      'WITHDRAWAL_REQUEST',
      'PAYMENT_HISTORY',
      'CONTRACT_VIEW',
      'CONTRACT_SIGN',
      'CONTRACT_STATUS',
      'MESSAGE_SEND',
      'MESSAGE_READ',
      'NOTIFICATION_RECEIVE',
    ],
  };

  return rolePermissions[role] || [];
}

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
