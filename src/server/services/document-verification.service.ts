/**
 * Service that coordinates document verification workflows
 * Acts as a bridge between documents and user verification systems
 */
import { db } from '@/server/db';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { DocumentService } from './document.service';
import { VerificationService } from './verification.service';
import {
  Document,
  DocumentStatus,
  DocumentType,
  UserDocumentStatus,
  DocumentVerificationRelationship,
} from '@/types/document-verification';

export class DocumentVerificationService implements DocumentVerificationRelationship {
  private prisma: PrismaClient;
  private documentService: DocumentService;
  private verificationService: VerificationService;

  constructor(
    documentService?: DocumentService,
    verificationService?: VerificationService,
    prisma = db
  ) {
    this.prisma = prisma;
    this.documentService = documentService || new DocumentService();
    this.verificationService = verificationService || new VerificationService();
  }

  /**
   * Get the required document types for a specific user role
   * @param role - User role
   * @returns Array of required document types
   */
  getRequiredDocumentsByRole(role: UserRole): DocumentType[] {
    const roleDocumentMap: Record<UserRole, DocumentType[]> = {
      ADMIN: [DocumentType.ID_CARD],
      DELIVERER: [
        DocumentType.ID_CARD,
        DocumentType.DRIVER_LICENSE,
        DocumentType.VEHICLE_REGISTRATION,
        DocumentType.INSURANCE,
      ],
      CLIENT: [DocumentType.ID_CARD],
      MERCHANT: [
        DocumentType.ID_CARD,
        DocumentType.BUSINESS_REGISTRATION,
        DocumentType.PROOF_OF_ADDRESS,
      ],
      PROVIDER: [
        DocumentType.ID_CARD,
        DocumentType.PROFESSIONAL_CERTIFICATION,
        DocumentType.PROOF_OF_ADDRESS,
      ],
    };

    return roleDocumentMap[role] || [];
  }

  /**
   * Check if a user has all required documents uploaded
   * @param userId - User ID
   * @param userRole - User role
   * @returns Promise resolving to boolean indicating if all documents are uploaded
   */
  async areAllRequiredDocumentsUploaded(userId: string, userRole: UserRole): Promise<boolean> {
    const requiredTypes = this.getRequiredDocumentsByRole(userRole);
    const userDocuments = await this.documentService.getUserDocuments(userId);

    return requiredTypes.every(type => userDocuments.some(doc => doc.type === type));
  }

  /**
   * Check if a user has all required documents verified (approved)
   * @param userId - User ID
   * @param userRole - User role
   * @returns Promise resolving to boolean indicating if all documents are verified
   */
  async areAllRequiredDocumentsVerified(userId: string, userRole: UserRole): Promise<boolean> {
    const requiredTypes = this.getRequiredDocumentsByRole(userRole);
    const userDocuments = await this.documentService.getUserDocuments(userId);

    return requiredTypes.every(type =>
      userDocuments.some(doc => doc.type === type && doc.status === DocumentStatus.APPROVED)
    );
  }

  /**
   * Get document status for a specific user
   * @param userId - User ID
   * @returns Object containing document status information
   */
  async getUserDocumentStatus(userId: string): Promise<UserDocumentStatus> {
    try {
      // Get user information including role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Get required document types for the user's role
      const requiredDocumentTypes = this.getRequiredDocumentsByRole(user.role as UserRole);

      // Get all user's documents
      const userDocuments = await this.documentService.getUserDocuments(userId);

      // Calculate document status
      const pendingDocuments: string[] = [];
      const approvedDocuments: string[] = [];
      const rejectedDocuments: string[] = [];

      // Track which required documents are uploaded with any status
      const uploadedDocumentTypes = new Set(userDocuments.map(doc => doc.type));

      // Categorize documents by status
      userDocuments.forEach(doc => {
        const typeName = this.getDocumentTypeName(doc.type as DocumentType);

        if (doc.status === DocumentStatus.PENDING) {
          pendingDocuments.push(typeName);
        } else if (doc.status === DocumentStatus.APPROVED) {
          approvedDocuments.push(typeName);
        } else if (doc.status === DocumentStatus.REJECTED) {
          rejectedDocuments.push(typeName);
        }
      });

      // Add missing required documents to pending list
      requiredDocumentTypes.forEach(type => {
        if (!uploadedDocumentTypes.has(type)) {
          pendingDocuments.push(this.getDocumentTypeName(type));
        }
      });

      // Determine if all required documents are uploaded and approved
      const hasAllRequiredDocuments = requiredDocumentTypes.every(type =>
        userDocuments.some(doc => doc.type === type && doc.status === DocumentStatus.APPROVED)
      );

      return {
        hasAllRequiredDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,
      };
    } catch (error) {
      console.error('Error getting user document status:', error);
      throw error;
    }
  }

  /**
   * Update user verification status based on document approvals
   * @param userId - User ID
   * @param userRole - User role
   */
  async updateUserVerificationStatus(userId: string, userRole: string): Promise<void> {
    try {
      const isVerified = await this.areAllRequiredDocumentsVerified(userId, userRole as UserRole);

      // Update user status based on document verification
      if (isVerified) {
        // Set the user to active if all documents are verified
        await this.prisma.user.update({
          where: { id: userId },
          data: { status: UserStatus.ACTIVE },
        });

        // Update the verification status through verification service
        await this.verificationService.updateUserVerificationStatus(userId, true);
      }
    } catch (error) {
      console.error('Error updating user verification status:', error);
      throw error;
    }
  }

  /**
   * Process a document verification (approve/reject)
   * @param documentId - Document ID
   * @param status - New document status
   * @param verifierId - ID of the verifier (admin)
   * @param rejectionReason - Optional reason for rejection
   * @returns The updated document
   */
  async processDocumentVerification(
    documentId: string,
    status: DocumentStatus,
    verifierId: string,
    rejectionReason?: string
  ): Promise<Document> {
    try {
      // Update the document status
      const document = await this.documentService.updateDocumentStatus(
        documentId,
        status,
        verifierId,
        rejectionReason
      );

      // Update user verification status automatically
      if (document.userId && document.userRole) {
        await this.updateUserVerificationStatus(document.userId, document.userRole);
      }

      return document;
    } catch (error) {
      console.error('Error processing document verification:', error);
      throw error;
    }
  }

  /**
   * Helper method to get a human-readable document type name
   * @param type - Document type
   * @returns Human-readable document type name
   */
  private getDocumentTypeName(type: DocumentType): string {
    const typeNameMap: Record<DocumentType, string> = {
      [DocumentType.ID_CARD]: 'ID Card',
      [DocumentType.DRIVER_LICENSE]: 'Driver License',
      [DocumentType.VEHICLE_REGISTRATION]: 'Vehicle Registration',
      [DocumentType.INSURANCE]: 'Insurance',
      [DocumentType.CRIMINAL_RECORD]: 'Criminal Record',
      [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Professional Certification',
      [DocumentType.BUSINESS_REGISTRATION]: 'Business Registration',
      [DocumentType.PROOF_OF_ADDRESS]: 'Proof of Address',
      [DocumentType.SELFIE]: 'Selfie',
      [DocumentType.OTHER]: 'Other Document',
    };

    return typeNameMap[type] || 'Unknown Document Type';
  }
}

// Export a singleton instance for use in routers
export const documentVerificationService = new DocumentVerificationService();
