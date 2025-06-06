import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import { ActivityType } from '@/types/actors/admin';

// Schema pour filtrer les utilisateurs dans l'interface d'administration
export const userFiltersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isVerified: z.boolean().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  hasDocuments: z.boolean().optional(),
  hasPendingVerifications: z.boolean().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  lastLoginFrom: z.coerce.date().optional(),
  lastLoginTo: z.coerce.date().optional(),
  lastActivityFrom: z.coerce.date().optional(),
  lastActivityTo: z.coerce.date().optional(),
  documentType: z.string().optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  subscriptionStatus: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum([
      'name',
      'email',
      'role',
      'status',
      'createdAt',
      'lastLoginAt',
      'lastActivityAt',
      'documentsCount',
      'isVerified',
      'country',
      'subscriptionStatus',
    ])
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Schema pour mettre à jour le statut d'un utilisateur
export const updateUserStatusSchema = z.object({
  userId: z.string(),
  status: z.nativeEnum(UserStatus),
  reason: z.string().optional(),
  notifyUser: z.boolean().default(true),
  expiresAt: z.coerce.date().optional(), // Pour les suspensions temporaires
  sendEmail: z.boolean().default(true),
  emailTemplate: z.string().optional(),
  customEmailSubject: z.string().optional(),
  customEmailContent: z.string().optional(),
});

// Schema pour mettre à jour le rôle d'un utilisateur
export const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole),
  reason: z.string().optional(),
  createRoleSpecificProfile: z.boolean().default(true),
  transferExistingData: z.boolean().default(false), // Pour transférer les données d'un rôle à l'autre
  maintainAccessToOldRoleData: z.boolean().default(false),
  notifyUser: z.boolean().default(true),
});

// Schema pour mettre à jour les permissions d'un administrateur
export const updateUserPermissionsSchema = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
  expiresAt: z.coerce.date().optional(), // Pour les permissions temporaires
  permissionGroups: z.array(z.string()).optional(), // Groupes de permissions prédéfinis
  restrictToIpAddresses: z.array(z.string()).optional(), // Restreindre les permissions à des adresses IP spécifiques
  notifyUser: z.boolean().default(true),
});

// Schema pour récupérer le détail d'un utilisateur spécifique
export const getUserDetailSchema = z.object({
  userId: z.string(),
  includeDocuments: z.boolean().default(true),
  includeVerificationHistory: z.boolean().default(true),
  includeActivityLogs: z.boolean().default(false),
  includeLoginHistory: z.boolean().default(false),
  includeNotes: z.boolean().default(false),
  includePermissions: z.boolean().default(false),
  includeSubscriptions: z.boolean().default(false),
  includePaymentMethods: z.boolean().default(false),
  includeNotificationSettings: z.boolean().default(false),
});

// Schema pour les journaux d'activité utilisateur
export const userActivityLogSchema = z.object({
  userId: z.string(),
  types: z.array(z.nativeEnum(ActivityType)).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  includeDetails: z.boolean().default(false),
  ipAddress: z.string().optional(),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  searchTerm: z.string().optional(),
});

// Schema pour créer une note utilisateur
export const userNoteSchema = z.object({
  userId: z.string(),
  note: z.string().min(1).max(1000),
  category: z
    .enum(['GENERAL', 'SUPPORT', 'VERIFICATION', 'BILLING', 'SECURITY'])
    .default('GENERAL'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'ADMIN_ONLY']).default('ADMIN_ONLY'),
  pinned: z.boolean().default(false),
  reminderDate: z.coerce.date().optional(),
});

// Schema pour ajouter manuellement un journal d'activité
export const addUserActivityLogSchema = z.object({
  userId: z.string(),
  activityType: z.nativeEnum(ActivityType),
  details: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  relatedEntityId: z.string().optional(), // ID d'une entité liée (ex: document, paiement)
  relatedEntityType: z.string().optional(), // Type d'entité liée
});

// Schema pour exporter les utilisateurs
export const exportUsersSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf', 'json']),
  fields: z.array(z.string()),
  filters: userFiltersSchema.optional(),
  includeSensitiveData: z.boolean().default(false), // Pour les exports avec données sensibles
  encryptionPassword: z.string().optional(), // Pour chiffrer les exports sensibles
  includeHeaders: z.boolean().default(true),
  dateFormat: z.string().optional(),
  fileName: z.string().optional(),
});

// Schema pour la réinitialisation forcée du mot de passe
export const forcePasswordResetSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
  notifyUser: z.boolean().default(true),
  expireExistingTokens: z.boolean().default(true),
  expiresIn: z.number().default(24 * 60 * 60), // Délai d'expiration en secondes (24h par défaut)
  requireStrongPassword: z.boolean().default(true),
  blockLoginUntilReset: z.boolean().default(false),
});

// Schema pour les actions en masse sur les utilisateurs
export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1),
  action: z.enum([
    'ACTIVATE',
    'DEACTIVATE',
    'SUSPEND',
    'FORCE_PASSWORD_RESET',
    'SEND_VERIFICATION_EMAIL',
    'DELETE',
    'ADD_TAG',
    'REMOVE_TAG',
    'ASSIGN_ROLE',
    'ASSIGN_PERMISSION',
    'REVOKE_PERMISSION',
    'SEND_NOTIFICATION',
    'EXPORT_DATA',
  ]),
  reason: z.string().optional(),
  notifyUsers: z.boolean().default(true),
  additionalData: z.record(z.string(), z.any()).optional(),
  scheduledFor: z.coerce.date().optional(), // Pour les actions programmées
  confirmationCode: z.string().optional(), // Code de confirmation pour les actions critiques
});

// Schema pour les filtres de logs d'audit
export const auditLogFiltersSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  performedById: z.string().optional(),
  action: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['SUCCESS', 'FAILURE', 'ATTEMPTED']).optional(),
  ipAddress: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Schema pour les paramètres de notification utilisateur
export const userNotificationSettingsSchema = z.object({
  userId: z.string(),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  marketingEmails: z.boolean().default(false),
  securityAlerts: z.boolean().default(true),
  loginAlerts: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  weeklyDigest: z.boolean().default(true),
  notificationCategories: z.array(z.string()).optional(),
});

// Schema pour envoyer une notification manuelle
export const sendUserNotificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(1000),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).default('INFO'),
  channel: z.enum(['EMAIL', 'PUSH', 'SMS', 'IN_APP']).default('EMAIL'),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(30).optional(),
  attachmentUrl: z.string().url().optional(),
  deliverAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  requiresConfirmation: z.boolean().default(false),
});

// Schema pour gérer les périphériques connectés de l'utilisateur
export const userDevicesSchema = z.object({
  userId: z.string(),
  action: z.enum(['LIST', 'REVOKE', 'REVOKE_ALL', 'SEND_VERIFICATION']),
  deviceId: z.string().optional(), // Pour l'action sur un appareil spécifique
  notifyUser: z.boolean().default(true),
});

// Schema pour les statistiques utilisateur avancées
export const userStatsAdvancedSchema = z.object({
  period: z.enum(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
  compareWithPrevious: z.boolean().default(true),
  breakdownByRole: z.boolean().default(true),
  breakdownByStatus: z.boolean().default(true),
  breakdownByCountry: z.boolean().default(false),
  includeRetentionRate: z.boolean().default(true),
  includeChurnRate: z.boolean().default(true),
  includeGrowthRate: z.boolean().default(true),
  includeConversionRates: z.boolean().default(false),
  customMetrics: z.array(z.string()).optional(),
});

// Types d'exportation avec typage Typescript
export type UserFiltersSchemaType = z.infer<typeof userFiltersSchema>;
export type UpdateUserStatusSchemaType = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleSchemaType = z.infer<typeof updateUserRoleSchema>;
export type UserNoteSchemaType = z.infer<typeof userNoteSchema>;
export type ExportUsersSchemaType = z.infer<typeof exportUsersSchema>;
export type BulkUserActionSchemaType = z.infer<typeof bulkUserActionSchema>;
export type UserNotificationSettingsSchemaType = z.infer<typeof userNotificationSettingsSchema>;
export type SendUserNotificationSchemaType = z.infer<typeof sendUserNotificationSchema>;
export type UserDevicesSchemaType = z.infer<typeof userDevicesSchema>;
export type UserStatsAdvancedSchemaType = z.infer<typeof userStatsAdvancedSchema>;
