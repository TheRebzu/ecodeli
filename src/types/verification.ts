import { z } from 'zod';
import { UserRole } from '@prisma/client';
import {
  verificationFiltersSchema,
  getVerificationDetailSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
  listVerificationDocumentsSchema,
  verificationHistorySchema,
} from '@/schemas/verification.schema';

export type VerificationFilters = z.infer<typeof verificationFiltersSchema>;
export type GetVerificationDetail = z.infer<typeof getVerificationDetailSchema>;
export type ApproveVerification = z.infer<typeof approveVerificationSchema>;
export type RejectVerification = z.infer<typeof rejectVerificationSchema>;
export type ListVerificationDocuments = z.infer<typeof listVerificationDocumentsSchema>;
export type VerificationHistory = z.infer<typeof verificationHistorySchema>;

export interface VerificationRequest {
  id: string;
  userId: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  notes: string | null;
  documents: VerificationDocument[];
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    profileImage: string | null;
  };
}

export interface VerificationDocument {
  id: string;
  verificationId: string;
  type:
    | 'ID_CARD'
    | 'BUSINESS_LICENSE'
    | 'PASSPORT'
    | 'DRIVER_LICENSE'
    | 'PROOF_OF_ADDRESS'
    | 'OTHER';
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface VerificationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  pendingByRole: {
    [role in UserRole]?: number;
  };
}
