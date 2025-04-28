import { z } from 'zod';
import { UserRole } from '@prisma/client';

// Schema for filtering verification requests in the admin interface
export const verificationFiltersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for getting a specific verification request detail
export const getVerificationDetailSchema = z.object({
  verificationId: z.string(),
});

// Schema for approving a verification request
export const approveVerificationSchema = z.object({
  verificationId: z.string(),
  notes: z.string().optional(),
});

// Schema for rejecting a verification request
export const rejectVerificationSchema = z.object({
  verificationId: z.string(),
  reason: z.string(),
});

// Schema for listing verification documents
export const listVerificationDocumentsSchema = z.object({
  userId: z.string(),
});

// Schema for verification history (past verification attempts)
export const verificationHistorySchema = z.object({
  userId: z.string(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});
