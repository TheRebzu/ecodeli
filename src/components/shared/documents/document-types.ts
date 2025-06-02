/**
 * Common types for document-related components
 */

import { DocumentType, VerificationStatus } from '@prisma/client';

export interface BaseDocument {
  id: string;
  type: DocumentType;
  status?: string;
  verificationStatus?: VerificationStatus;
  uploadedAt?: Date;
  createdAt?: Date;
  expiryDate?: Date;
  filename?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface DocumentActionProps {
  onView?: (document: BaseDocument) => void;
  onDelete?: (documentId: string) => void;
  onDownload?: (document: BaseDocument) => void;
  onApprove?: (documentId: string) => void;
  onReject?: (documentId: string, reason?: string) => void;
}

export interface DocumentCardProps extends DocumentActionProps {
  document: BaseDocument;
  showActions?: boolean;
  showStatus?: boolean;
  compact?: boolean;
}

export interface DocumentListProps extends DocumentActionProps {
  documents: BaseDocument[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  showStatus?: boolean;
  locale?: string;
  emptyMessage?: string;
}

export interface DocumentStatusBadgeProps {
  status: VerificationStatus | string | undefined;
  variant?: 'default' | 'compact';
}

export interface DocumentTypeIconProps {
  type: DocumentType;
  size?: number;
}

export interface DocumentPreviewProps {
  document: BaseDocument | null;
  onClose: () => void;
  showActions?: boolean;
  actions?: React.ReactNode;
}
