import { User as PrismaUser, UserRole as PrismaUserRole, UserStatus as PrismaUserStatus } from '@prisma/client';

// Ré-exporter les types
export type User = PrismaUser;
export type UserRole = PrismaUserRole;
export type UserStatus = PrismaUserStatus;

// Define ActivityType enum locally if not exported from prisma client
export enum ActivityType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  VERIFICATION_SUBMIT = 'VERIFICATION_SUBMIT',
  VERIFICATION_REVIEW = 'VERIFICATION_REVIEW',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  ACCOUNT_CREATION = 'ACCOUNT_CREATION',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PHONE_VERIFIED = 'PHONE_VERIFIED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  FAILED_LOGIN_ATTEMPT = 'FAILED_LOGIN_ATTEMPT',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  SUBSCRIPTION_CHANGE = 'SUBSCRIPTION_CHANGE',
  PAYMENT_METHOD_ADDED = 'PAYMENT_METHOD_ADDED',
  OTHER = 'OTHER',
}

export enum UserActionType {
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  SUSPEND = 'SUSPEND',
  FORCE_PASSWORD_RESET = 'FORCE_PASSWORD_RESET',
  SEND_VERIFICATION_EMAIL = 'SEND_VERIFICATION_EMAIL',
  DELETE = 'DELETE',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  ASSIGN_ROLE = 'ASSIGN_ROLE',
  ASSIGN_PERMISSION = 'ASSIGN_PERMISSION',
  REVOKE_PERMISSION = 'REVOKE_PERMISSION',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  EXPORT_DATA = 'EXPORT_DATA',
}

export enum NoteCategory {
  GENERAL = 'GENERAL',
  SUPPORT = 'SUPPORT',
  VERIFICATION = 'VERIFICATION',
  BILLING = 'BILLING',
  SECURITY = 'SECURITY',
}

export enum NoteVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  ADMIN_ONLY = 'ADMIN_ONLY',
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

export enum AuditLogSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AuditLogStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ATTEMPTED = 'ATTEMPTED',
}

export type UserWithRoleDetails = User & {
  client?: { id: string };
  deliverer?: {
    id: string;
    isVerified: boolean;
    address?: string;
    phone?: string;
    vehicleType?: string;
    licensePlate?: string;
    maxCapacity?: number;
    rating?: number;
  };
  merchant?: {
    id: string;
    isVerified: boolean;
    companyName?: string;
    address?: string;
    businessType?: string;
    vatNumber?: string;
  };
  provider?: {
    id: string;
    isVerified: boolean;
    companyName?: string;
    services?: Array<{ id: string; name: string }>;
  };
  admin?: { id: string; permissions: string[] };
  documents?: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: Date;
    verifiedAt?: Date;
    verifiedBy?: {
      id: string;
      name: string;
    };
  }>;
  verificationHistory?: Array<{
    id: string;
    status: string;
    timestamp: Date;
    verifiedBy?: {
      id: string;
      name: string;
    };
    reason?: string;
  }>;
  activityLogs?: UserActivityLogItem[];
  notes?: UserNoteItem[];
  loginHistory?: UserLoginHistoryItem[];
  tags?: string[];
  permissions?: string[];
  subscription?: {
    id: string;
    plan: string;
    status: string;
    startDate: Date;
    endDate?: Date;
  };
  devices?: UserDeviceItem[];
  notificationSettings?: UserNotificationSettings;
  paymentMethods?: Array<UserPaymentMethodItem>;
  twoFactorEnabled?: boolean;
  securityQuestions?: Array<{ question: string; isAnswered: boolean }>;
  lastPasswordChange?: Date;
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
  isVerified: boolean;
  phoneNumber?: string;
  // Additional summary fields
  documentsCount?: number;
  pendingVerificationsCount?: number;
  lastActivityAt?: Date;
  tags?: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
  subscriptionStatus?: string;
  country?: string;
  city?: string;
  twoFactorEnabled?: boolean;
  hasOutstandingInvoices?: boolean;
};

export type UserFilters = {
  role?: UserRole;
  status?: UserStatus;
  isVerified?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasDocuments?: boolean;
  hasPendingVerifications?: boolean;
  country?: string;
  city?: string;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
  lastActivityFrom?: Date;
  lastActivityTo?: Date;
  documentType?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  tags?: string[];
  subscriptionStatus?: string;
  hasTwoFactorEnabled?: boolean;
};

export type UserSortOptions = {
  field: 'name' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt' | 'lastActivityAt' | 'documentsCount' | 'isVerified' | 'country' | 'subscriptionStatus';
  direction: 'asc' | 'desc';
};

export type AdminPermission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage'
  | 'users.bulk_actions'
  | 'users.export'
  | 'users.permissions'
  | 'verifications.view'
  | 'verifications.approve'
  | 'contracts.view'
  | 'contracts.manage'
  | 'finances.view'
  | 'finances.manage'
  | 'warehouses.view'
  | 'warehouses.manage'
  | 'reports.view'
  | 'reports.export'
  | 'system.settings'
  | 'roles.manage'
  | 'permissions.manage'
  | 'audit.view'
  | 'notifications.manage'
  | 'security.manage';

export type UserActivityLogItem = {
  id: string;
  activityType: ActivityType;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  importance?: 'LOW' | 'MEDIUM' | 'HIGH';
  relatedEntityId?: string;
  relatedEntityType?: string;
  performedById?: string;
  performedBy?: {
    id: string;
    name: string;
  };
};

export type UserLoginHistoryItem = {
  id: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  country?: string;
  city?: string;
  success: boolean;
  failureReason?: string;
  deviceId?: string;
  deviceName?: string;
  browserInfo?: string;
  operatingSystem?: string;
};

export type UserNoteItem = {
  id: string;
  note: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
  category: NoteCategory;
  visibility: NoteVisibility;
  updatedAt?: Date;
  updatedBy?: {
    id: string;
    name: string;
  };
  pinned?: boolean;
  reminderDate?: Date;
};

export type UserDeviceItem = {
  id: string;
  deviceName: string;
  deviceType: string;
  os: string;
  browser: string;
  lastUsed: Date;
  ipAddress?: string;
  location?: string;
  isCurrent: boolean;
  isTrusted: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
};

export type UserNotificationSettings = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  loginAlerts: boolean;
  paymentAlerts: boolean;
  weeklyDigest: boolean;
  notificationCategories?: string[];
};

export type UserPaymentMethodItem = {
  id: string;
  type: string;
  last4?: string;
  expiryDate?: string;
  isDefault: boolean;
  addedAt: Date;
  country?: string;
  brand?: string;
  name?: string;
};

export type UserNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  requiresConfirmation?: boolean;
  isConfirmed?: boolean;
};

export type AuditLogItem = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: {
    id: string;
    name: string;
  };
  changes?: Record<string, { old: unknown; new: unknown }>;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditLogSeverity;
  status?: AuditLogStatus;
  details?: string;
};

export type UserStatsData = {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
  usersByVerification: {
    verified: number;
    unverified: number;
  };
  topCountries?: Array<{ country: string; count: number }>;
  registrationsOverTime?: Array<{ date: string; count: number }>;
  activeUsersOverTime?: Array<{ date: string; count: number }>;
  loginsByDevice?: Array<{ device: string; count: number }>;
  userRetentionRate?: number;
  averageSessionDuration?: number;
};

export type UserAdvancedStatsData = UserStatsData & {
  churnRate?: number;
  growthRate?: number;
  retentionRateByPeriod?: Array<{ period: string; rate: number }>;
  conversionRates?: Record<string, number>;
  roleDistributionTrend?: Array<{ date: string; role: UserRole; count: number }>;
  statusDistributionTrend?: Array<{ date: string; status: UserStatus; count: number }>;
  prevPeriodComparison?: {
    totalUsersDiff: number;
    newUsersDiff: number;
    activeUsersDiff: number;
    churnRateDiff?: number;
  };
  averageTimeToVerification?: number;
  abandonmentRate?: number;
  customMetrics?: Record<string, number>;
};

export type UserExportOptions = {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  fields: string[];
  filters: UserFilters;
  includeSensitiveData?: boolean;
  encryptionPassword?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  fileName?: string;
};

export type BulkUserActionOptions = {
  userIds: string[];
  action: UserActionType;
  reason?: string;
  notifyUsers?: boolean;
  additionalData?: Record<string, any>;
  scheduledFor?: Date;
  confirmationCode?: string;
};

export type ForcePasswordResetOptions = {
  userId: string;
  reason?: string;
  notifyUser?: boolean;
  expireExistingTokens?: boolean;
  expiresIn?: number;
  requireStrongPassword?: boolean;
  blockLoginUntilReset?: boolean;
};

export type SendUserNotificationOptions = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  actionUrl?: string;
  actionLabel?: string;
  attachmentUrl?: string;
  deliverAt?: Date;
  expiresAt?: Date;
  requiresConfirmation?: boolean;
};

export type UserDevicesOptions = {
  userId: string;
  action: 'LIST' | 'REVOKE' | 'REVOKE_ALL' | 'SEND_VERIFICATION';
  deviceId?: string;
  notifyUser?: boolean;
};

export type AuditLogFilters = {
  entityType?: string;
  entityId?: string;
  performedById?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
  severity?: AuditLogSeverity;
  status?: AuditLogStatus;
  ipAddress?: string;
};

export type UserPermissionGroup = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isPreDefined: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
};
