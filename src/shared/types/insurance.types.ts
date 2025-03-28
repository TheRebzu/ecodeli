import { InsuranceType, InsuranceStatus, ClaimStatus } from "@/lib/validations/insurance";
import { User } from "./user.types";
import { Delivery } from "./delivery.types";

export interface Insurance {
  id: string;
  userId: string;
  packageId?: string;
  deliveryId?: string;
  type: InsuranceType;
  coverageAmount: number;
  premium: number;
  startDate: Date;
  endDate: Date;
  status: InsuranceStatus;
  paymentMethodId?: string;
  itemDescription: string;
  itemValue: number;
  policyNumber: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  delivery?: Delivery;
  claims?: InsuranceClaim[];
}

export interface InsuranceClaim {
  id: string;
  insuranceId: string;
  userId: string;
  description: string;
  claimAmount: number;
  status: ClaimStatus;
  incidentDate: Date;
  contactPhone: string;
  hasDocumentation: boolean;
  documentUrls?: string[];
  processingNotes?: string;
  reviewerId?: string;
  reviewDate?: Date;
  approvedAmount?: number;
  rejectionReason?: string;
  paymentDate?: Date;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  insurance?: Insurance;
}

export interface InsurancePlan {
  id: string;
  name: string;
  description: string;
  type: InsuranceType;
  basePrice: number;
  minCoverageAmount: number;
  maxCoverageAmount: number;
  coverageRatePercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceRequest {
  packageId?: string;
  deliveryId?: string;
  type: InsuranceType;
  coverageAmount: number;
  startDate: Date;
  endDate: Date;
  paymentMethodId?: string;
  itemDescription: string;
  itemValue: number;
}

export interface InsuranceResponse {
  insurance: Insurance;
  policyNumber: string;
  premium: number;
}

export interface InsuranceUpdateRequest {
  id: string;
  type?: InsuranceType;
  coverageAmount?: number;
  status?: InsuranceStatus;
  endDate?: Date;
  itemDescription?: string;
  itemValue?: number;
}

export interface InsuranceClaimRequest {
  insuranceId: string;
  description: string;
  claimAmount: number;
  incidentDate: Date;
  contactPhone: string;
  hasDocumentation: boolean;
  documentUrls?: string[];
}

export interface InsuranceClaimResponse {
  claim: InsuranceClaim;
  estimatedProcessingTime: string;
  nextSteps: string[];
}

export interface InsuranceQuoteRequest {
  packageId?: string;
  deliveryId?: string;
  type: InsuranceType;
  coverageAmount: number;
  itemDescription: string;
  itemValue: number;
  duration: number; // in days
}

export interface InsuranceQuoteResponse {
  premium: number;
  coverageAmount: number;
  startDate: Date;
  endDate: Date;
  type: InsuranceType;
  policySummary: string;
  coverageDetails: string[];
} 