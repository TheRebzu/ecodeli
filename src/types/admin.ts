import { User, UserRole, UserStatus } from '@prisma/client';

export type UserWithRoleDetails = User & {
  client?: { id: string };
  deliverer?: { id: string; isVerified: boolean };
  merchant?: { id: string; isVerified: boolean };
  provider?: { id: string; isVerified: boolean };
  admin?: { id: string; permissions: string[] };
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
};

export type UserFilters = {
  role?: UserRole;
  status?: UserStatus;
  isVerified?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type UserSortOptions = {
  field: 'name' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  direction: 'asc' | 'desc';
};

export type AdminPermission =
  | 'users.view'
  | 'users.manage'
  | 'verifications.view'
  | 'verifications.approve'
  | 'contracts.view'
  | 'contracts.manage'
  | 'finances.view'
  | 'finances.manage'
  | 'warehouses.view'
  | 'warehouses.manage';
