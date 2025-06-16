export enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"}

export enum DocumentType {
  ID_CARD = "ID_CARD",
  DRIVER_LICENSE = "DRIVER_LICENSE",
  VEHICLE_REGISTRATION = "VEHICLE_REGISTRATION",
  INSURANCE = "INSURANCE",
  CRIMINAL_RECORD = "CRIMINAL_RECORD",
  PROFESSIONAL_CERTIFICATION = "PROFESSIONAL_CERTIFICATION",
  SELFIE = "SELFIE",
  OTHER = "OTHER"}

export interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}
