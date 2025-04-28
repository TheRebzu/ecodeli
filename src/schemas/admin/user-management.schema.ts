import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import { ActivityType } from '@/types/admin/admin';

// Schema for filtering users in the admin interface
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
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt', 'lastActivityAt'])
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for updating a user's status
export const updateUserStatusSchema = z.object({
  userId: z.string(),
  status: z.nativeEnum(UserStatus),
  reason: z.string().optional(),
  notifyUser: z.boolean().default(true),
});

// Schema for updating a user's role
export const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole),
  reason: z.string().optional(),
  createRoleSpecificProfile: z.boolean().default(true),
});

// Schema for updating admin permissions
export const updateUserPermissionsSchema = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
});

// Schema for getting a specific user detail
export const getUserDetailSchema = z.object({
  userId: z.string(),
  includeDocuments: z.boolean().default(true),
  includeVerificationHistory: z.boolean().default(true),
  includeActivityLogs: z.boolean().default(false),
});

// Schema for user activity logs
export const userActivityLogSchema = z.object({
  userId: z.string(),
  types: z.array(z.nativeEnum(ActivityType)).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Schema for creating a user note
export const userNoteSchema = z.object({
  userId: z.string(),
  note: z.string().min(1).max(1000),
});

// Schema for adding an activity log manually
export const addUserActivityLogSchema = z.object({
  userId: z.string(),
  activityType: z.nativeEnum(ActivityType),
  details: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Schema for exporting users
export const exportUsersSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']),
  fields: z.array(z.string()),
  filters: userFiltersSchema.optional(),
});
