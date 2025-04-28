import { User, UserRole, UserStatus } from '@prisma/client';

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
  OTHER = 'OTHER',
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
};

export type UserSortOptions = {
  field: 'name' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt' | 'lastActivityAt';
  direction: 'asc' | 'desc';
};

export type AdminPermission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage'
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
  | 'system.settings';

export type UserActivityLogItem = {
  id: string;
  activityType: ActivityType;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
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
};

export type UserExportOptions = {
  format: 'csv' | 'excel' | 'pdf';
  fields: string[];
  filters: UserFilters;
};
