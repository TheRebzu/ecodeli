import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';

// Schema for filtering users in the admin interface
export const userFiltersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isVerified: z.boolean().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'])
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for updating a user's status
export const updateUserStatusSchema = z.object({
  userId: z.string(),
  status: z.nativeEnum(UserStatus),
  reason: z.string().optional(),
});

// Schema for updating a user's role
export const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole),
  reason: z.string().optional(),
});

// Schema for updating admin permissions
export const updateUserPermissionsSchema = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
});

// Schema for getting a specific user detail
export const getUserDetailSchema = z.object({
  userId: z.string(),
});

// Schema for user activity logs
export const userActivityLogSchema = z.object({
  userId: z.string(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});
