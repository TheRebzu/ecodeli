/**
 * Shared types for document and verification system
 * This file centralizes all shared types to avoid duplication and inconsistencies
 */
import { UserRole } from "@prisma/client";

/**
 * Document status enum
 */
export enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/**
 * Document types enum
 */
export enum DocumentType {
  ID_CARD = "ID_CARD",
  DRIVER_LICENSE = "DRIVER_LICENSE",
  VEHICLE_REGISTRATION = "VEHICLE_REGISTRATION",
  INSURANCE = "INSURANCE",
  CRIMINAL_RECORD = "CRIMINAL_RECORD",
  PROFESSIONAL_CERTIFICATION = "PROFESSIONAL_CERTIFICATION",
  BUSINESS_REGISTRATION = "BUSINESS_REGISTRATION",
  PROOF_OF_ADDRESS = "PROOF_OF_ADDRESS",
  SELFIE = "SELFIE",
  OTHER = "OTHER",
}

/**
 * Document interface
 */
export interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName?: string;
  mimeType: string;
  size: number;
  path: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: Date;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
  // User information when included
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

/**
 * Document creation input
 */
export interface DocumentCreateInput {
  userId: string;
  userRole: UserRole;
  type: DocumentType;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  notes?: string;
  expiryDate?: Date;
}

/**
 * Document update input
 */
export interface DocumentUpdateInput {
  documentId: string;
  type?: DocumentType;
  notes?: string;
  expiryDate?: Date;
}

/**
 * Document verification status enum
 */
export enum VerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  NOT_SUBMITTED = "NOT_SUBMITTED",
}

/**
 * Document verification update input
 */
export interface DocumentVerificationInput {
  documentId: string;
  status: DocumentStatus;
  verifierId: string;
  rejectionReason?: string;
}

/**
 * User document status
 */
export interface UserDocumentStatus {
  hasAllRequiredDocuments: boolean;
  pendingDocuments: string[];
  approvedDocuments: string[];
  rejectedDocuments: string[];
}

/**
 * Interface defining the relationship between document and verification services
 */
export interface DocumentVerificationRelationship {
  getUserDocumentStatus(userId: string): Promise<UserDocumentStatus>;
  updateUserVerificationStatus(userId: string, userRole: string): Promise<void>;
}

/**
 * File upload result
 */
export interface UploadFileResult {
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}
